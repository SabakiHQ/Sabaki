const natsort = require('natsort')
const sgf = require('@sabaki/sgf')
const helper = require('./helper')
const gametree = require('./gametree')

function extractProperty(gametree, property) {
    return property in gametree.nodes[0] ? gametree.nodes[0][property][0] : ''
}

// player : 'BR' | 'WR'
function sortRank(gameTrees, player) {
    return stableSort(gameTrees, (tr1, tr2) => {
        let [weighted1, weighted2] = [tr1, tr2]
            .map(tree => (weightRank(extractProperty(tree, player))))
        return compareResult(weighted1, weighted2)
    })
}

// rank : string like '30k', '1d', '1p'
function weightRank(rank) {
    let rank_number = parseFloat(rank)
    if (isNaN(rank_number)) {
        return -Infinity
    } else {
        let weight = rank.includes('k') ? -1 : rank.includes('p') ? 10 : 1
        return weight * rank_number
    }
}

// name : 'PB' | 'PW' | 'GN' | 'EV'
function sortName(gameTrees, name) {
    return stableSort(gameTrees, (tr1, tr2) => {
        let [name1, name2] = [tr1, tr2].map(tree => (extractProperty(tree, name)))
        return natsort({insensitive: true})(name1, name2)
    })
}

function compareResult(item1, item2) {
    return item1 < item2 ? -1 : +(item1 !== item2)
}

function stableSort(ary, fn) {
    return ary.map((element, index) => [element, index])
        .sort((pair1, pair2) => {
            let result = fn(pair1[0], pair2[0])
            if (result === 0) {
                return pair1[1] - pair2[1]
            } else {
                return result
            }
        }).map(pair => pair[0])
}

exports.reverse = function(gameTrees) {
    return gameTrees.slice().reverse()
}

exports.byBlackRank = function(gameTrees) {
    return sortRank(gameTrees, 'BR')
}

exports.byWhiteRank = function(gameTrees) {
    return sortRank(gameTrees, 'WR')
}

exports.byPlayerBlack = function(gameTrees) {
    return sortName(gameTrees, 'PB')
}

exports.byPlayerWhite = function(gameTrees) {
    return sortName(gameTrees, 'PW')
}

exports.byGameName = function(gameTrees) {
    return sortName(gameTrees, 'GN')
}

exports.byEvent = function(gameTrees) {
    return sortName(gameTrees, 'EV')
}

exports.byDate = function(gameTrees) {
    return stableSort(gameTrees, (tr1, tr2) => {
        let [date1, date2] = [tr1, tr2]
            .map(tree => (extractProperty(tree, 'DT')))
            .map(x => sgf.parseDates(x))
            .map(x => x ? sgf.stringifyDates(x.sort(helper.lexicalCompare)) : '')
        return compareResult(date1, date2)
    })
}

exports.byNumberOfMoves = function(gameTrees) {
    return stableSort(gameTrees, (tr1, tr2) => {
        return compareResult(gametree.getHeight(tr1), gametree.getHeight(tr2))
    })
}
