const {Engine} = require('@sabaki/gtp')

let engine = new Engine('Resign Engine', '1.0')
let alpha = 'ABCDEFGHJKLMNOPQRST'
let resign = 3

for (let commandName of ['boardsize', 'clear_board', 'komi', 'play', 'undo']) {
  engine.command(commandName, '')
}

engine.command('genmove', (_, out) => {
  if (resign === 0) {
    out.send('resign')
  } else {
    let rand = () => Math.floor(Math.random() * alpha.length)
    resign--

    out.send(`${alpha[rand()]}${rand() + 1}`)
  }
})

engine.start()
