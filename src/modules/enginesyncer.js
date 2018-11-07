const EventEmitter = require('events')
const {dirname, resolve} = require('path')
const gtp = require('@sabaki/gtp')
const sgf = require('@sabaki/sgf')
const argvsplit = require('argv-split')
const gametree = require('./gametree')
const helper = require('./helper')
const Board = require('./board')

const alpha = 'ABCDEFGHJKLMNOPQRSTUVWXYZ'
const defaultStateJSON = JSON.stringify({
    dirty: true,
    komi: null,
    size: null,
    moves: []
})

function coord2vertex(coord, size) {
    if (coord === 'pass') return null

    let x = alpha.indexOf(coord[0].toUpperCase())
    let y = size - +coord.slice(1)

    return [x, y]
}

class EngineSyncer extends EventEmitter {
    constructor(engine) {
        super()

        let {path, args, commands} = engine

        this.engine = engine
        this.initialized = false
        this.commands = []
        this.state = JSON.parse(defaultStateJSON)

        this.controller = new gtp.Controller(path, argvsplit(args), {
            cwd: dirname(resolve(path))
        })

        this.controller.on('started', () => {
            this.controller.sendCommand({name: 'name'})
            this.controller.sendCommand({name: 'version'})
            this.controller.sendCommand({name: 'protocol_version'})
            this.controller.sendCommand({name: 'list_commands'}).then(response => {
                this.commands = response.content.split('\n')
            }).then(() => {
                this.initialized = true
                this.emit('engine-initialized')
            })

            if (commands == null || commands.trim() === '') return

            for (let command of commands.split(';').filter(x => x.trim() !== '')) {
                this.controller.sendCommand(gtp.Command.fromString(command))
            }
        })

        this.controller.on('stopped', () => {
            this.initialized = false
            this.state = JSON.parse(defaultStateJSON)
        })

        this.controller.on('command-sent', async ({command, getResponse, subscribe}) => {
            // Track engine state

            let res = null

            if (!['lz-genmove_analyze', 'genmove_analyze'].includes(command.name)) {
                res = await getResponse()
                if (res.error) return
            }

            if (command.name === 'boardsize' && command.args.length >= 1) {
                this.state.size = +command.args[0]
                this.state.dirty = true
            } else if (command.name === 'clear_board') {
                this.state.moves = []
                this.state.dirty = false
            } else if (command.name === 'komi' && command.args.length >= 1) {
                this.state.komi = +command.args[0]
            } else if (['fixed_handicap', 'place_free_handicap'].includes(command.name)) {
                let vertices = res.content.trim().split(/\s+/)
                    .map(coord => coord2vertex(coord, this.state.size))
                    .filter(x => x != null)

                if (vertices.length > 0) this.state.moves.push({sign: 1, vertices})
            } else if (command.name === 'set_free_handicap') {
                let vertices = command.args
                    .map(coord => coord2vertex(coord, this.state.size))
                    .filter(x => x != null)

                if (vertices.length > 0) this.state.moves.push({sign: 1, vertices})
            } else if (command.name === 'play' && command.args.length >= 2) {
                let sign = command.args[0][0].toLowerCase() === 'w' ? -1 : 1
                let vertex = coord2vertex(command.args[1], this.state.size)

                if (vertex) this.state.moves.push({sign, vertex})
            } else if (command.name === 'genmove' && command.args.length >= 1) {
                let sign = command.args[0][0].toLowerCase() === 'w' ? -1 : 1
                let vertex = coord2vertex(res.content.trim(), this.state.size)

                if (vertex) this.state.moves.push({sign, vertex})
            } else if (
                ['lz-genmove_analyze', 'genmove_analyze'].includes(command.name)
                && command.args.length >= 1
            ) {
                let sign = command.args[0][0].toLowerCase() === 'w' ? -1 : 1
                let vertex = await new Promise(resolve => {
                    getResponse().then(() => resolve(null))

                    subscribe(({line}) => {
                        let match = line.trim().match(/^play (.*)$/)
                        if (match) resolve(coord2vertex(match[1], this.state.size))
                    })
                })

                if (vertex) this.state.moves.push({sign, vertex})
            } else if (command.name === 'undo') {
                this.state.moves.length -= 1
            } else if (command.name === 'loadsgf') {
                this.state.dirty = true
            }
        })
    }

