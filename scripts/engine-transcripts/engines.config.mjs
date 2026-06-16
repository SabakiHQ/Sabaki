// Engine version matrix + SGF matrix for golden-transcript capture.
//
// This drives `capture.mjs` (run via `npm run gen:engine-transcripts`). It is a
// maintainer tool and is NOT part of `npm test` or CI.
//
// To extend coverage:
//   - add an engine build to `engines` (a new version, or a different engine),
//   - and/or drop a new SGF into test/resources/engine-transcripts/sgf and list
//     it in `sgfs`,
// then re-run the capture and commit the refreshed fixtures + manifest.
//
// Each engine entry:
//   id              fixture sub-directory name, e.g. 'katago-1.16.4'
//   kind            'katago' | 'leelaz'
//   version         human-readable engine version (provenance only)
//   bin             engine binary (PATH-resolved or absolute)
//   net             { url, file } weights; downloaded into .engine-cache/nets
//                   if missing (small nets only — we test protocol, not strength)
//   analyzeCommands GTP analysis commands to capture; each yields one transcript.
//                   Capturing several variants documents every output dialect.
//   config          (katago, optional) path to a gtp config; auto-discovered via
//                   `brew --prefix katago` when omitted.
//   overrides       (katago, optional) extra `-override-config` k=v pairs to keep
//                   search shallow and fast.
//   args            (optional) extra binary args (e.g. leela-zero playout caps).

export const engines = [
  {
    id: 'katago-1.16.4',
    kind: 'katago',
    version: '1.16.4',
    bin: 'katago',
    net: {
      url: 'https://katagoarchive.org/g170/neuralnets/g170-b6c96-s175395328-d26788732.bin.gz',
      file: 'g170-b6c96.bin.gz',
    },
    // kata-analyze -> KataGo dialect (float winrate + scoreLead).
    // lz-analyze  -> Leela-Zero dialect (integer winrate, no scoreLead).
    analyzeCommands: ['kata-analyze', 'lz-analyze'],
    overrides: 'maxVisits=10,numSearchThreads=1',
  },

  // To add a real Leela Zero build (different binary, confirms KataGo's
  // lz-analyze emulation matches the genuine engine), provision the binary +
  // a small weights file and uncomment:
  //
  // {
  //   id: 'leela-zero-0.17',
  //   kind: 'leelaz',
  //   version: '0.17',
  //   bin: 'leelaz',
  //   net: {url: '<small LZ weights .gz url>', file: 'lz-small.txt.gz'},
  //   analyzeCommands: ['lz-analyze'],
  //   args: ['-p', '16', '--noponder'],
  // },
]

// SGF positions to analyse, relative to test/resources/engine-transcripts/sgf.
// Kept small (few moves, mixed board sizes) so capture is fast.
export const sgfs = ['empty-19.sgf', 'opening-19.sgf', 'corner-9.sgf']

// Capture tuning. interval is GTP analysis report interval in centiseconds.
export const capture = {
  interval: 20,
  settleMs: 1500,
  maxMs: 60000,
}
