const sgf = require('@sabaki/sgf')
const gametree = require('./gametree')
const helper = require('./helper')
const Board = require('./board')

async function setHandicapStones(controller, vertices, board) {
    let coords = vertices.map(v => board.vertex2coord(v))
        .filter(x => x != null)
        .sort()
        .filter((x, i, arr) => i === 0 || x !== arr[i - 1])

    let response = await controller.sendCommand({name: 'set_free_handicap', args: coords})
    if (!response.error) return true

    let responses = await Promises.all(
        coords.map(coord => controller.sendCommand({
            name: 'play',
            args: ['B', coord]
        }))
    )
    if (!responses.some(response => response.error)) return true

    return false
}

async function enginePlay(controller, sign, vertex, board) {
    let color = sign > 0 ? 'B' : 'W'
    let coord = board.vertex2coord(vertex)
    if (coord == null) return true

    let response = await controller.sendCommand({name: 'play', args: [color, coord]})
    if (response.error) return false

    return true
}

exports.sync = async function(controller, engineState, treePosition, {useUndo = true} = {}) {
    let rootTree = gametree.getRoot(treePosition[0])
    let board = gametree.getBoard(...treePosition)

    if (!board.isSquare()) {
        throw new Error('GTP engines don’t support non-square boards.')
    } else if (!board.isValid()) {
        throw new Error('GTP engines don’t support invalid board positions.')
    }

    // Update komi

    let komi = gametree.getRootProperty(rootTree, 'KM', 0)

    if (engineState == null || komi !== engineState.komi) {
        controller.sendCommand({name: 'komi', args: [komi]})
    }

    // Update board size

    if (engineState == null || board.width !== engineState.size) {
        controller.sendCommand({name: 'boardsize', args: [board.width]})
        engineState = {komi, size: board.width, moves: []}
    }

    // Replay

    let engineBoard = new Board(board.width, board.height)
    let moves = []
    let promises = []
    let synced = true

    for (let tp = [rootTree, 0]; true; tp = gametree.navigate(...tp, 1)) {
        let node = tp[0].nodes[tp[1]]
        let nodeBoard = gametree.getBoard(...tp)
        let placedHandicapStones = false

        if (engineBoard.isEmpty() && node.AB && node.AB.length >= 2) {
            // Place handicap stones

            let vertices = [].concat(...node.AB.map(sgf.parseCompressedVertices))

            promises.push(() => setHandicapStones(controller, vertices, engineBoard))
            moves.push({sign: 1, vertices})

            for (let vertex of vertices) {
                if (engineBoard.get(vertex) !== 0) continue

                engineBoard = engineBoard.makeMove(1, vertex)
            }

            placedHandicapStones = true
        }

        for (let prop of ['B', 'W', 'AB', 'AW']) {
            if (!(prop in node) || placedHandicapStones && prop === 'AB') continue

            let sign = prop.slice(-1) === 'B' ? 1 : -1
            let vertices = [].concat(...node[prop].map(sgf.parseCompressedVertices))

            for (let vertex of vertices) {
                if (engineBoard.get(vertex) !== 0) continue

                promises.push(() => enginePlay(controller, sign, vertex, engineBoard))
                engineBoard = engineBoard.makeMove(sign, vertex)
                moves.push({sign, vertex})
            }
        }

        if (engineBoard.getPositionHash() !== nodeBoard.getPositionHash()) {
            synced = false
            break
        }

        if (helper.vertexEquals(tp, treePosition)) break
    }

    if (synced) {
        let sharedHistoryLength = [...Array(Math.min(engineState.moves.length, moves.length))]
            .findIndex((_, i) => JSON.stringify(moves[i]) !== JSON.stringify(engineState.moves[i]))
        if (sharedHistoryLength < 0) sharedHistoryLength = Math.min(engineState.moves.length, moves.length)

        if (
            useUndo
            && sharedHistoryLength > 1
            && engineState.moves.length > sharedHistoryLength
            && engineState.moves.length < 2 * sharedHistoryLength
        ) {
            let n = engineState.moves.length - sharedHistoryLength

            promises = [
                ...[...Array(n)].map(() =>
                    () => controller.sendCommand({name: 'undo'}).then(r => !r.error)
                ),
                ...promises.slice(sharedHistoryLength)
            ]
        } else if (
            sharedHistoryLength > 0 &&
            engineState.moves.length === sharedHistoryLength
        ) {
            promises = promises.slice(sharedHistoryLength)
        } else {
            controller.sendCommand({name: 'clear_board'})
        }

        let result = await Promise.all(promises.map(x => x()))
        let success = result.every(x => x)

        if (success) return {komi, size: board.width, moves}
    }

    // Rearrangement

    controller.sendCommand({name: 'clear_board'})

    engineBoard = new Board(board.width, board.height)
    promises = []
    moves = []

    for (let x = 0; x < board.width; x++) {
        for (let y = 0; y < board.height; y++) {
            let vertex = [x, y]
            let sign = board.get(vertex)
            if (sign === 0) continue

            promises.push(() => enginePlay(controller, sign, vertex, engineBoard))
            engineBoard = engineBoard.makeMove(sign, vertex)
            moves.push({sign, vertex})
        }
    }

    if (engineBoard.getPositionHash() === board.getPositionHash()) {
        let result = await Promise.all(promises.map(x => x()))
        let success = result.every(x => x)

        if (success) return {komi, size: board.width, moves}
    }

    throw new Error('Current board arrangement can’t be recreated on the GTP engine.')
}
