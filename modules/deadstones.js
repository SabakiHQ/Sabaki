const Board = require('./board')

function hasNLiberties(board, vertex, N, visited = [], count = 0) {
    let sign = board.arrangement[vertex.join(',')]

    if (visited.some(v => v[0] == vertex[0] && v[1] == vertex[1]))
        return false

    let neighbors = board.getNeighbors(vertex)
    let freeNeighbors = []
    let friendlyNeighbors = []

    for (let i = 0; i < neighbors.length; i++) {
        let n = neighbors[i]
        let s = board.arrangement[n.join(',')]

        if (s == 0) freeNeighbors.push(n)
        else if (s == sign) friendlyNeighbors.push(n)
    }

    count += freeNeighbors.length
    if (count >= N) return true

    visited.push(vertex)

    return friendlyNeighbors.some(n => hasNLiberties(board, n, N, visited, count))
}

function makeMove(board, sign, vertex) {
    let neighbors = board.getNeighbors(vertex)

    if (neighbors.every(n => board.arrangement[n.join(',')] == sign)) {
        return null
    }

    board.arrangement[vertex] = sign

    if (!hasNLiberties(board, vertex, 2)) {
        board.arrangement[vertex] = 0
        return null
    }

    let dead = []

    for (let i = 0; i < neighbors.length; i++) {
        let n = neighbors[i]
        if (board.arrangement[n.join(',')] != -sign || hasNLiberties(board, n, 1)) return

        let chain = board.getChain(n)
        dead.push(...chain)
        chain.forEach(c => board.arrangement[c] = 0)
    }

    return dead
}

exports.guess = function(board, iterations = 10000) {
    return []
}

exports.playTillEnd = function(board, sign, iterations = null) {
    if (iterations == null) iterations = board.width * board.height
    board = board.clone()

    let freeVertices = []
    let illegalVertices = []

    for (let x = 0; x < board.width; x++) {
        for (let y = 0; y < board.height; y++) {
            if (board.arrangement[[x, y]] != 0) continue
            freeVertices.push([x, y])
        }
    }

    let finished = {'-1': false, '1': false}

    while (iterations > 0) {
        if (freeVertices.length == 0 || finished[-sign] && finished[sign]) {
            return board.getAreaMap()
        }

        let madeMove = false

        while (freeVertices.length > 0) {
            let randomIndex = Math.floor(Math.random() * freeVertices.length)
            let vertex = freeVertices[randomIndex]
            let freedVertices = makeMove(board, sign, vertex, false)

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

    return board.getAreaMap()
}

exports.getProbabilityMap = function(board, iterations = 5) {
    let pmap = {}
    let nmap = {}
    let result = {}

    for (let i = 0; i < iterations; i++) {
        let sign = Math.sign(Math.random() - 0.5)
        let areaMap = exports.playTillEnd(board, sign)

        for (let v in areaMap) {
            if (!(v in pmap)) pmap[v] = 0
            if (!(v in nmap)) nmap[v] = 0

            if (areaMap[v] < 0) nmap[v]++
            else if (areaMap[v] > 0) pmap[v]++
        }
    }

    for (let v in pmap) {
        if (pmap[v] + nmap[v] == 0) result[v] = 0.5
        else result[v] = pmap[v] / (pmap[v] + nmap[v])
    }

    return result
}
