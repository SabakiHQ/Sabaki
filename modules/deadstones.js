const Board = require('./board')

function hasTwoLiberties(board, vertex, visited = [], count = 0) {
    let sign = board.arrangement[vertex]
    if (!board.hasVertex(vertex) || sign == 0) return false

    if (visited.some(v => v[0] == vertex[0] && v[1] == vertex[1]))
        return false

    let neighbors = board.getNeighbors(vertex)
    let freeNeighbors = neighbors.filter(n => board.arrangement[n] == 0)

    count += freeNeighbors.length
    if (count >= 2) return true

    visited.push(vertex)

    return neighbors
    .filter(n => board.arrangement[n] == sign)
    .some(n => hasTwoLiberties(board, n, visited, count))
}

function makeMove(board, sign, vertex) {
    if (board.arrangement[vertex] != 0) return null

    sign = sign > 0 ? 1 : -1
    board.arrangement[vertex] = sign

    let deadNeighbors = board.getNeighbors(vertex)
        .filter(n => board.arrangement[n] == -sign && !board.hasLiberties(n))

    if (deadNeighbors.length <= 1 && !board.hasLiberties(vertex)
    || deadNeighbors.length == 0 && !hasTwoLiberties(board, vertex)) {
        board.arrangement[vertex] = 0
        return null
    }

    let dead = []

    deadNeighbors.forEach(n => {
        if (board.arrangement[n] == 0) return

        let chain = board.getChain(n)
        dead.push(...chain)
        chain.forEach(c => board.arrangement[c] = 0)
    })

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
        if (freeVertices.length == 0 && finished['-1'] && finished['1']) {
            return board.getAreaMap()
        } else if (freeVertices.length == 0) {
            finished[sign] = true
        }

        while (freeVertices.length > 0) {
            let randomIndex = Math.floor(Math.random() * freeVertices.length)
            let vertex = freeVertices[randomIndex]

            freeVertices.splice(randomIndex, 1)

            if (board.getNeighbors(vertex).every(n => board.arrangement[n] == sign))
                continue

            let result = makeMove(board, sign, vertex, false)

            if (result != null) {
                finished['-1'] = finished['1'] = false
                freeVertices.push(...result)
                break
            }
        }

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
        result[v] = pmap[v] / (pmap[v] + nmap[v])
    }

    return result
}
