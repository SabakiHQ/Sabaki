# Engine transcript capture & integration tests

This directory holds the tooling that records **golden transcripts**: real
`info ...` analysis lines emitted by real Go engines (KataGo, Leela Zero). The
engine-integration test suite replays those transcripts so we can verify
Sabaki's analysis pipeline against genuine engine output, deterministically and
without an engine (or GPU) at test time.

## Why

Engine analysis is one of Sabaki's core features, but the parsing of GTP
analysis output (`src/modules/analysis.js` → `parseAnalysis`, which feeds the
`SBKV` win-rate and `SBKS` score-lead properties) was previously untested. The
fake engine used by `e2e/engine.spec.js` only plays moves; it never produces
analysis. The thing most likely to silently break parsing is an upstream engine
changing its `info` line format, which only real output can catch.

The strategy is layered:

| Layer                | Where                                          | What it checks                                                                                          | Engine at test time?       |
| -------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------- |
| Parse correctness    | `test/analysisTests.js`                        | `parseAnalysis` against recorded real `info` lines (both KataGo and Leela-Zero dialects)                | No — replays transcripts   |
| Pipeline (e2e)       | `e2e/engine-analysis.spec.js`                  | attach → GTP analyze → `parseAnalysis` → `SBKV` written to the node, via `test/engines/replayEngine.js` | No — replays transcripts   |
| Real-engine contract | this script (`npm run gen:engine-transcripts`) | that real engines still emit what we parse                                                              | **Yes** — runs the engines |

Only the last layer needs engines installed, and it is intentionally **not part
of `npm test` or CI**, it is a manual capture step.

## Files

- `engines.config.mjs` - the engine version matrix and SGF matrix.
- `capture.mjs` - drives each engine over GTP across each SGF and writes
  transcripts to `test/resources/engine-transcripts/<engine-id>/`.
- `../../test/resources/engine-transcripts/` - committed golden transcripts +
  `manifest.json` (the fixtures the tests replay).
- `../../test/resources/engine-transcripts/sgf/` - the SGF positions analysed.
- `../../test/engines/replayEngine.js` - fake GTP engine that replays a
  transcript for the e2e test.

## Regenerating transcripts

```bash
npm run gen:engine-transcripts
```

Requires the engine binaries listed in `engines.config.mjs` on `PATH`. Small
neural nets are downloaded into `.engine-cache/` (gitignored) on first run. We
use tiny nets and shallow search because we are testing protocol integration,
not playing strength. Re-run after changing the matrix and commit the refreshed
`test/resources/engine-transcripts` tree.

## Extending coverage

- **New engine version / engine:** add an entry to `engines` in
  `engines.config.mjs` (binary, weights URL, analysis commands), then
  regenerate. On Linux/CI, KataGo also ships pure-CPU `eigen` builds suitable
  for a (separate, scheduled) real-engine job.
- **New position:** drop an SGF into `test/resources/engine-transcripts/sgf/`
  and list it in `sgfs`, then regenerate.
- **New analysis feature** (e.g. a new property like `SBKS`): the KataGo
  `kata-analyze` transcripts already include `scoreLead`; assert on it in
  `test/analysisTests.js` and, once the feature writes the property, in the e2e.

## Dialects captured today

From a single KataGo build we capture both output dialects:

- `kata-analyze` - KataGo dialect: float `winrate` (0–1) **with** `scoreLead`.
- `lz-analyze` - Leela-Zero-compatible dialect: integer `winrate`
  (ten-thousandths) and **no** `scoreLead`.

Together they exercise both win-rate normalization branches in `parseAnalysis`
and the score-present / score-absent paths. (A genuine Leela Zero build should
eventually be added to the matrix to confirm KataGo's `lz-analyze` emulation
matches the real engine.)
