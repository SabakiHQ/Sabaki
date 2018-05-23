const assert = require('assert')
const helper = require('../src/modules/helper')
const fileformats = require('../src/modules/fileformats')
const gametree = require('../src/modules/gametree')
const gamesorter = require('../src/modules/gamesorter')

describe('gamesorter.sort', () => {
    let blank = fileformats.parseFile(`${__dirname}/sgf/blank_game.sgf`)[0]

    // BR = 30k WR = 10k, GN: Teaching Game, EV: Go Club, DT: 2018-05-22
    let beginner = fileformats.parseFile(`${__dirname}/sgf/beginner_game.sgf`)[0]

    // BR = 1k WR = 1d, GN: A Challenge, EV: Tournament
    let shodan = fileformats.parseFile(`${__dirname}/sgf/shodan_game.sgf`)[0]

    // BR = 1p WR = 1p, EV: 1st Kisei, DT: 1976-01-28
    let pro = fileformats.parseFile(`${__dirname}/sgf/pro_game.sgf`)[0]

    let gameTrees = [blank, pro, beginner, shodan]

    it ('when given a rank property - BR, WR', () => {
        assert.deepEqual(gamesorter.sort(gameTrees, 'BR'),
                         [blank, beginner, shodan, pro])
        assert.deepEqual(gamesorter.sort(gameTrees, 'WR'),
                         [blank, beginner, shodan, pro])
    })

    it ('when given player black property - PB', () => {
        // null, Absolute Beginner, Maruyama Toyoji, Zero
        assert.deepEqual(gamesorter.sort(gameTrees, 'PB'),
                         [blank, beginner, pro, shodan])
    })

    it ('when given player white property - PW', () => {
        // null, Ito Yoji, Noob, Shodan
        assert.deepEqual(gamesorter.sort(gameTrees, 'PW'),
                         [blank, pro, beginner, shodan])
    })

    it ('when given game name property - GN', () => {
        assert.deepEqual(gamesorter.sort(gameTrees, 'GN'),
                         [blank, pro, shodan, beginner])
    })

    it ('when given event property - EV', () => {
        assert.deepEqual(gamesorter.sort(gameTrees, 'EV'),
                         [blank, pro, beginner, shodan])
    })

    it ('when given date property - DT', () => {
        assert.deepEqual(gamesorter.sort(gameTrees, 'DT'),
                         [blank, pro, shodan, beginner])
    })

    it ('when sorting by number of moves - moves', () => {
        assert.deepEqual(gamesorter.sort(gameTrees, 'moves'),
                         [blank, beginner, shodan, pro])
    })

    it ('when reversing', () => {
        assert.deepEqual(gamesorter.sort(gameTrees, '-1'),
                         [shodan, beginner, pro, blank])
    })
})
