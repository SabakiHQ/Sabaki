const fs = require('fs')
const iconv = require('iconv-lite')
const gametree = require('./gametree')

function string_from_point(x, y) {
    // convert x, y into SGF coordinate e.g. "pd"
    return String.fromCharCode(x + 96) + String.fromCharCode(y + 96)
}

function handicap_points(boardsize, handicap, tygem) {

    // Return a list of handicap points.
    // The "tygem" flag affects the positioning.

    let points = []

    if (boardsize < 4) {
        return points
    }

    if (handicap > 9) {
        handicap = 9
    }

    let d
    if (boardsize < 13) {
        d = 2
    } else {
        d = 3
    }

    if (handicap >= 2) {
        points.push([boardsize - d, 1 + d])
        points.push([1 + d, boardsize - d])
    }

    // Experiments suggest Tygem puts its 3rd handicap stone in the top left

    if (handicap >= 3) {
        if (tygem) {
            points.push([1 + d, 1 + d])
        } else {
            points.push([boardsize - d, boardsize - d])
        }
    }

    if (handicap >= 4) {
        if (tygem) {
            points.push([boardsize - d, boardsize - d])
        } else {
            points.push([1 + d, 1 + d])
        }
    }

    if (boardsize % 2 == 0) {      // No handicap > 4 on even sided boards
        return points
    }

    let mid = (boardsize + 1) / 2

    if (handicap === 5 || handicap === 7 || handicap === 9) {
        points.push([mid, mid])
    }

    if (handicap >= 6) {
        points.push([1 + d, mid])
        points.push([boardsize - d, mid])
    }

    if (handicap >= 8) {
        points.add([mid, 1 + d])
        points.add([mid, boardsize - d])
    }

    return points
}

exports.parse = function (input) {

    // Try UTF-8 encoding... in any case it's better than binary.

    input = iconv.decode(Buffer.from(input, 'binary'), 'utf8')

    let lines = input.split('\n')

    let tree = gametree.new()
    let root = {}
    tree.nodes.push(root)

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

            if (line.toLowerCase().includes("black 6.5 dum")) {
                root.KM = ["6.5"]
            } else if (line.toLowerCase().includes("black 7.5 dum")) {
                root.KM = ["7.5"]
            } else if (line.toLowerCase().includes("black 0.5 dum")) {
                root.KM = ["0.5"]
            }

        } else if (line.startsWith('\\[GAMERESULT=')) {

            let score = null
            let strings = line.split(' ')

            // Try to find score by assuming any float found is the score.

            for (let i in strings) {
                try {
                    let p = parseFloat(strings[i])  // Does this ever throw?
                    if (isNaN(p) === false) {
                        score = p
                    }
                }
                catch (e) {}
            }

            if (line.toLowerCase().includes('white') &&
                line.toLowerCase().includes('black') === false) {

                if (line.toLowerCase().includes('resignation')) {
                    root.RE = ["W+R"]
                } else if (score !== null) {
                    root.RE = ["W+" + score.toString()]
                } else {
                    root.RE = ["W+"]
                }
            }

            if (line.toLowerCase().includes('black') &&
                line.toLowerCase().includes('white') === false) {

                if (line.toLowerCase().includes('resignation')) {
                    root.RE = ["B+R"]
                } else if (score !== null) {
                    root.RE = ["B+" + score.toString()]
                } else {
                    root.RE = ["B+"]
                }
            }

        } else if (line.slice(0, 3) === 'INI') {

            let setup = line.split(' ')
            let handicap = 0
            try {
                let p = parseInt(setup[3])
                if (isNaN(p) === false) {
                    handicap = p
                }
            }
            catch (e) {}

            if (handicap >= 2 && handicap <= 9) {
                root.HA = [handicap]
                root.AB = []

                let points = handicap_points(19, handicap, true)

                for (let i in points) {
                    let x = points[i][0]
                    let y = points[i][1]
                    let s = string_from_point(x, y)
                    root.AB.push(s)
                }
            }

        } else if (line.slice(0, 3) === 'STO') {

            let elements = line.split(' ')
            if (elements.length < 6) {
                continue
            }
            
            let node = {}
            tree.nodes.push(node)
            
            let key

            if (elements[3] === '1') {
                key = 'B'
            } else {
                key = 'W'
            }

            let x = parseInt(elements[4]) + 1
            let y = parseInt(elements[5]) + 1

            let val = string_from_point(x, y)
            node[key] = [val]
        }
    }

    return tree
}
