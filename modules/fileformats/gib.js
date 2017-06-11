const fs = require('fs')
const sgf = require('./sgf')
const gametree = require('../gametree')
const Board = require('../board')

exports.meta = {
    name: 'Tygem GIB',
    extensions: ['gib']
}

function makeResult(grlt, zipsu) {      // Arguments are expected to be numbers
    // Given a game result type and a score, return a text result.

    // The GRLT tag contains the type of result:
    // 0: B+n   1: W+n   3: B+R   4: W+R   7: B+T   8: W+T

    let easycases = {'3': 'B+R', '4': 'W+R', '7': 'B+T', '8': 'W+T'}

    if (easycases[grlt] !== undefined) {
        return easycases[grlt]
    }

    // If there is a score, the ZIPSU tag contains it (multiplied by 10).

    if (grlt === 0 || grlt === 1) {
        let winner = grlt === 0 ? 'B' : 'W'
        let margin = (zipsu / 10).toString()
        return winner + '+' + margin
    }

    // We couldn't work it out...

    return ''
}

function getResult(line, grltRegex, zipsuRegex) {
    // Takes a line and two regexes, the first finding the GRLT (game
    // result type, e.g. 3 == B+R) and the second finding the score.

    let result = ''
    let match = grltRegex.exec(line)

    if (match) {
        let grlt = parseFloat(match[1])
        match = zipsuRegex.exec(line)
        if (match) {
            let zipsu = parseFloat(match[1])
            result = makeResult(grlt, zipsu)
        }
    }

    return result
}

function parsePlayerName(raw) {
    let name = ''
    let rank = ''

    // If there's exactly one opening bracket...

    let foo = raw.split('(')
    if (foo.length === 2) {
        // And if the closing bracket is right at the end...

        if (foo[1].indexOf(')') === foo[1].length - 1) {

            // Then extract the rank...

            name = foo[0].trim()
            rank = foo[1].slice(0, foo[1].length - 1)
        }
    }

    if (name === '') {
        return [raw, '']
    } else {
        return [name, rank]
    }
}

exports.parse = function(content) {
    let iconv = require('iconv-lite')
    let jschardet = require('jschardet')

    let encoding = 'utf8'
    let detected = jschardet.detect(content)
    if (detected.confidence > 0.2) {
        encoding = detected.encoding
    }

    content = iconv.decode(Buffer.from(content, 'binary'), encoding)

    let lines = content.split('\n')

    let tree = gametree.new()
    let root = {}
    tree.nodes.push(root)

    root.CA = ['UTF-8']
    root.FF = [4]
    root.GM = [1]
    root.SZ = [19]

    let node = root

    let regex
    let match

    for (let n = 0; n < lines.length; n++) {
        let line = lines[n].trim()

        if (line.startsWith('\\[GAMEBLACKNAME=') && line.endsWith('\\]')) {

            let s = line.slice(16, -2)
            let [name, rank] = parsePlayerName(s)
            if (name) {
                root.PB = [name]
            }
            if (rank) {
                root.BR = [rank]
            }
        } else if (line.startsWith('\\[GAMEWHITENAME=') && line.endsWith('\\]')) {
            let s = line.slice(16, -2)
            let [name, rank] = parsePlayerName(s)
            if (name) {
                root.PW = [name]
            }
            if (rank) {
                root.WR = [rank]
            }
        } else if (line.startsWith('\\[GAMEINFOMAIN=')) {

            if (root.RE === undefined) {
                let result = getResult(line, /GRLT:(\d+),/, /ZIPSU:(\d+),/)
                if (result !== '') {
                    root.RE = [result]
                }
            }

            if (root.KM === undefined) {
                regex = /GONGJE:(\d+),/
                match = regex.exec(line)
                if (match) {
                    let komi = parseFloat(match[1]) / 10
                    root.KM = [komi]
                }
            }
        } else if (line.startsWith('\\[GAMETAG=')) {
            if (root.DT === undefined) {
                regex = /C(\d\d\d\d):(\d\d):(\d\d)/
                match = regex.exec(line)
                if (match) {
                    root.DT = [match[1] + '-' + match[2] + '-' + match[3]]
                }
            }

            if (root.RE === undefined) {
                let result = getResult(line, /,W(\d+),/, /,Z(\d+),/)
                if (result !== '') {
                    root.RE = [result]
                }
            }

            if (root.KM === undefined) {
                regex = /,G(\d+),/
                match = regex.exec(line)
                if (match) {
                    let komi = parseFloat(match[1]) / 10
                    root.KM = [komi]
                }
            }
        } else if (line.slice(0, 3) === 'INI') {
            let setup = line.split(' ')
            let handicap = 0
            let p = Math.floor(parseFloat(setup[3]))

            if (Number.isNaN(p) === false) {
                handicap = p
            }

            if (handicap >= 2 && handicap <= 9) {
                root.HA = [handicap]
                root.AB = []

                let tmp = new Board()       // Created solely for .getHandicapPlacement()

                let points = tmp.getHandicapPlacement(handicap)

                for (let p of points) {
                    let [x, y] = p
                    let s = sgf.vertex2point([x, y])
                    root.AB.push(s)
                }
            }
        } else if (line.slice(0, 3) === 'STO') {
            let elements = line.split(' ')

            if (elements.length < 6) {
                continue
            }

            let key

            if (elements[3] === '1') {
                key = 'B'
            } else {
                key = 'W'
            }

            let x = Math.floor(parseFloat(elements[4]))
            let y = Math.floor(parseFloat(elements[5]))

            if (Number.isNaN(x) || Number.isNaN(y)) {
                continue
            }

            let val = sgf.vertex2point([x, y])

            let node = {}
            tree.nodes.push(node)
            node[key] = [val]
        }
    }

    return [tree]
}

exports.parseFile = function(filename) {
    return exports.parse(fs.readFileSync(filename, {encoding: 'binary'}))
}
