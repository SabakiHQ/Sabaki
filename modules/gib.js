const fs = require('fs')
const iconv = require('iconv-lite')
const jschardet = require('jschardet')
const gametree = require('./gametree')
const sgf = require('./sgf')
const Board = require('./board')

exports.meta = {
    name: 'Tygem GIB',
    extensions: ['gib']
}

function makeResult(grlt, zipsu) {      // Arguments are expected to be numbers

    // The GRLT tag contains the type of result:
    // 0: B+n   1: W+n   3: B+R   4: W+R   7: B+T   8: W+T
    // If there is a score, the ZIPSU tag contains it (multiplied by 10).

    let winner = ''
    let margin = ''

    if (grlt === 0 || grlt === 3 || grlt === 7) {
        winner = 'B'
    } else if (grlt === 1 || grlt === 4 || grlt === 8) {
        winner = 'W'
    }

    if (grlt === 3 || grlt === 4) {
        margin = 'R'
    } else if (grlt === 7 || grlt === 8) {
        margin = 'T'
    } else if (grlt === 0 || grlt === 1) {
        margin = (zipsu / 10).toString()
    }

    if (winner !== '') {
        return winner + '+' + margin
    }

    return ''
}

function getResult(line, grltRegex, zipsuRegex) {
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

exports.parse = function (content, callback = () => {}) {      // We ignore the callback. Other loaders use it for progress bar.

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

            // Result...

            let result = getResult(line, /GRLT:(\d+),/, /ZIPSU:(\d+),/)

            if (result !== '') {
                root.RE = [result]
            }

            // Komi...

            regex = /GONGJE:(\d+),/
            match = regex.exec(line)

            if (match) {
                let komi = parseFloat(match[1]) / 10
                root.KM = [komi.toString()]
            }

        } else if (line.startsWith('\\[GAMETAG=')) {

            // Date...

            let regex = /C(\d\d\d\d):(\d\d):(\d\d)/
            let match = regex.exec(line)

            if (match) {
                root.DT = [match[1] + '-' + match[2] + '-' + match[3]]
            }

            // Result...

            let result = getResult(line, /,W(\d+),/, /,Z(\d+),/)

            if (result !== '') {
                root.RE = [result]
            }

            // Komi...

            regex = /,G(\d+),/
            match = regex.exec(line)

            if (match) {
                let komi = parseFloat(match[1]) / 10
                root.KM = [komi.toString()]
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
