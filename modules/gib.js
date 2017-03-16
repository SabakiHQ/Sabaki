const fs = require('fs')
const iconv = require('iconv-lite')
const gametree = require('./gametree')
const sgf = require('./sgf')
const Board = require('./board')

exports.meta = {
    name: 'Tygem GIB',
    extensions: ['gib']
}

exports.parse = function (content, callback = () => {}) {      // We ignore the callback. Other loaders use it for progress bar.

    content = iconv.decode(Buffer.from(content, 'binary'), 'utf8')

    let lines = content.split('\n')

    let tree = gametree.new()
    let root = {}
    tree.nodes.push(root)

    root.FF = ['4']
    root.GM = ['1']
    root.SZ = ['19']

    let node = root

    for (let n = 0; n < lines.length; n++) {

        let line = lines[n].trim()

        if (line.startsWith('\\[GAMEBLACKNAME=') && line.endsWith('\\]')) {

            let s = line.slice(16, -2)
            root.PB = [s]

        } else if (line.startsWith('\\[GAMEWHITENAME=') && line.endsWith('\\]')) {

            let s = line.slice(16, -2)
            root.PW = [s]

        } else if (line.startsWith('\\[GAMEINFOMAIN=')) {

            // The GRLT tag contains the type of result:
            // 0: B+n   1: W+n   3: B+R   4: W+R   7: B+T   8: W+T
            // If there is a score, the ZIPSU tag contains it (multiplied by 10).

            let winner = ''
            let margin = ''

            let regex = new RegExp('GRLT:(\\d+),')
            let match = regex.exec(line)

            if (match) {

                let num = parseFloat(match[1])

                if (num === 0 || num === 3 || num === 7) {
                    winner = 'B'
                } else if (num === 1 || num === 4 || num === 8) {
                    winner = 'W'
                }

                if (num === 3 || num === 4) {
                    margin = 'R'
                } else if (num === 7 || num === 8) {
                    margin = 'T'
                } else if (num === 0 || num === 1) {
                    regex = new RegExp('ZIPSU:(\\d+),')
                    match = regex.exec(line)
                    if (match) {
                        let score = parseFloat(match[1]) / 10
                        margin = score.toString()
                    }
                }
            }

            if (winner !== '') {
                root.RE = [winner + '+' + margin]
            }

            // Komi is apparently stored in the GONGJE tag.

            regex = new RegExp('GONGJE:(\\d+),')
            match = regex.exec(line)

            if (match) {
                let komi = parseFloat(match[1]) / 10
                root.KM = [komi.toString()]
            }

        } else if (line.startsWith('\\[GAMETAG=')) {

            let regex = new RegExp('C(\\d\\d\\d\\d):(\\d\\d):(\\d\\d)')
            let match = regex.exec(line)

            if (match) {
                root.DT = [match[1] + '-' + match[2] + '-' + match[3]]
            }

        } else if (line.slice(0, 3) === 'INI') {

            let setup = line.split(' ')

            let handicap = 0
            let p = Math.floor(parseFloat(setup[3]))
            if (Number.isNaN(p) === false) {
                handicap = p
            }

            if (handicap >= 2 && handicap <= 9) {
                root.HA = [handicap.toString()]
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

    return tree
}

exports.parseFile = function (filename, callback = () => {}) {
    return exports.parse(fs.readFileSync(filename, {encoding: 'binary'}), callback)
}
