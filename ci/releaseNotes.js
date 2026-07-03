const {readFileSync} = require('fs')
const {join} = require('path')
const {version} = require('../package.json')

// Print the CHANGELOG.md section for the current package.json version, for
// use as the GitHub release body.

const changelog = readFileSync(join(__dirname, '..', 'CHANGELOG.md'), 'utf8')
const lines = changelog.split('\n')

const start = lines.findIndex((line) =>
  line.startsWith(`## [Sabaki v${version}]`),
)
if (start < 0) {
  console.error(`No CHANGELOG.md section found for v${version}`)
  process.exit(1)
}

let end = lines.findIndex((line, i) => i > start && line.startsWith('## '))
if (end < 0) end = lines.length

const body = lines
  .slice(start + 1, end)
  // Drop reference-style link definitions, e.g. `[v0.60.0]: https://...`
  .filter((line) => !/^\[[^\]]+\]:\s+\S+$/.test(line))

// GitHub's release renderer treats single newlines as hard breaks, so unwrap
// the ~80-column paragraphs: a line continues the previous one unless it is
// blank or starts a new block (heading, list item, quote, fence, table row).
const unwrapped = []
for (let line of body) {
  let trimmed = line.trim()
  let startsBlock = /^(#{1,6} |[-*+] |\d+\. |>|```|\|)/.test(trimmed)

  if (
    trimmed !== '' &&
    !startsBlock &&
    unwrapped.length > 0 &&
    unwrapped[unwrapped.length - 1].trim() !== ''
  ) {
    unwrapped[unwrapped.length - 1] += ' ' + trimmed
  } else {
    unwrapped.push(line)
  }
}

process.stdout.write(unwrapped.join('\n').trim() + '\n')
