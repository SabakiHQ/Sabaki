const gametree = require('./gametree')
const helper = require('./helper')
const {sgf} = require('./fileformats')
const Board = require('./board')
const {Command} = require('./gtp')

async function enginePlay(controller, sign, vertex, engineBoard) {
    let color = sign > 0 ? 'B' : 'W'
    let coord = engineBoard.vertex2coord(vertex)
    if (coord == null) return engineBoard

    let response = await controller.sendCommand(new Command(null, 'play', color, coord))
    if (response.error) return null

    return engineBoard.makeMove(sign, vertex)
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

    let komi = +gametree.getRootProperty(rootTree, 'KM', 0)

    if (engineState == null || komi !== engineState.komi) {
        await controller.sendCommand(new Command(null, 'komi', komi))
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
            let move = await enginePlay(controller, sign, vertex, engineState.board)

            if (move != null && move.getPositionHash() === board.getPositionHash())
                return newEngineState
        }
    }

    // Replay

    await controller.sendCommand(new Command(null, 'boardsize', board.width))
    await controller.sendCommand(new Command(null, 'clear_board'))
    let engineBoard = new Board(board.width, board.height)

    let synced = true

    for (let tp = [rootTree, 0]; true; tp = gametree.navigate(...tp, 1)) {
        let node = tp[0].nodes[tp[1]]
        let nodeBoard = gametree.getBoard(...tp)

        for (let color of ['B', 'W']) {
            if (!(color in node)) continue

            let sign = color === 'B' ? 1 : -1
            let vertex = sgf.point2vertex(node[color][0])

            engineBoard = await enginePlay(controller, sign, vertex, engineBoard)
            if (engineBoard == null) synced = false
        }

        if (!synced) break

        for (let prop of ['AB', 'AW']) {
            if (!(prop in node)) continue

            let sign = prop === 'AB' ? 1 : -1
            let vertices = node[prop].map(sgf.compressed2list).reduce((list, x) => [...list, ...x])

            for (let vertex of vertices) {
                engineBoard = await enginePlay(controller, sign, vertex, engineBoard)

                if (engineBoard == null) {
                    synced = false
                    break
                }
            }

            if (!synced) break
        }

        if (engineBoard == null || engineBoard.getPositionHash() !== nodeBoard.getPositionHash()) {
            synced = false
            break
        }

        if (helper.vertexEquals(tp, treePosition)) break
    }

    if (synced) return newEngineState

    // Rearrangement

    await controller.sendCommand(new Command(null, 'boardsize', board.width))
    await controller.sendCommand(new Command(null, 'clear_board'))
    engineBoard = new Board(board.width, board.height)

    for (let x = 0; x < board.width; x++) {
        if (engineBoard == null) break

        for (let y = 0; y < board.height; y++) {
            let vertex = [x, y]
            let sign = board.get(vertex)
            if (sign === 0) continue

            engineBoard = await enginePlay(controller, sign, vertex, engineBoard)
            if (engineBoard == null) break
        }
    }

    if (engineBoard != null && engineBoard.getPositionHash() === board.getPositionHash())
        return newEngineState

    throw new Error('Current board arrangement can’t be recreated on the GTP engine.')
}
