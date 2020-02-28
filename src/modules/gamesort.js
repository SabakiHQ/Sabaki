import natsort from 'natsort'
import {parseDates, stringifyDates} from '@sabaki/sgf'
import {lexicalCompare} from './helper.js'

function extractProperty(tree, property) {
  return property in tree.root.data ? tree.root.data[property][0] : ''
}

// player : 'BR' | 'WR'
function sortRank(trees, player) {
  return [...trees].sort((tr1, tr2) => {
    let [weighted1, weighted2] = [tr1, tr2].map(tree =>
      weightRank(extractProperty(tree, player))
    )
    return compareResult(weighted1, weighted2)
  })
}

// rank : string like '30k', '1d', '1p'
function weightRank(rank) {
  let rankNumber = parseFloat(rank)

  if (isNaN(rankNumber)) {
    return -Infinity
  } else {
    let weight = rank.includes('k') ? -1 : rank.includes('p') ? 10 : 1
    return weight * rankNumber
  }
}

// name : 'PB' | 'PW' | 'GN' | 'EV'
function sortName(trees, name) {
  return [...trees].sort((tr1, tr2) => {
    let [name1, name2] = [tr1, tr2].map(tree => extractProperty(tree, name))
    return natsort({insensitive: true})(name1, name2)
  })
}

function compareResult(item1, item2) {
  return item1 < item2 ? -1 : +(item1 !== item2)
}

export function reverse(trees) {
  return trees.slice().reverse()
}

export function byBlackRank(trees) {
  return sortRank(trees, 'BR')
}

export function byWhiteRank(trees) {
  return sortRank(trees, 'WR')
}

export function byPlayerBlack(trees) {
  return sortName(trees, 'PB')
}

export function byPlayerWhite(trees) {
  return sortName(trees, 'PW')
}

export function byGameName(trees) {
  return sortName(trees, 'GN')
}

export function byEvent(trees) {
  return sortName(trees, 'EV')
}

export function byDate(trees) {
  return [...trees].sort((tr1, tr2) => {
    let [date1, date2] = [tr1, tr2]
      .map(tree => extractProperty(tree, 'DT'))
      .map(x => parseDates(x))
      .map(x => (x ? stringifyDates(x.sort(lexicalCompare)) : ''))
    return compareResult(date1, date2)
  })
}

export function byNumberOfMoves(trees) {
  return [...trees].sort((tr1, tr2) => {
    return compareResult(tr1.getHeight(), tr2.getHeight())
  })
}
