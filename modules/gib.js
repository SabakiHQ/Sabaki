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

        } else if (line.startsWith('\\[GAMECONDITION=')) {

            // Find komi if it's recorded in English.
            // Also check for the most common komi written in Chinese.

            let regex = new RegExp('Black (.+) Dum')
            let match = regex.exec(line)

            if (match) {
                let komi = parseFloat(match[1])
                if (Number.isNaN(komi) === false) {
                    root.KM = [komi.toString()]
                }
            } else if (line.includes('黑贴6目半') || line.includes('黑貼6目半')) {
                root.KM = ['6.5']
            } else if (line.includes('黑贴7目半') || line.includes('黑貼7目半')) {
                root.KM = ['7.5']
            }

        } else if (line.startsWith('\\[GAMERESULT=')) {

            let score = null
            let strings = line.split(' ')

            // Try to find score by assuming any float found is the score.

            for (let s of strings) {
                let p = parseFloat(s)
                if (Number.isNaN(p) === false) {
                    score = p
                }
            }

            if (line.toLowerCase().includes('white') &&
                line.toLowerCase().includes('black') === false) {

                if (line.toLowerCase().includes('resignation')) {
                    root.RE = ['W+R']
                } else if (score !== null) {
                    root.RE = ['W+' + score.toString()]
                } else {
                    root.RE = ['W+']
                }
            }

            if (line.toLowerCase().includes('black') &&
                line.toLowerCase().includes('white') === false) {

                if (line.toLowerCase().includes('resignation')) {
                    root.RE = ['B+R']
                } else if (score !== null) {
                    root.RE = ['B+' + score.toString()]
                } else {
                    root.RE = ['B+']
                }
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
