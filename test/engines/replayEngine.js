// A fake GTP engine that REPLAYS a recorded analysis transcript.
//
// Used by the engine-analysis e2e test to drive Sabaki's real
// analyze → parseAnalysis → SBKV pipeline deterministically, using genuine
// engine `info ...` lines captured by scripts/engine-transcripts/capture.mjs —
// no live engine (or GPU) needed at test time.
//
// It speaks GTP directly (rather than via @sabaki/gtp's Engine helper) because
// the analyze protocol streams `info` lines while `stop` must be handled
// concurrently — the helper processes commands strictly sequentially and would
// deadlock. Response framing matches what KataGo emits:
//   - normal command:  "= <content>\n\n"
//   - analyze command: "=\n" then streamed "info ...\n" lines, with the blank
//     line terminator withheld until the NEXT command arrives — mirroring how a
//     real engine stops analysis on any new input. (Sabaki aborts analysis with
//     `protocol_version` via EngineSyncer.sendAbort, NOT a GTP `stop`, so closing
//     only on `stop` would leave the response open and desync the controller.)
//
// Usage (args, parsed loosely):
//   node replayEngine.js --transcript <path> [--analyze-command kata-analyze]

const {createInterface} = require('readline')
const {readFileSync} = require('fs')

const args = process.argv.slice(2)
const opt = (name, fallback) => {
  let i = args.indexOf(name)
  return i >= 0 && i + 1 < args.length ? args[i + 1] : fallback
}

const transcriptPath = opt('--transcript')
const analyzeCommand = opt('--analyze-command', 'kata-analyze')

// Fail fast and loud on a missing/unreadable/empty transcript. Otherwise the
// engine would just stream nothing, surfacing only as an opaque e2e timeout
// (SBKV never written) with no hint at the real cause.
if (transcriptPath == null) {
  process.stderr.write('replayEngine: missing required --transcript <path>\n')
  process.exit(2)
}

let infoLines
try {
  infoLines = readFileSync(transcriptPath, 'utf8')
    .split('\n')
    .filter((l) => l.startsWith('info '))
} catch (e) {
  process.stderr.write(
    `replayEngine: cannot read transcript ${transcriptPath}: ${e.message}\n`,
  )
  process.exit(2)
}

if (infoLines.length === 0) {
  process.stderr.write(
    `replayEngine: transcript ${transcriptPath} contains no \`info \` lines\n`,
  )
  process.exit(2)
}

const baseCommands = [
  'protocol_version',
  'name',
  'version',
  'known_command',
  'list_commands',
  'quit',
  'boardsize',
  'clear_board',
  'komi',
  'play',
  'undo',
  'genmove',
  'stop',
]
const supported = [...new Set([...baseCommands, analyzeCommand])]

const out = (s) => process.stdout.write(s)
const ok = (content = '') => out(`= ${content}\n\n`)
const err = (msg) => out(`? ${msg}\n\n`)

let streamTimer = null
let streamIndex = 0
let streaming = false // whether an analyze response is currently open

function startStreaming() {
  // Open the analyze response. A real engine keeps it open, emitting `info`
  // updates, until any new input arrives (see stopStreaming). infoLines is
  // guaranteed non-empty (validated at startup).
  streaming = true
  out('=\n')

  // Emit one recorded update per tick, cycling, until the response is closed.
  let tick = () => {
    out(infoLines[streamIndex % infoLines.length] + '\n')
    streamIndex++
  }
  tick()
  streamTimer = setInterval(tick, 100)
}

function stopStreaming() {
  if (!streaming) return
  streaming = false
  if (streamTimer != null) {
    clearInterval(streamTimer)
    streamTimer = null
  }
  // Blank line terminates the still-open analyze response.
  out('\n')
}

createInterface({input: process.stdin}).on('line', (raw) => {
  let line = raw.replace(/#.*$/, '').trim()
  if (line === '') return

  // Strip an optional leading command id (GTP allows it; our controller omits).
  let parts = line.split(/\s+/)
  if (/^\d+$/.test(parts[0])) parts.shift()
  let [name, ...rest] = parts

  // A real engine stops an in-progress analysis the moment ANY new input
  // arrives, terminating the open analyze response before handling the command.
  // Doing this here keeps the GTP response framing in sync no matter how the
  // controller chooses to abort (Sabaki uses `protocol_version`, not `stop`).
  stopStreaming()

  if (name === analyzeCommand) {
    startStreaming()
    return
  }

  if (name === 'stop') {
    // Analysis (if any) was already closed above; just acknowledge.
    ok()
    return
  }

  switch (name) {
    case 'protocol_version':
      return ok('2')
    case 'name':
      return ok('Replay Engine')
    case 'version':
      return ok('1.0')
    case 'list_commands':
      return ok(supported.join('\n'))
    case 'known_command':
      return ok(supported.includes(rest[0]) ? 'true' : 'false')
    case 'genmove':
      return ok('pass')
    case 'quit':
      ok()
      return process.exit(0)
    default:
      // Be lenient about board-setup commands (boardsize, clear_board, komi,
      // play, undo, handicap, …) so position sync never fails.
      return ok()
  }
})
