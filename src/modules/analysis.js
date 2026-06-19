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
//
// `winrateFormat` (optional) is the known winrate dialect: 'float' for
// kata-analyze (a probability in [0,1]) or 'integer' for the Leela-Zero dialect
// (ten-thousandths). When omitted, the format is inferred from the presence of a
// decimal point — correct for all real output except an integer-valued kata
// float (e.g. a forced-win `winrate 1`), so pass the dialect when it is known.

export function parseAnalysis(line, board, winrateFormat) {
  return (
    line
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
      // Skip malformed segments instead of dereferencing absent fields: a real
      // engine always emits `move` and `winrate`, but a partial/truncated flush
      // must not throw and discard every variation on the line.
      .filter(
        ({move, winrate}) =>
          move != null && winrate != null && /^[A-Za-z]\d+$/.test(move),
      )
      .map(({move, visits, winrate, scoreLead, pv}) => ({
        vertex: board.parseVertex(move),
        visits: +visits,
        winrate: normalizeWinrate(winrate, winrateFormat),
        scoreLead: scoreLead != null ? +scoreLead : null,
        moves: pv.map((x) => board.parseVertex(x)),
      }))
  )
}

// KataGo's kata-analyze reports winrate as a float in [0,1]; the Leela-Zero
// dialect reports an integer in ten-thousandths. Normalize either to a
// percentage in [0,100], trusting the caller's known dialect and otherwise
// detecting a float by its decimal point.
function normalizeWinrate(winrate, format) {
  let isFloat = format == null ? winrate.includes('.') : format === 'float'
  return isFloat ? +winrate * 100 : +winrate / 100
}

// Builds one heatmap cell (board overlay strength + label) for a variation.
//
// `analysis` is the position-level summary (the best move's winrate/scoreLead,
// per enginesyncer.js), used as the reference point when `analysisValueType`
// is 'change' — so the best move's cell reads as 0 and every other variation
// reads as its cost relative to the best move, rather than an absolute value.
export function getAnalysisHeatMapCell(
  {visits, winrate, scoreLead},
  analysis,
  maxVisitsWin,
  {analysisType, analysisValueType},
  formatNumber,
) {
  // Strength (the overlay color intensity) always reflects the move's
  // absolute quality, regardless of how its label is displayed.
  let strength = Math.round((visits * winrate * 8) / maxVisitsWin) + 1

  if (winrate !== null && analysisValueType === 'change') {
    winrate -= analysis.winrate
  }
  winrate = strength <= 3 ? Math.floor(winrate) : Math.floor(winrate * 10) / 10
  if (winrate === 0) winrate = 0 // Avoid -0

  if (scoreLead !== null && analysisValueType === 'change') {
    scoreLead -= analysis.scoreLead
  }
  scoreLead = scoreLead == null ? null : Math.round(scoreLead * 10) / 10
  if (scoreLead === 0) scoreLead = 0 // Avoid -0

  return {
    strength,
    text:
      visits < 10
        ? ''
        : [
            analysisType === 'winrate'
              ? formatNumber(winrate) +
                (Math.floor(winrate) === winrate ? '%' : '')
              : analysisType === 'scoreLead' && scoreLead != null
                ? (scoreLead >= 0 ? '+' : '') + formatNumber(scoreLead)
                : '–',
            visits < 1000
              ? formatNumber(visits)
              : formatNumber(Math.round(visits / 100) / 10) + 'k',
          ].join('\n'),
  }
}
