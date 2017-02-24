const Board = require('./board')

let equals = v => w => w[0] == v[0] && w[1] == v[1]

function hasNLiberties(board, vertex, N, visited = {}, count = 0, sign = null) {
    if (vertex in visited) return false
    if (sign == null) sign = board.get(vertex)

    let neighbors = board.getNeighbors(vertex)
    let freeNeighbors = []
    let friendlyNeighbors = []

    for (let i = 0; i < neighbors.length; i++) {
        let n = neighbors[i]
        let s = board.get(n)

        if (s == 0) freeNeighbors.push(n)
        else if (s == sign) friendlyNeighbors.push(n)
    }

    count += freeNeighbors.length
    if (count >= N) return true

    visited[vertex] = true
    return friendlyNeighbors.some(n => hasNLiberties(board, n, N, visited, count, sign))
}

function makePseudoMove(board, sign, vertex) {
    let neighbors = board.getNeighbors(vertex)
    let neighborSigns = neighbors.map(n => board.get(n))

    if (neighborSigns.every(s => s == sign)) {
        return null
    }

    board.set(vertex, sign)

    if (!hasNLiberties(board, vertex, 2)) {
        board.set(vertex, 0)
        return null
    }

    let dead = []

    for (let i = 0; i < neighbors.length; i++) {
        let n = neighbors[i]
        if (neighborSigns[i] != -sign || hasNLiberties(board, n, 1))
            continue

        let chain = board.getChain(n)
        dead.push(...chain)
        chain.forEach(c => board.set(c, 0))
    }

    return dead
}

function fixHoles(board) {
    for (let x = 0; x < board.width; x++) {
        for (let y = 0; y < board.height; y++) {
            let vertex = [x, y]

            if (board.get(vertex) != 0)
                continue

            let neighbors = board.getNeighbors(vertex)
            let sign = board.get(neighbors[0])
            let fix = true

            for (let i = 1; i < neighbors.length; i++) {
                let n = neighbors[i]

                if (board.get(n) != sign) {
                    fix = false
                    break
                }
            }

            if (fix) board.set(vertex, sign)
        }
    }

    return board
}

exports.guess = function(board, scoring = false, iterations = 50) {
    let map = exports.getProbabilityMap(board, iterations)
    let done = {}
    let result = []

    for (let x = 0; x < board.width; x++) {
        for (let y = 0; y < board.height; y++) {
            let vertex = [x, y]
            let sign = board.get(vertex)

            if (sign == 0 || vertex in done) continue

            let chain = board.getChain(vertex)
            let probability = chain.map(v => map[v]).reduce((sum, x) => sum + x) / chain.length
            let newSign = probability < 0.5 ? -1 : probability > 0.5 ? 1 : 0

            if (newSign == -sign) result.push(...chain)

            done[vertex] = true
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
    let done = {}
    let result = []

    for (let i = 0; i < board.width; i++) {
        for (let j = 0; j < board.height; j++) {
            let vertex = [i, j]
            if (map[vertex] != 0 || vertex in done) continue

            let posArea = board.getConnectedComponent(vertex, [0, -1])
            let negArea = board.getConnectedComponent(vertex, [0, 1])
            let posDead = posArea.filter(v => board.get(v) == -1)
            let negDead = negArea.filter(v => board.get(v) == 1)
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

            if (sign == 0) {
                actualArea = board.getChain(vertex)
                actualDead = []
            }

            actualArea.forEach(v => done[v] = true)
            result.push(...actualDead)
        }
    }

    return result
}

exports.playTillEnd = function(board, sign, iterations = null) {
    if (iterations == null) iterations = board.width * board.height
    board = board.clone()

    let freeVertices = []
    let illegalVertices = []

    for (let x = 0; x < board.width; x++) {
        for (let y = 0; y < board.height; y++) {
            if (board.get([x, y]) != 0) continue
            freeVertices.push([x, y])
        }
    }

    let finished = {'-1': false, '1': false}

    while (iterations > 0) {
        if (freeVertices.length == 0 || finished[-sign] && finished[sign])
            break

        let madeMove = false

        while (freeVertices.length > 0) {
            let randomIndex = Math.floor(Math.random() * freeVertices.length)
            let vertex = freeVertices[randomIndex]
            let freedVertices = makePseudoMove(board, sign, vertex, false)

            freeVertices.splice(randomIndex, 1)

            if (freedVertices != null) {
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

    return fixHoles(board).arrangement
}

exports.getProbabilityMap = function(board, iterations) {
    let pmap = []
    let nmap = []
    let result = {}

    for (let i = 0; i < iterations; i++) {
        let sign = Math.sign(Math.random() - 0.5)
        let areaMap = exports.playTillEnd(board, sign)

        for (let j = 0; j < areaMap.length; j++) {
            if (!(j in pmap)) pmap[j] = 0
            if (!(j in nmap)) nmap[j] = 0

            if (areaMap[j] < 0) nmap[j]++
            else if (areaMap[j] > 0) pmap[j]++
        }
    }

    for (let x = 0; x < board.width; x++) {
        for (let y = 0; y < board.height; y++) {
            let v = [x, y]
            let j = board.vertex2index(v)

            if (pmap[j] + nmap[j] == 0) result[v] = 0.5
            else result[v] = pmap[j] / (pmap[j] + nmap[j])
        }
    }

    return result
}
