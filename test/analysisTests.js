import assert from 'assert'
import {readFileSync, existsSync} from 'fs'
import {join} from 'path'
import {fromDimensions as newBoard} from '@sabaki/go-board'

import {parseAnalysis} from '../src/modules/analysis.js'

// These tests verify the GTP analysis parser (the SBKV / scoreLead extraction
// path) against GOLDEN TRANSCRIPTS  (real `info ...` lines recorded from real
// engines by scripts/engine-transcripts/capture.mjs). The fixtures are replayed
// here so we test the exact output dialects engines emit, deterministically and
// without an engine at test time.
//
// Regenerate the fixtures with `npm run gen:engine-transcripts` after adding an engine
// version or SGF to scripts/engine-transcripts/engines.config.mjs.

const RES = join(__dirname, 'resources', 'engine-transcripts')
const manifestPath = join(RES, 'manifest.json')

// The last `info` line of a transcript is the most-settled analysis update —
// the one whose values ultimately get written to the node as SBKV/SBKS.
function lastInfoLine(file) {
  let lines = readFileSync(join(RES, file), 'utf8')
    .split('\n')
    .filter((l) => l.startsWith('info '))
  return lines[lines.length - 1]
}

if (!existsSync(manifestPath)) {
  describe('parseAnalysis (golden engine transcripts)', () => {
    it('requires generated transcripts — run `npm run gen:engine-transcripts`', () => {
      assert.fail(`missing ${manifestPath}`)
    })
  })
} else {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))

  describe('parseAnalysis (golden engine transcripts)', () => {
    it('has at least one captured transcript', () => {
      assert(manifest.cells.length > 0, 'no transcript cells in manifest')
    })

    for (const cell of manifest.cells) {
      describe(`${cell.engineId} · ${cell.sgf} · ${cell.command}`, () => {
        const board = newBoard(cell.boardSize, cell.boardSize)
        const winrateFormat =
          cell.command === 'kata-analyze' ? 'float' : 'integer'
        // Parse inside before() (not at collection time) so a parser throw on a
        // bad fixture fails this block's tests, not the whole suite's collection.
        let variations
        before(() => {
          variations = parseAnalysis(
            lastInfoLine(cell.file),
            board,
            winrateFormat,
          )
        })

        it('parses at least one variation', () => {
          assert(Array.isArray(variations) && variations.length > 0)
        })

        it('extracts winrate as a percentage in [0, 100] (the SBKV domain)', () => {
          for (const v of variations) {
            assert(
              typeof v.winrate === 'number' && Number.isFinite(v.winrate),
              `non-finite winrate: ${v.winrate}`,
            )
            assert(
              v.winrate >= 0 && v.winrate <= 100,
              `winrate out of range: ${v.winrate}`,
            )
          }
        })

        it('extracts visits as non-negative integers', () => {
          // Engines legitimately report moves with `visits 0` (evaluated by
          // policy prior only, no playouts), as observed in real lz-analyze
          // output, so the invariant is non-negative, not strictly positive.
          for (const v of variations) {
            assert(
              Number.isInteger(v.visits) && v.visits >= 0,
              `bad visits: ${v.visits}`,
            )
          }
        })

        it('extracts a legal top-move vertex and a pv move list', () => {
          for (const v of variations) {
            assert(
              v.vertex == null ||
                (Array.isArray(v.vertex) && v.vertex.length === 2),
              `bad vertex: ${JSON.stringify(v.vertex)}`,
            )
            assert(Array.isArray(v.moves), 'pv moves should be an array')
          }
        })

        if (cell.command === 'kata-analyze') {
          it('extracts scoreLead as a finite number (KataGo dialect → SBKS)', () => {
            for (const v of variations) {
              assert(
                typeof v.scoreLead === 'number' && Number.isFinite(v.scoreLead),
                `expected numeric scoreLead, got: ${v.scoreLead}`,
              )
            }
          })
        } else if (cell.command === 'lz-analyze') {
          it('reports scoreLead as null (Leela-Zero dialect has no score)', () => {
            for (const v of variations) {
              assert.strictEqual(
                v.scoreLead,
                null,
                `expected null scoreLead, got: ${v.scoreLead}`,
              )
            }
          })
        }
      })
    }
  })
}

