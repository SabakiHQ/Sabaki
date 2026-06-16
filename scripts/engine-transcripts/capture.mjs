#!/usr/bin/env node
//
// Golden engine-transcript capture tool.
//
// Drives real Go engines (KataGo, Leela Zero) over GTP and records their raw
// `info ...` analysis lines as fixtures under
// test/resources/engine-transcripts/<engine-id>/. Those fixtures are the
// "golden transcripts" the engine-integration test suite replays, so that the
// parsing tests (test/analysisTests.js) and the e2e replay engine exercise the
// EXACT bytes real engines emit, deterministically, without an engine at test
// time.
//
// This is a MAINTAINER tool. It is intentionally NOT wired into `npm test` or
// CI: it needs engine binaries + neural-net weights and is slow. Re-run it by
// hand (`npm run gen:engine-transcripts`) when adding an engine version or SGF,
// then commit the refreshed fixtures.
//
// See ./README.md for the full workflow and the engine matrix.

import {spawn} from 'node:child_process'
import {execFileSync} from 'node:child_process'
import {createInterface} from 'node:readline'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  createWriteStream,
} from 'node:fs'
import {dirname, join, basename, extname} from 'node:path'
import {fileURLToPath} from 'node:url'

import {engines, sgfs, capture} from './engines.config.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = join(HERE, '..', '..')
const SGF_DIR = join(REPO, 'test', 'resources', 'engine-transcripts', 'sgf')
const OUT_DIR = join(REPO, 'test', 'resources', 'engine-transcripts')
const CACHE = join(REPO, '.engine-cache')
const NET_DIR = join(CACHE, 'nets')

const GTP_COLS = 'ABCDEFGHJKLMNOPQRSTUVWXYZ' // GTP skips 'I'

// --- tiny SGF main-line reader --------------------------------------------
// Good enough for the small, well-formed fixtures in sgf/: pulls board size,
// komi, and the main-line moves. Not a general SGF parser.
function parseSgf(text) {
  let size = +(text.match(/\bSZ\[(\d+)\]/) || [])[1] || 19
  let komi = (text.match(/\bKM\[([0-9.+-]+)\]/) || [])[1] || '7.5'
  let moves = [...text.matchAll(/;\s*([BW])\[([a-z]{0,2})\]/g)].map((m) => ({
    color: m[1],
    coord: m[2],
  }))
  return {size, komi, moves}
}

function sgfToGtpVertex(coord, size) {
  if (coord === '') return 'pass'
  let col = coord.charCodeAt(0) - 97
  let row = coord.charCodeAt(1) - 97
  return `${GTP_COLS[col]}${size - row}`
}

// --- engine provisioning ---------------------------------------------------
async function ensureNet(net) {
  mkdirSync(NET_DIR, {recursive: true})
  let dest = join(NET_DIR, net.file)
  if (existsSync(dest)) return dest

  console.log(`  ↓ downloading net ${net.file} …`)
  let res = await fetch(net.url)
  if (!res.ok) throw new Error(`net download failed: HTTP ${res.status}`)
  let buf = Buffer.from(await res.arrayBuffer())
  writeFileSync(dest, buf)
  console.log(`    saved ${(buf.length / 1048576).toFixed(1)} MB`)
  return dest
}

function findKataGoConfig(engine) {
  if (engine.config) return engine.config
  try {
    let prefix = execFileSync('brew', ['--prefix', 'katago'], {
      encoding: 'utf8',
    }).trim()
    let cfg = join(prefix, 'share', 'katago', 'configs', 'gtp_example.cfg')
    if (existsSync(cfg)) return cfg
  } catch {}
  throw new Error(
    'could not locate a KataGo gtp config; set `config` in the engine entry',
  )
}

async function launchArgs(engine) {
  if (engine.kind === 'katago') {
    let net = await ensureNet(engine.net)
    let cfg = findKataGoConfig(engine)
    let args = ['gtp', '-model', net, '-config', cfg]
    if (engine.overrides) args.push('-override-config', engine.overrides)
    return {bin: engine.bin, args, net: basename(net)}
  }
  if (engine.kind === 'leelaz') {
    let net = await ensureNet(engine.net)
    let args = ['--gtp', '-w', net, ...(engine.args || [])]
    return {bin: engine.bin, args, net: basename(net)}
  }
  throw new Error(`unknown engine kind: ${engine.kind}`)
}

