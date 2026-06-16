// Parsing of GTP analysis output into structured variation data.
//
// Analysis-capable engines (KataGo via `kata-analyze`, Leela Zero and KataGo's
// LZ-compatible mode via `lz-analyze`) stream lines of the form:
//
//   info move Q16 visits 8 winrate 0.5213 scoreLead 0.7 pv Q16 D4 ... info move D4 ...
//
// (Leela-Zero format omits `scoreLead` and reports `winrate` as an integer in
// ten-thousandths, e.g. `winrate 5213`.) This module turns one such line into an
// array of variations. It is deliberately free of Electron and app-state
// dependencies so it can be unit-tested directly against recorded engine
// transcripts; the only collaborator is a `@sabaki/go-board` board, used for its
// pure `parseVertex` coordinate helper.

export function parseAnalysis(line, board) {
  return line
    .split(/\s*info\s+/)
    .slice(1)
    .map((x) => x.trim())
    .map((x) => {
      let matchPV = x.match(/(pass|[A-Za-z]\d+)(\s+(pass|[A-Za-z]\d+))*$/)
      if (matchPV == null) return null

      let passIndex = matchPV[0].indexOf('pass')
      if (passIndex < 0) passIndex = Infinity

      return [
        x.slice(0, matchPV.index).trim().split(/\s+/).slice(0, -1),
        matchPV[0]
          .slice(0, passIndex)
          .split(/\s+/)
          .filter((x) => x.length >= 2),
      ]
    })
    .filter((x) => x != null)
    .map(([tokens, pv]) => {
      let keys = tokens.filter((_, i) => i % 2 === 0)
      let values = tokens.filter((_, i) => i % 2 === 1)

      keys.push('pv')
      values.push(pv)

      return keys.reduce((acc, x, i) => ((acc[x] = values[i]), acc), {})
    })
    .filter(({move}) => move.match(/^[A-Za-z]\d+$/))
    .map(({move, visits, winrate, scoreLead, pv}) => ({
      vertex: board.parseVertex(move),
      visits: +visits,
      winrate: winrate.includes('.') ? +winrate * 100 : +winrate / 100,
      scoreLead: scoreLead != null ? +scoreLead : null,
      moves: pv.map((x) => board.parseVertex(x)),
    }))
}
