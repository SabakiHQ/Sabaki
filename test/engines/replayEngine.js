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
//     line terminator withheld until `stop` arrives.
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

const infoLines = transcriptPath
  ? readFileSync(transcriptPath, 'utf8')
      .split('\n')
      .filter((l) => l.startsWith('info '))
  : []

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

function startStreaming() {
  if (infoLines.length === 0) {
    // No recorded lines: still open a valid (empty) analyze response.
    out('=\n')
    return
  }
  // Open the analyze response, then emit one recorded update per tick, cycling,
  // until `stop` closes it.
  out('=\n')
  let tick = () => {
    out(infoLines[streamIndex % infoLines.length] + '\n')
    streamIndex++
  }
  tick()
  streamTimer = setInterval(tick, 100)
}

function stopStreaming() {
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

  if (name === analyzeCommand) {
    startStreaming()
    return
  }

  if (name === 'stop') {
    if (streamTimer != null || infoLines.length > 0) stopStreaming()
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
