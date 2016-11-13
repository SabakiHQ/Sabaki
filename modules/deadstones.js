const Board = require('./board')

function makeMove(board, sign, vertex) {
    if (board.arrangement[vertex] != 0) return true

    sign = sign > 0 ? 1 : -1
    board.arrangement[vertex] = sign

    let deadNeighbors = board.getNeighbors(vertex)
        .filter(n => board.arrangement[n] == -sign && !board.hasLiberties(n))

    if (deadNeighbors.length <= 1 && !board.hasLiberties(vertex)
    || deadNeighbors.length == 0 && board.getLiberties(vertex).length <= 1) {
        board.arrangement[vertex] = 0
        return true
    }

    deadNeighbors.forEach(n => {
        if (board.arrangement[n] == 0) return
        board.getChain(n).forEach(c => board.arrangement[c] = 0)
    })

    return false
}

exports.guess = function(board, iterations = 10000) {
    return []
}

exports.playTillEnd = function(board, sign, iterations = null) {
    if (iterations == null) iterations = board.width * board.height
    board = board.clone()

    let vertices
    let updateVertices = () => {
        vertices = []

        for (let x = 0; x < board.width; x++) {
            for (let y = 0; y < board.height; y++) {
                if (board.arrangement[[x, y]] != 0) continue
                vertices.push([x, y])
            }
        }
    }

    updateVertices()

    let finished = {'-1': false, '1': false}

    while (iterations > 0) {
        if (vertices.length == 0 && finished['-1'] && finished['1']) {
            return board.getAreaMap()
        } else if (vertices.length == 0) {
            finished[sign] = true
        }

        while (vertices.length > 0) {
            let randomIndex = Math.floor(Math.random() * vertices.length)
            let vertex = vertices[randomIndex]

            vertices.splice(randomIndex, 1)

            if (board.getNeighbors(vertex).every(n => board.arrangement[n] == sign))
                continue

            let illegal = makeMove(board, sign, vertex, false)

            if (!illegal) {
                finished['-1'] = finished['1'] = false
                updateVertices()
                break
            }
        }

        sign = -sign
        iterations--
    }

    return board.getAreaMap()
}
