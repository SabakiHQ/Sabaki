const {Engine} = require('@sabaki/gtp')

let engine = new Engine('Resign Engine', '1.0')
let alpha = 'ABCDEFGHJKLMNOPQRST'
let stop = 3
let stopword = process.argv[2] === '--pass' ? 'pass' : 'resign'

for (let commandName of ['boardsize', 'clear_board', 'komi', 'play', 'undo']) {
  engine.command(commandName, '')
}

engine.command('genmove', (_, out) => {
  if (stop === 0) {
    out.send(stopword)
  } else {
    let rand = () => Math.floor(Math.random() * alpha.length)
    stop--

    out.send(`${alpha[rand()]}${rand() + 1}`)
  }
})

engine.start()
