const iconv = require('iconv-lite')
const gametree = require('./gametree')
const sgf = require('./sgf')
const Board = require('./board')

exports.parse = function (input) {

    // Try UTF-8 encoding... in any case it's better than binary.

    input = iconv.decode(Buffer.from(input, 'binary'), 'utf8')

    let lines = input.split('\n')

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

            // Hard-coded the common komi cases.
            // For better results, we could do a regex here instead.

            if (line.toLowerCase().includes('black 6.5 dum')) {
                root.KM = ['6.5']
            } else if (line.toLowerCase().includes('black 7.5 dum')) {
                root.KM = ['7.5']
            } else if (line.toLowerCase().includes('black 0.5 dum')) {
                root.KM = ['0.5']
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
