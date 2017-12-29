const gametree = require('../gametree')
const Command = require('./command')

module.exports = async function(controller, engineBoard, treePosition) {
    let board = gametree.getBoard(...treePosition)

    if (!board.isSquare()) {
        throw new Error('GTP engines don’t support non-square boards.')
    } else if (!board.isValid()) {
        throw new Error('GTP engines don’t support invalid board positions.')
    }

    let synced = false

    // Incremental board update

    let diff = engineBoard.diff(board).filter(v => board.get(v) !== 0)

    if (diff != null && diff.length === 0) {
        return
    } else if (diff != null && diff.length === 1) {
        let vertex = diff[0]
        let sign = board.get(vertex)
        let move = engineBoard.makeMove(sign, vertex)

        if (move != null && move.getPositionHash() === board.getPositionHash()) {
            // Incremental board update possible

            let color = sign > 0 ? 'B' : 'W'
            let point = board.vertex2coord(vertex)

            let {response} = await controller.sendCommand(new Command(null, 'play', color, point))
            if (!response.error) return
        }
    }

    // TODO
}
