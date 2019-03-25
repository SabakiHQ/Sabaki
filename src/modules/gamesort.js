const natsort = require('natsort')
const sgf = require('@sabaki/sgf')
const helper = require('./helper')

function extractProperty(tree, property) {
    return property in tree.root.data ? tree.root.data[property][0] : ''
}

// player : 'BR' | 'WR'
function sortRank(trees, player) {
    return stableSort(trees, (tr1, tr2) => {
        let [weighted1, weighted2] = [tr1, tr2]
            .map(tree => weightRank(extractProperty(tree, player)))
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
function sortName(trees, name) {
    return stableSort(trees, (tr1, tr2) => {
        let [name1, name2] = [tr1, tr2].map(tree => extractProperty(tree, name))
        return natsort({insensitive: true})(name1, name2)
    })
}

function compareResult(item1, item2) {
    return item1 < item2 ? -1 : +(item1 !== item2)
}

function stableSort(arr, fn) {
    return arr.map((element, index) => [element, index])
        .sort((pair1, pair2) => {
            let result = fn(pair1[0], pair2[0])

            if (result === 0) return pair1[1] - pair2[1]
            return result
        }).map(pair => pair[0])
}

exports.reverse = function(trees) {
    return trees.slice().reverse()
}

exports.byBlackRank = function(trees) {
    return sortRank(trees, 'BR')
}

exports.byWhiteRank = function(trees) {
    return sortRank(trees, 'WR')
}

exports.byPlayerBlack = function(trees) {
    return sortName(trees, 'PB')
}

exports.byPlayerWhite = function(trees) {
    return sortName(trees, 'PW')
}

exports.byGameName = function(trees) {
    return sortName(trees, 'GN')
}

exports.byEvent = function(trees) {
    return sortName(trees, 'EV')
}

exports.byDate = function(trees) {
    return stableSort(trees, (tr1, tr2) => {
        let [date1, date2] = [tr1, tr2]
            .map(tree => extractProperty(tree, 'DT'))
            .map(x => sgf.parseDates(x))
            .map(x => x ? sgf.stringifyDates(x.sort(helper.lexicalCompare)) : '')
        return compareResult(date1, date2)
    })
}

exports.byNumberOfMoves = function(trees) {
    return stableSort(trees, (tr1, tr2) => {
        return compareResult(tr1.getHeight(), tr2.getHeight())
    })
}
