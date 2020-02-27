import assert from 'assert'
import * as fileformats from '../src/modules/fileformats/index.js'
import * as gamesort from '../src/modules/gamesort.js'

const blank = fileformats.parseFile(`${__dirname}/sgf/blank_game.sgf`)[0]

// BR = 30k WR = 10k, GN: Teaching Game, EV: Go Club, DT: 2018-05-22
const beginner = fileformats.parseFile(`${__dirname}/sgf/beginner_game.sgf`)[0]

// BR = 1k WR = 1d, GN: A Challenge, EV: Tournament
const shodan = fileformats.parseFile(`${__dirname}/sgf/shodan_game.sgf`)[0]

// BR = 1p WR = 1p, EV: 1st Kisei, DT: 1976-01-28
const pro = fileformats.parseFile(`${__dirname}/sgf/pro_game.sgf`)[0]

describe('gamesort', () => {
  describe('byBlackRank', () => {
    let gameTrees = [blank, pro, beginner, shodan]

    it('sorts games by rank of black player low to high', () => {
      assert.deepEqual(gamesort.byBlackRank(gameTrees), [
        blank,
        beginner,
        shodan,
        pro
      ])
    })
  })

  describe('byWhiteRank', () => {
    let gameTrees = [blank, pro, beginner, shodan]

    it('sorts games by rank of white player low to high', () => {
      assert.deepEqual(gamesort.byWhiteRank(gameTrees), [
        blank,
        beginner,
        shodan,
        pro
      ])
    })
  })

  describe('byPlayerBlack', () => {
    let gameTrees = [blank, pro, beginner, shodan]

    it('sorts games alphabetically by name of black player', () => {
      assert.deepEqual(gamesort.byPlayerBlack(gameTrees), [
        blank,
        beginner,
        pro,
        shodan
      ])
    })
  })

  describe('byPlayerWhite', () => {
    let gameTrees = [blank, pro, beginner, shodan]

    it('sorts games alphabetically by name of white player', () => {
      assert.deepEqual(gamesort.byPlayerWhite(gameTrees), [
        blank,
        pro,
        beginner,
        shodan
      ])
    })
  })

  describe('byGameName', () => {
    let gameTrees = [blank, pro, beginner, shodan]

    it('sorts games naturally by game name', () => {
      assert.deepEqual(gamesort.byGameName(gameTrees), [
        blank,
        pro,
        shodan,
        beginner
      ])
    })
  })

  describe('byEvent', () => {
    let gameTrees = [blank, pro, beginner, shodan]

    it('sorts games naturally by event', () => {
      assert.deepEqual(gamesort.byEvent(gameTrees), [
        blank,
        pro,
        beginner,
        shodan
      ])
    })
  })

  describe('byDate', () => {
    let gameTrees = [blank, pro, beginner, shodan]

    it('sorts games by date', () => {
      assert.deepEqual(gamesort.byDate(gameTrees), [
        blank,
        pro,
        shodan,
        beginner
      ])
    })
  })

  describe('byNumberOfMoves', () => {
    let gameTrees = [blank, pro, beginner, shodan]

    it('sorts games by height of game tree', () => {
      assert.deepEqual(gamesort.byNumberOfMoves(gameTrees), [
        blank,
        beginner,
        shodan,
        pro
      ])
    })
  })

  describe('reverse', () => {
    let gameTrees = [blank, pro, beginner, shodan]

    it('reverses the array of gametrees', () => {
      assert.deepEqual(gamesort.reverse(gameTrees), [
        shodan,
        beginner,
        pro,
        blank
      ])
    })
  })
})
