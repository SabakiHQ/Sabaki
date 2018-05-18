const assert = require('assert')
const helper = require('../src/modules/helper')
const fileformats = require('../src/modules/fileformats')
const gametree = require('../src/modules/gametree')
const gamesorter = require('../src/modules/gamesorter')

describe('gamesorter.sort', () => {
    // BR = 15k
    let someGame = fileformats.parseFile(`${__dirname}/gib/utf8.gib`)[0]

    // BR = "1±Þ" doesn't seem to convert
    let someOtherGame = fileformats.parseFile(`${__dirname}/gib/euc-kr.gib`)[0]

    // BR = 9p
    let firstKisei = fileformats.parseFile(`${__dirname}/sgf/F1.sgf`)[0]

    let gameTrees = [someGame, firstKisei]

    it ('when given a rank property - BR, WR', () => {
        assert.deepEqual(gamesorter.sort(gameTrees, 'BR'), [firstKisei, someGame])
    })

    it ('when given game name property - GN', () => {
        // it appears neither game has GN property
        assert.deepEqual(gamesorter.sort(gameTrees, 'GN'), [someGame, firstKisei])
    })

    it ('when given event property - EV', () => {
        // someGame is null, first kisei is "1st Kisei"
        assert.deepEqual(gamesorter.sort(gameTrees, 'EV'), [someGame, firstKisei])
    })

    it ('when given date property - DT', () => {
        // someGame = 2016-03-26, firstKisei = 1976-01-28
        assert.deepEqual(gamesorter.sort(gameTrees, 'DT'), [firstKisei, someGame])
    })

    it ('when sorting by number of moves - moves', () => {
        let gameTrees = [firstKisei, someGame]
        assert.deepEqual(gamesorter.sort(gameTrees, 'moves'), [someGame, firstKisei])
    })

    it ('when reversing', () => {
        assert.deepEqual(gamesorter.sort(gameTrees, '-1'), [firstKisei, someGame])
    })
})
