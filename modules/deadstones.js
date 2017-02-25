const Board = require('./board')

let equals = v => w => w[0] === v[0] && w[1] === v[1]
let equalsSign = s => t => s === t

function getNeighbors([x, y]) {
    return [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]
}

function getChain(board, vertex, result = null, sign = null) {
    if (result === null) result = [vertex]
    if (sign === null) sign = board.get(vertex)

    let neighbors = getNeighbors(vertex)

    for (let i = 0; i < neighbors.length; i++) {
        let v = neighbors[i]
        if (board.get(v) !== sign || result.some(equals(v))) continue

        result.push(v)
        getChain(board, v, result, sign)
    }

    return result
}

function hasNLiberties(board, vertex, N, visited = [], liberties = [], sign = null) {
    if (liberties.length >= N) return true

    if (visited.some(equals(vertex))) return false
    if (sign === null) sign = board.get(vertex)

    let neighbors = getNeighbors(vertex)
    let friendlyNeighbors = []

    for (let i = 0; i < neighbors.length; i++) {
        let n = neighbors[i]
        let s = board.get(n)

        if (s === 0 && !liberties.some(equals(n))) {
            liberties.push(n)
            if (liberties.length >= N) return true
        } else if (s === sign) {
            friendlyNeighbors.push(n)
        }
    }

    visited.push(vertex)

    for (let i = 0; i < friendlyNeighbors.length; i++) {
        if (hasNLiberties(board, friendlyNeighbors[i], N, visited, liberties, sign))
            return true
    }

    return false
}

function makePseudoMove(board, sign, vertex) {
    let neighbors = getNeighbors(vertex)
    let neighborSigns = neighbors.map(n => board.get(n))
    if (neighborSigns.every(equalsSign(sign))) return null

    board.set(vertex, sign)

    let checkCapture = false

    if (!hasNLiberties(board, vertex, 2)) {
        if (!neighborSigns.some(equalsSign(-sign))) {
            board.set(vertex, 0)
            return null
        } else {
            checkCapture = true
        }
    }

    let dead = []

    for (let i = 0; i < neighbors.length; i++) {
        let n = neighbors[i]
        if (board.get(n) !== -sign || hasNLiberties(board, n, 1))
            continue

        let chain = getChain(board, n)
        dead.push(...chain)

        for (let j = 0; j < chain.length; j++) {
            board.set(chain[j], 0)
        }
    }

    if (checkCapture && dead.length === 0) {
        board.set(vertex, 0)
        return null
    }

    return dead
}

function fixHoles(board) {
    for (let x = 0; x < board.width; x++) {
        for (let y = 0; y < board.height; y++) {
            let vertex = [x, y]
            if (board.get(vertex) !== 0) continue

            let neighbors = getNeighbors(vertex)
            let neighborSigns = neighbors.map(n => board.get(n))
            let fix = true

            for (let i = 1; i < neighbors.length; i++) {
                let n = neighbors[i]

                if (neighborSigns[i] !== null && neighborSigns[i] !== neighborSigns[0]) {
                    fix = false
                    break
                }
            }

            if (fix) board.set(vertex, neighborSigns[0])
        }
    }

    return board
}

exports.guess = function(board, scoring = false, iterations = 20) {
    let map = exports.getProbabilityMap(board, iterations)
    let done = []
    let result = []

    for (let x = 0; x < board.width; x++) {
        for (let y = 0; y < board.height; y++) {
            let vertex = [x, y]
            let sign = board.get(vertex)

            if (sign === 0 || done.some(equals(vertex))) continue

            let chain = getChain(board, vertex)
            let probability = chain.map(([i, j]) => map[j][i]).reduce((sum, x) => sum + x) / chain.length
            let newSign = probability < 0.5 ? -1 : probability > 0.5 ? 1 : 0

            if (newSign === -sign) result.push(...chain)

            done.push(vertex)
        }
    }

    if (scoring) {
        let floating = exports.getFloatingStones(board)

        for (let v of floating) {
            if (!result.some(equals(v))) result.push(v)
        }
    }

    return result
}

