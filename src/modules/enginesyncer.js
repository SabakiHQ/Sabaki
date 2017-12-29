const gametree = require('./gametree')
const helper = require('./helper')
const {sgf} = require('./fileformats')
const Board = require('./board')
const {Command} = require('./gtp')

async function enginePlay(controller, sign, vertex, engineBoard) {
    let color = sign > 0 ? 'B' : 'W'
    let coord = engineBoard.vertex2coord(vertex)

    let {response} = await controller.sendCommand(new Command(null, 'play', color, coord))
    if (response.error) return null

    return engineBoard.makeMove(sign, vertex)
}

exports.sync = async function(controller, engineState, treePosition) {
    let board = gametree.getBoard(...treePosition)

    if (!board.isSquare()) {
        throw new Error('GTP engines don’t support non-square boards.')
    } else if (!board.isValid()) {
        throw new Error('GTP engines don’t support invalid board positions.')
    }

    // Update komi

    let komi = +gametree.getRootProperty(treePosition[0], 'KM', 0)

    if (engineState == null || komi !== engineState.komi) {
        await controller.sendCommand(new Command(null, 'komi', komi))
    }

    // Incremental board update

    let newEngineState = {komi, board}

    if (engineState != null) {
        let diff = engineState.board.diff(board).filter(v => board.get(v) !== 0)

        if (diff != null) {
            if (diff.length === 0) {
                return newEngineState
            } else if (diff.length === 1) {
                let vertex = diff[0]
                let sign = board.get(vertex)
                let move = await enginePlay(controller, sign, vertex, engineState.board)

                if (move != null && move.getPositionHash() === board.getPositionHash())
                    return newEngineState
            }
        }
    }

    // Replay

    await controller.sendCommand(new Command(null, 'boardsize', board.width))
    await controller.sendCommand(new Command(null, 'clear_board'))
    let engineBoard = new Board(board.width, board.height)

    let tp = [gametree.getRoot(treePosition[0]), 0]

    while (tp != null) {
        let node = tp[0].nodes[tp[1]]
        let error = false

        for (let color of ['B', 'W']) {
            if (!(color in node)) continue

            let sign = color === 'B' ? 1 : -1
            let vertex = sgf.point2vertex(node[color][0])

            engineBoard = await enginePlay(controller, sign, vertex, engineBoard)
            if (engineBoard == null) error = true
        }

        if (error || 'AE' in node && node.AE.length > 0) break

        for (let prop of ['AB', 'AW']) {
            if (!(prop in node)) continue

            let sign = prop === 'AB' ? 1 : -1
            let points = node[prop].map(sgf.compressed2list).reduce((list, x) => [...list, ...x])
            let vertices = points.map(sgf.point2vertex(x))

            for (let vertex of vertices) {
                engineBoard = await enginePlay(controller, sign, vertex, engineBoard)

                if (engineBoard == null) {
                    error = true
                    break
                }
            }

            if (error) break
        }

        if (error || helper.vertexEquals(tp, treePosition)) break

        tp = gametree.navigate(...tp, 1)
    }

    if (engineBoard != null && engineBoard.getPositionHash() === board.getPositionHash())
        return newEngineState

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