// --- GTP driver ------------------------------------------------------------
// Sends setup + one analyze command, collects `info` lines, then stops. Keys
// off the FIRST info line (engine is up and analysing) rather than a fixed
// startup delay, so it is robust to slow first-run shader compilation etc.
function captureCell(launch, {setup, color, command, interval}, opts) {
  return new Promise((resolve, reject) => {
    let child = spawn(launch.bin, launch.args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    let infoLines = []
    let stderr = ''
    let settleTimer = null
    let maxTimer = null
    let settled = false
    let done = false

    let finish = (err) => {
      if (done) return
      done = true
      clearTimeout(settleTimer)
      clearTimeout(maxTimer)
      try {
        child.stdin.end()
      } catch {}
      try {
        child.kill('SIGKILL')
      } catch {}
      if (err) reject(err)
      else resolve({infoLines, stderr})
    }

    let stopAndQuit = () => {
      try {
        child.stdin.write('stop\nquit\n')
      } catch {}
    }

    createInterface({input: child.stdout}).on('line', (line) => {
      if (line.startsWith('info ')) {
        infoLines.push(line)
        if (!settled) {
          settled = true
          // collect a couple of updates, then stop cleanly
          settleTimer = setTimeout(stopAndQuit, opts.settleMs)
        }
      }
    })
    child.stderr.on('data', (d) => (stderr += d))
    child.on('error', finish)
    child.on('close', () =>
      finish(
        infoLines.length ? null : new Error('engine produced no analysis'),
      ),
    )

    maxTimer = setTimeout(
      () =>
        finish(
          infoLines.length ? null : new Error('timeout: no `info` output'),
        ),
      opts.maxMs,
    )

    let cmds = [...setup, `${command} ${color} ${interval}`]
    child.stdin.write(cmds.join('\n') + '\n')
  })
}

function buildSetup(sgf) {
  let setup = [`boardsize ${sgf.size}`, `komi ${sgf.komi}`, 'clear_board']
  for (let {color, coord} of sgf.moves) {
    setup.push(`play ${color} ${sgfToGtpVertex(coord, sgf.size)}`)
  }
  let last = sgf.moves[sgf.moves.length - 1]
  let color = last == null ? 'B' : last.color === 'B' ? 'W' : 'B'
  return {setup, color}
}

// --- main ------------------------------------------------------------------
async function main() {
  mkdirSync(OUT_DIR, {recursive: true})
  let manifest = {
    generatedAt: new Date().toISOString(),
    note: 'Generated by scripts/engine-transcripts/capture.mjs — do not edit by hand.',
    cells: [],
  }

  for (let engine of engines) {
    console.log(`\n=== ${engine.id} (${engine.kind} ${engine.version}) ===`)
    let launch
    try {
      launch = await launchArgs(engine)
    } catch (err) {
      console.error(`  ✗ skipping ${engine.id}: ${err.message}`)
      continue
    }
    let engineOut = join(OUT_DIR, engine.id)
    mkdirSync(engineOut, {recursive: true})

    for (let sgfName of sgfs) {
      let sgf = parseSgf(readFileSync(join(SGF_DIR, sgfName), 'utf8'))
      let {setup, color} = buildSetup(sgf)

      for (let command of engine.analyzeCommands) {
        let label = `${sgfName} · ${command}`
        process.stdout.write(`  • ${label} … `)
        try {
          let {infoLines} = await captureCell(
            launch,
            {setup, color, command, interval: capture.interval},
            capture,
          )
          let outFile = join(
            engineOut,
            `${basename(sgfName, extname(sgfName))}.${command}.txt`,
          )
          writeFileSync(outFile, infoLines.join('\n') + '\n')
          console.log(`${infoLines.length} info line(s)`)
          manifest.cells.push({
            engineId: engine.id,
            kind: engine.kind,
            version: engine.version,
            net: launch.net,
            command,
            sgf: sgfName,
            boardSize: sgf.size,
            color,
            interval: capture.interval,
            infoLineCount: infoLines.length,
            file: `${engine.id}/${basename(sgfName, extname(sgfName))}.${command}.txt`,
          })
        } catch (err) {
          console.log(`✗ ${err.message}`)
        }
      }
    }
  }

  writeFileSync(
    join(OUT_DIR, 'manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  )
  console.log(
    `\nWrote ${manifest.cells.length} transcript(s) and manifest.json`,
  )
  if (manifest.cells.length === 0) process.exitCode = 1
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
