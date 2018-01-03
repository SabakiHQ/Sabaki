const gametree = require('./gametree')
const helper = require('./helper')
const {sgf} = require('./fileformats')
const Board = require('./board')
const {Command} = require('./gtp')

async function enginePlay(controller, sign, vertex, board) {
    let color = sign > 0 ? 'B' : 'W'
    let coord = board.vertex2coord(vertex)
    if (coord == null) return true

    let response = await controller.sendCommand(new Command(null, 'play', color, coord))
    if (response.error) return false

    return true
}

exports.sync = async function(controller, engineState, treePosition) {
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
        controller.sendCommand(new Command(null, 'komi', komi))
    }

    // See if we need to update board

    let newEngineState = {komi, board}

    if (engineState != null && engineState.board.getPositionHash() === board.getPositionHash()) {
        return newEngineState
    }

    // Incremental board update

    if (engineState != null) {
        let diff = engineState.board.diff(board).filter(v => board.get(v) !== 0)

        if (diff != null && diff.length === 1) {
            let [vertex] = diff
            let sign = board.get(vertex)
            let move = engineState.board.makeMove(sign, vertex)

            if (move.getPositionHash() === board.getPositionHash()) {
                let success = await enginePlay(controller, sign, vertex, engineState.board)
                if (success) return newEngineState
            }
        }
    }

    // Replay

    controller.sendCommand(new Command(null, 'boardsize', board.width))
    controller.sendCommand(new Command(null, 'clear_board'))

    let engineBoard = new Board(board.width, board.height)
    let promises = []
    let synced = true

    for (let tp = [rootTree, 0]; true; tp = gametree.navigate(...tp, 1)) {
        let node = tp[0].nodes[tp[1]]
        let nodeBoard = gametree.getBoard(...tp)

        for (let prop of ['B', 'W', 'AB', 'AW']) {
            if (!(prop in node)) continue

            let sign = prop.slice(-1) === 'B' ? 1 : -1
            let vertices = node[prop].map(sgf.compressed2list).reduce((list, x) => [...list, ...x])

            for (let vertex of vertices) {
                promises.push(enginePlay(controller, sign, vertex, engineBoard))
                engineBoard = engineBoard.makeMove(sign, vertex)
            }
        }

        if (engineBoard.getPositionHash() !== nodeBoard.getPositionHash()) {
            synced = false
            break
        }

        if (helper.vertexEquals(tp, treePosition)) break
    }

    if (synced) {
        let result = await Promise.all(promises)
        let success = result.every(x => x)

        if (success) return newEngineState
    }

    // Rearrangement

    controller.sendCommand(new Command(null, 'boardsize', board.width))
    controller.sendCommand(new Command(null, 'clear_board'))

    engineBoard = new Board(board.width, board.height)
    promises = []

    for (let x = 0; x < board.width; x++) {
        if (engineBoard == null) break

        for (let y = 0; y < board.height; y++) {
            let vertex = [x, y]
            let sign = board.get(vertex)
            if (sign === 0) continue

            promises.push(enginePlay(controller, sign, vertex, engineBoard))
            engineBoard = engineBoard.makeMove(sign, vertex)
        }
    }

    if (engineBoard.getPositionHash() === board.getPositionHash()) {
        let result = await Promise.all(promises)
        let success = result.every(x => x)

        if (success) return newEngineState
    }

    throw new Error('Current board arrangement can’t be recreated on the GTP engine.')
}
