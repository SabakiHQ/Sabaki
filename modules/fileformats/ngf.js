const fs = require('fs')
const sgf = require('./sgf')
const gametree = require('../gametree')
const Board = require('../board')

exports.meta = {
    name: 'wBaduk NGF',
    extensions: ['ngf']
}

exports.parse = function(content) {
    let iconv = require('iconv-lite')
    let jschardet = require('jschardet')

    // NGF files have a huge amount of ASCII-looking text. To help
    // the detector, we just send it the first few lines.

    let rawlines = content.split('\n')
    let raw = rawlines.slice(0, 12).join()

    let encoding = 'utf8'
    let detected = jschardet.detect(raw)
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

    // These array accesses might throw if out of range, that's fine.
    // The caller will deal with the exception.

    let boardsize = Math.floor(parseFloat(lines[1]))
    let handicap = Math.floor(parseFloat(lines[5]))
    let pw = lines[2].split(' ')[0]
    let pb = lines[3].split(' ')[0]
    let rawdate = lines[8].slice(0, 8)
    let komi = Math.floor(parseFloat(lines[7]))

    if (Number.isNaN(boardsize)) {
        boardsize = 19
    }
    if (Number.isNaN(handicap)) {
        handicap = 0
    }
    if (Number.isNaN(komi)) {
        komi = 0
    }

    let line2 = lines[2].trim().split(' ')
    if (line2.length > 1) {
        let whiterank = line2[line2.length - 1]
        whiterank = whiterank.replace('DP', 'p').replace('K', 'k').replace('D', 'd')
        root.WR = [whiterank]
    }

    let line3 = lines[3].trim().split(' ')
    if (line3.length > 1) {
        let blackrank = line3[line3.length - 1]
        blackrank = blackrank.replace('DP', 'p').replace('K', 'k').replace('D', 'd')
        root.BR = [blackrank]
    }

    if (handicap === 0 && komi === Math.floor(komi)) {
        komi += 0.5
    }

    let winner = ''
    let margin = ''

    if (lines[10].includes('resign')) {
        margin = 'R'
    }
    if (lines[10].includes('time')) {
        margin = 'T'
    }
    if (lines[10].includes('hite win') || lines[10].includes('lack lose')) {
        winner = 'W'
    }
    if (lines[10].includes('lack win') || lines[10].includes('hite lose')) {
        winner = 'B'
    }
    if (margin === '') {

        let score = null
        let strings = lines[10].split(' ')

        // Try to find score by assuming any float found is the score.

        for (let s of strings) {
            let p = parseFloat(s)
            if (Number.isNaN(p) === false) {
                score = p
            }
        }

        if (score !== null) {
            margin = score.toString()
        }
    }

    if (winner !== '') {
        root.RE = [winner + '+' + margin]
    }

    root.SZ = [boardsize]

    if (handicap >= 2) {
        root.HA = [handicap]
        root.AB = []

        let tmp = new Board(boardsize, boardsize)       // Created solely for .getHandicapPlacement()

        let points = tmp.getHandicapPlacement(handicap)

        for (let p of points) {
            let [x, y] = p
            let s = sgf.vertex2point([x, y])
            root.AB.push(s)
        }
    }

    if (komi) {
        root.KM = [komi]
    }

    if (rawdate.length === 8) {
        let ok = true
        for (let n = 0; n < 8; n++) {
            let tmp = parseFloat(rawdate.charAt(n))
            if (Number.isNaN(tmp)) {
                ok = false
            }
        }
        if (ok) {
            let date = ''
            date += rawdate.slice(0, 4)
            date += '-' + rawdate.slice(4, 6)
            date += '-' + rawdate.slice(6, 8)
            root.DT = [date]
        }
    }

    root.PW = [pw]
    root.PB = [pb]

    // We currently search for moves in all lines. Current files start moves at line 12.
    // But some older files have less headers and start moves earlier.

    for (let n = 0; n < lines.length; n++) {
        let line = lines[n].trim()

        if (line.length >= 7) {

            if (line.slice(0, 2) === 'PM') {

                let key = line.charAt(4)

                if (key === 'B' || key === 'W') {

                    // Coordinates are letters but with 'B' as the lowest.

                    let x = line.charCodeAt(5) - 66
                    let y = line.charCodeAt(6) - 66

                    let val = sgf.vertex2point([x, y])

                    let node = {}
                    tree.nodes.push(node)
                    node[key] = [val]
                }
            }
        }
    }

    return [tree]
}

exports.parseFile = function(filename) {
    return exports.parse(fs.readFileSync(filename, {encoding: 'binary'}))
}
