// Pure utility functions with no Electron/Node-specific dependencies
// Safe to import in test environments

let id = 0

export function noop() {}

export function getId() {
  return ++id
}

export function hash(str) {
  let chr
  let hash = 0
  if (str.length == 0) return hash

  for (let i = 0; i < str.length; i++) {
    chr = str.charCodeAt(i)
    hash = (hash << 5) - hash + chr
    hash = hash & hash
  }

  return hash
}

export function equals(a, b) {
  if (a === b) return true
  if (a == null || b == null) return a == b

  let t = Object.prototype.toString.call(a)
  if (t !== Object.prototype.toString.call(b)) return false

  let aa = t === '[object Array]'
  let ao = t === '[object Object]'

  if (aa) {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) if (!equals(a[i], b[i])) return false
    return true
  } else if (ao) {
    let kk = Object.keys(a)
    if (kk.length !== Object.keys(b).length) return false
    for (let i = 0; i < kk.length; i++) {
      let k = kk[i]
      if (!(k in b)) return false
      if (!equals(a[k], b[k])) return false
    }
    return true
  }

  return false
}

export function shallowEquals(a, b) {
  return a == null || b == null
    ? a === b
    : a === b || (a.length === b.length && a.every((x, i) => x == b[i]))
}

export function vertexEquals([a, b], [c, d]) {
  return a === c && b === d
}

export function lexicalCompare(a, b) {
  if (!a.length || !b.length) return a.length - b.length
  return a[0] < b[0]
    ? -1
    : a[0] > b[0]
      ? 1
      : lexicalCompare(a.slice(1), b.slice(1))
}

export function typographer(input) {
  return input
    .replace(/\.{3}/g, '\u2026')
    .replace(/(\S)'/g, '$1\u2019')
    .replace(/(\S)"/g, '$1\u201d')
    .replace(/'(\S)/g, '\u2018$1')
    .replace(/"(\S)/g, '\u201c$1')
    .replace(/(\s)-(\s)/g, '$1\u2013$2')
}

export function normalizeEndings(input) {
  return input.replace(/\r/g, '')
}

export function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function getScore(board, areaMap, {komi = 0, handicap = 0} = {}) {
  let score = {
    area: [0, 0],
    territory: [0, 0],
    captures: [1, -1].map((sign) => board.getCaptures(sign)),
  }

  for (let x = 0; x < board.width; x++) {
    for (let y = 0; y < board.height; y++) {
      let z = areaMap[y][x]
      let index = z > 0 ? 0 : 1

      score.area[index] += Math.abs(Math.sign(z))
      if (board.get([x, y]) === 0)
        score.territory[index] += Math.abs(Math.sign(z))
    }
  }

  score.area = score.area.map(Math.round)
  score.territory = score.territory.map(Math.round)

  score.areaScore = score.area[0] - score.area[1] - komi - handicap
  score.territoryScore =
    score.territory[0] -
    score.territory[1] +
    score.captures[0] -
    score.captures[1] -
    komi

  return score
}

// Advance an area-map value -- -1 (white) / 0 (neutral) / 1 (black) -- by
// `steps` positions through the neutral -> black -> white cycle. Backs the
// manual territory overrides in scoring/estimator mode, where each overridden
// point stores how many steps it's been nudged from the estimate (1 or 2).
export function cycleAreaValue(value, steps) {
  return ((value + 1 + steps) % 3) - 1
}

// The file to open that was passed on the command line at launch, or null.
// `argv[0]` is the binary; everything that isn't a file to open is filtered out:
// flags (any leading '-', so Chromium's '--no-sandbox' and macOS's '-psn_...'
// both go), the dev-mode entry '.', and the packaged-app entry ('*.asar'). Some
// Linux launchers (snap, AppImage '.desktop' files) inject flags and ship a
// renamed binary, so a binary-name or argv-position heuristic isn't reliable --
// filter by content instead. Returns the first surviving argument. See #954.
export function getOpenFileFromArgv(argv) {
  let files = argv
    .slice(1)
    .filter(
      (arg) =>
        !arg.startsWith('-') &&
        arg !== '.' &&
        !arg.endsWith('.asar') &&
        !arg.endsWith('.asar/'),
    )

  return files.length > 0 ? files[0] : null
}