    async sync(treePosition) {
        let controller = this.controller
        let rootTree = gametree.getRoot(treePosition[0])
        let board = gametree.getBoard(...treePosition)

        if (!board.isSquare()) {
            throw new Error('GTP引擎不支持非方形棋盘。')
        } else if (!board.isValid()) {
            throw new Error('GTP engines don’t support invalid board positions.')
        } else if (board.width > alpha.length) {
            throw new Error(`GTP引擎仅支持棋盘尺寸不超过 ${alpha.length}.`)
        }

        // Update komi

        let komi = +gametree.getRootProperty(rootTree, 'KM', 0)

        if (komi !== this.state.komi) {
            controller.sendCommand({name: 'komi', args: [komi]})
        }

        // Update board size

        if (this.state.dirty || board.width !== this.state.size) {
            controller.sendCommand({name: 'boardsize', args: [board.width]})
            this.state.dirty = true
        }

        // Replay

        async function enginePlay(sign, vertex) {
            let color = sign > 0 ? 'B' : 'W'
            let coord = board.vertex2coord(vertex)
            if (coord == null) return true

            let response = await controller.sendCommand({name: 'play', args: [color, coord]})
            if (response.error) return false

            return true
        }

        let engineBoard = new Board(board.width, board.height)
        let moves = []
        let promises = []
        let synced = true

        for (let tp = [rootTree, 0]; true; tp = gametree.navigate(...tp, 1)) {
            let node = tp[0].nodes[tp[1]]
            let nodeBoard = gametree.getBoard(...tp)
            let placedHandicapStones = false

            if (
                node.AB
                && node.AB.length >= 2
                && engineBoard.isEmpty()
                && this.commands.includes('set_free_handicap')
            ) {
                // Place handicap stones

                let vertices = [].concat(...node.AB.map(sgf.parseCompressedVertices))
                let coords = vertices
                    .map(v => board.vertex2coord(v))
                    .filter(x => x != null)
                    .sort()
                    .filter((x, i, arr) => i === 0 || x !== arr[i - 1])

                if (coords.length > 0) {
                    moves.push({sign: 1, vertices})
                    promises.push(() =>
                        controller
                        .sendCommand({name: 'set_free_handicap', args: coords})
                        .then(r => !r.error)
                    )

                    for (let vertex of vertices) {
                        if (engineBoard.get(vertex) !== 0) continue

                        engineBoard = engineBoard.makeMove(1, vertex)
                    }

                    placedHandicapStones = true
                }
            }

            for (let prop of ['B', 'W', 'AB', 'AW']) {
                if (!(prop in node) || placedHandicapStones && prop === 'AB') continue

                let sign = prop.slice(-1) === 'B' ? 1 : -1
                let vertices = [].concat(...node[prop].map(sgf.parseCompressedVertices))

                for (let vertex of vertices) {
                    if (engineBoard.get(vertex) !== 0) continue

                    moves.push({sign, vertex})
                    promises.push(() => enginePlay(sign, vertex))
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
            let sharedHistoryLength = [...Array(Math.min(this.state.moves.length, moves.length))]
                .findIndex((_, i) => !helper.equals(moves[i], this.state.moves[i]))
            if (sharedHistoryLength < 0) sharedHistoryLength = Math.min(this.state.moves.length, moves.length)
            let undoLength = this.state.moves.length - sharedHistoryLength

            if (
                !this.state.dirty
                && sharedHistoryLength > 0
                && undoLength < sharedHistoryLength
                && (this.commands.includes('undo') || undoLength === 0)
            ) {
                // Undo until shared history is reached, then play out rest

                promises = [
                    ...[...Array(undoLength)].map(() =>
                        () => controller.sendCommand({name: 'undo'}).then(r => !r.error)
                    ),
                    ...promises.slice(sharedHistoryLength)
                ]
            } else {
                // Replay from beginning

                controller.sendCommand({name: 'clear_board'})
            }

            let result = await Promise.all(promises.map(x => x()))
            let success = result.every(x => x)
            if (success) return
        }

        // Incremental rearrangement

        if (!this.state.dirty) {
            promises = []
            engineBoard = new Board(board.width, board.height)

            for (let {sign, vertex} of this.state.moves) {
                engineBoard = engineBoard.makeMove(sign, vertex)
            }

            let diff = engineBoard.diff(board).filter(v => board.get(v) !== 0)

            for (let vertex of diff) {
                let sign = board.get(vertex)

                promises.push(() => enginePlay(sign, vertex))
                engineBoard = engineBoard.makeMove(board.get(vertex), vertex)
            }

            if (engineBoard.getPositionHash() === board.getPositionHash()) {
                let result = await Promise.all(promises.map(x => x()))
                let success = result.every(x => x)
                if (success) return
            }
        }

        // Complete rearrangement

        promises = []
        engineBoard = new Board(board.width, board.height)
        controller.sendCommand({name: 'clear_board'})

        for (let x = 0; x < board.width; x++) {
            for (let y = 0; y < board.height; y++) {
                let vertex = [x, y]
                let sign = board.get(vertex)
                if (sign === 0) continue

                promises.push(() => enginePlay(sign, vertex))
                engineBoard = engineBoard.makeMove(sign, vertex)
            }
        }

        if (engineBoard.getPositionHash() === board.getPositionHash()) {
            let result = await Promise.all(promises.map(x => x()))
            let success = result.every(x => x)
            if (success) return
        }

        throw new Error('GTP引擎无法在当前棋盘重新创建布局。')
    }
}

module.exports = EngineSyncer
