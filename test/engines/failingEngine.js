// Stands in for an engine that spawns but dies before it can speak GTP — a
// missing shared library, or KataGo invoked without its `gtp` subcommand, as in
// SabakiHQ/Sabaki#1083.

process.stderr.write('failingEngine: simulated startup failure\n')
process.exit(3)