exports.getFloatingStones = function(board) {
    let map = board.getAreaMap()
    let done = []
    let result = []
    let isNegative = v => board.get(v) === -1
    let isPositive = v => board.get(v) === 1
    let markAsDone = v => done.push(v)

    for (let i = 0; i < board.width; i++) {
        for (let j = 0; j < board.height; j++) {
            let vertex = [i, j]
            if (map[j][i] !== 0 || done.some(equals(vertex))) continue

            let posArea = board.getConnectedComponent(vertex, [0, -1])
            let negArea = board.getConnectedComponent(vertex, [0, 1])
            let posDead = posArea.filter(isNegative)
            let negDead = negArea.filter(isPositive)
            let posDiff = posArea.filter(v => !posDead.some(equals(v)) && !negArea.some(equals(v)))
            let negDiff = negArea.filter(v => !negDead.some(equals(v)) && !posArea.some(equals(v)))

            let sign = 0
            let actualArea, actualDead

            if (negDiff.length <= 1 && negDead.length <= posDead.length) {
                sign--
                actualArea = negArea
                actualDead = negDead
            }

            if (posDiff.length <= 1 && posDead.length <= negDead.length) {
                sign++
                actualArea = posArea
                actualDead = posDead
            }

            if (sign === 0) {
                actualArea = getChain(board, vertex)
                actualDead = []
            }

            actualArea.forEach(markAsDone)
            result.push(...actualDead)
        }
    }

    return result
}

exports.playTillEnd = function(board, sign, iterations = null) {
    if (iterations === null) iterations = board.width * board.height
    board = board.clone()

    let freeVertices = []
    let illegalVertices = []

    for (let x = 0; x < board.width; x++) {
        for (let y = 0; y < board.height; y++) {
            if (board.get([x, y]) !== 0) continue
            freeVertices.push([x, y])
        }
    }

    let finished = {'-1': false, '1': false}

    while (iterations > 0 && freeVertices.length > 0 && !(finished[-sign] && finished[sign])) {
        let madeMove = false

        while (freeVertices.length > 0) {
            let randomIndex = Math.floor(Math.random() * freeVertices.length)
            let vertex = freeVertices[randomIndex]
            let freedVertices = makePseudoMove(board, sign, vertex, false)

            freeVertices.splice(randomIndex, 1)

            if (freedVertices !== null) {
                freeVertices.push(...freedVertices)

                finished[-sign] = false
                madeMove = true

                break
            } else {
                illegalVertices.push(vertex)
            }
        }

        finished[sign] = !madeMove

        freeVertices.push(...illegalVertices)
        illegalVertices.length = 0

        sign = -sign
        iterations--
    }

    return fixHoles(board)
}

exports.getProbabilityMap = function(board, iterations) {
    let pmap = [...Array(board.height)].map(_ => Array(board.width).fill(0))
    let nmap = [...Array(board.height)].map(_ => Array(board.width).fill(0))
    let result = [...Array(board.height)].map(_ => Array(board.width).fill(0.5))

    for (let i = 0; i < iterations; i++) {
        let sign = Math.sign(Math.random() - 0.5)
        let areaMap = exports.playTillEnd(board, sign)

        for (let x = 0; x < areaMap.width; x++) {
            for (let y = 0; y < areaMap.height; y++) {
                let s = areaMap.get([x, y])
                if (s < 0) nmap[y][x]++
                else if (s > 0) pmap[y][x]++
            }
        }
    }

    for (let x = 0; x < board.width; x++) {
        for (let y = 0; y < board.height; y++) {
            if (pmap[y][x] + nmap[y][x] === 0) continue
            result[y][x] = pmap[y][x] / (pmap[y][x] + nmap[y][x])
        }
    }

    return result
}