// Focused unit cases for the parser's own normalization logic. These use minimal
// hand-written lines (not engine-format assumptions) to pin specific branches
// that a captured snapshot may not deterministically contain.
describe('parseAnalysis (parser logic)', () => {
  const board = newBoard(19, 19)

  it('returns [] when the line carries no info segments', () => {
    assert.deepStrictEqual(parseAnalysis('= ', board), [])
  })

  it('normalizes integer (Leela-Zero) winrate ten-thousandths to a percentage', () => {
    let [v] = parseAnalysis(
      'info move Q16 visits 10 winrate 5213 pv Q16 D4',
      board,
    )
    assert(Math.abs(v.winrate - 52.13) < 1e-9, `got ${v.winrate}`)
    assert.strictEqual(v.scoreLead, null)
  })

  it('normalizes float (KataGo) winrate and reads scoreLead', () => {
    let [v] = parseAnalysis(
      'info move Q16 visits 10 winrate 0.5213 scoreLead 1.5 pv Q16 D4',
      board,
    )
    assert(Math.abs(v.winrate - 52.13) < 1e-9, `got ${v.winrate}`)
    assert(Math.abs(v.scoreLead - 1.5) < 1e-9, `got ${v.scoreLead}`)
  })

  it('parses multiple variations from one line', () => {
    let vs = parseAnalysis(
      'info move Q16 visits 20 winrate 0.55 scoreLead 2 pv Q16 D4 ' +
        'info move D4 visits 10 winrate 0.45 scoreLead -1 pv D4 Q16',
      board,
    )
    assert.strictEqual(vs.length, 2)
    assert(Math.abs(vs[0].winrate - 55) < 1e-9)
    assert(Math.abs(vs[1].scoreLead - -1) < 1e-9)
  })

  it('truncates the principal variation at a pass', () => {
    let [v] = parseAnalysis(
      'info move Q16 visits 10 winrate 0.5 pv Q16 pass D4',
      board,
    )
    assert.strictEqual(v.moves.length, 1)
  })

  it('keeps a move reported with visits 0 (policy-prior only, no playouts)', () => {
    let [v] = parseAnalysis('info move Q16 visits 0 winrate 0.5 pv Q16', board)
    assert.strictEqual(v.visits, 0)
  })

  it('uses the known float dialect to normalize an integer-valued winrate', () => {
    // KataGo can print a float winrate without a decimal point (e.g. a forced
    // win as `winrate 1`). The decimal-point heuristic misreads it as 0.01%;
    // passing the known dialect normalizes it correctly to 100%.
    let line = 'info move Q16 visits 10 winrate 1 pv Q16'
    let [heuristic] = parseAnalysis(line, board)
    assert(
      Math.abs(heuristic.winrate - 0.01) < 1e-9,
      `got ${heuristic.winrate}`,
    )
    let [float] = parseAnalysis(line, board, 'float')
    assert(Math.abs(float.winrate - 100) < 1e-9, `got ${float.winrate}`)
  })

  it('uses the known integer dialect to normalize ten-thousandths', () => {
    let [v] = parseAnalysis(
      'info move Q16 visits 10 winrate 9998 pv Q16',
      board,
      'integer',
    )
    assert(Math.abs(v.winrate - 99.98) < 1e-9, `got ${v.winrate}`)
  })

  it('skips an info segment missing its move field instead of throwing', () => {
    let vs = parseAnalysis(
      'info move Q16 visits 10 winrate 0.5 pv Q16 ' +
        'info visits 5 winrate 0.4 pv D4',
      board,
    )
    assert.strictEqual(vs.length, 1)
    assert.deepStrictEqual(vs[0].vertex, board.parseVertex('Q16'))
  })

  it('skips an info segment missing its winrate field instead of throwing', () => {
    assert.deepStrictEqual(
      parseAnalysis('info move Q16 visits 10 pv Q16', board),
      [],
    )
  })
})
