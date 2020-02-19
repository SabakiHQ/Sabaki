import {remote} from 'electron'
import EventEmitter from 'events'
import {dirname, resolve} from 'path'
import argvsplit from 'argv-split'
import uuid from 'uuid/v4'

import {fromDimensions as newBoard} from '@sabaki/go-board'
import {Controller, ControllerStateTracker, Command} from '@sabaki/gtp'
import {parseCompressedVertices} from '@sabaki/sgf'

import {getBoard, getRootProperty} from './gametree.js'
import {noop, equals} from './helper.js'

const setting = remote.require('./setting')
const alpha = 'ABCDEFGHJKLMNOPQRSTUVWXYZ'
const quitTimeout = setting.get('gtp.engine_quit_timeout')

function parseVertex(coord, size) {
  if (coord == null || coord === 'resign') return null
  if (coord === 'pass') return [-1, -1]

  let x = alpha.indexOf(coord[0].toUpperCase())
  let y = size - +coord.slice(1)

  return [x, y]
}

export class EngineSyncer extends EventEmitter {
  constructor(engine) {
    super()

    let {path, args, commands} = engine

    this._busy = false
    this._suspended = true

    this.id = uuid()
    this.engine = engine
    this.commands = []
    this.treePosition = null
    this.analysis = null

    this.controller = new Controller(path, [...argvsplit(args)], {
      cwd: dirname(resolve(path))
    })

    this.stateTracker = new ControllerStateTracker(this.controller)

    this.controller.on('started', () => {
      this.treePosition = null
      this.analysis = null

      Promise.all([
        this.controller.sendCommand({name: 'name'}),
        this.controller.sendCommand({name: 'version'}),
        this.controller.sendCommand({name: 'protocol_version'}),
        this.controller.sendCommand({name: 'list_commands'}).then(response => {
          this.commands = response.content.split('\n')
        }),
        ...(commands != null && commands.trim() !== ''
          ? commands
              .split(';')
              .filter(x => x.trim() !== '')
              .map(command =>
                this.controller.sendCommand(Command.fromString(command))
              )
          : [])
      ]).catch(noop)
    })

    this.controller.on('stopped', () => {
      this.treePosition = null
      this.analysis = null
    })

    this.controller.on(
      'command-sent',
      async ({command, subscribe, getResponse}) => {
        subscribe(({line}) => {
          // Parse analysis info

          if (
            command.name.match(/^(lz-)?(genmove_)?analyze$/) == null ||
            command.args.length === 0 ||
            !line.startsWith('info ')
          )
            return

          let boardsize = this.stateTracker.state.boardsize || [19, 19]
          let board = newBoard(...boardsize)
          let sign = command.args[0].toUpperCase() === 'W' ? -1 : 1

          let variations = line
            .split(/\s*info\s+/)
            .slice(1)
            .map(x => x.trim())
            .map(x => {
              let matchPV = x.match(
                /(pass|[A-Za-z]\d+)(\s+(pass|[A-Za-z]\d+))*$/
              )
              if (matchPV == null) return null

              let passIndex = matchPV[0].indexOf('pass')
              if (passIndex < 0) passIndex = Infinity

              return [
                x
                  .slice(0, matchPV.index)
                  .trim()
                  .split(/\s+/)
                  .slice(0, -1),
                matchPV[0]
                  .slice(0, passIndex)
                  .split(/\s+/)
                  .filter(x => x.length >= 2)
              ]
            })
            .filter(x => x != null)
            .map(([tokens, pv]) => {
              let keys = tokens.filter((_, i) => i % 2 === 0)
              let values = tokens.filter((_, i) => i % 2 === 1)

              keys.push('pv')
              values.push(pv)

              return keys.reduce((acc, x, i) => ((acc[x] = values[i]), acc), {})
            })
            .filter(({move}) => move.match(/^[A-Za-z]\d+$/))
            .map(({move, visits, winrate, pv}) => ({
              vertex: board.parseVertex(move),
              visits: +visits,
              winrate: +winrate / 100,
              moves: pv.map(x => board.parseVertex(x))
            }))

          this.analysis = {
            sign,
            variations,
            winrate: Math.max(...variations.map(({winrate}) => winrate))
          }
        })

        if (this.treePosition == null) return

        let prevHistory = JSON.parse(
          JSON.stringify(this.stateTracker.state.history)
        )

        await getResponse()

        if (!equals(prevHistory, this.stateTracker.state.history)) {
          this.treePosition = null
          this.analysis = null
        }
      }
    )

    // Sync properties

    for (let eventName of [
      'started',
      'stopped',
      'command-sent',
      'response-received'
    ]) {
      this.controller.on(eventName, () => {
        this.busy = this.controller.busy
        this.suspended = this.controller.process == null
      })
    }
  }

  get state() {
    return this.stateTracker.state
  }

  get busy() {
    return this._busy
  }

  set busy(value) {
    if (value !== this._busy) {
      this._busy = value
      this.emit('busy-changed')
    }
  }

  get suspended() {
    return this._suspended
  }

  set suspended(value) {
    if (value !== this._suspended) {
      this._suspended = value
      this.emit('suspended-changed')
    }
  }

  start() {
    this.controller.start()
  }

  async stop() {
    await this.controller.stop(quitTimeout)
  }

  async sync(tree, id) {
    let board = getBoard(tree, id)

    if (!board.isValid()) {
      throw new Error('GTP engines don’t support invalid board positions.')
    } else if (Math.max(board.width, board.height) > alpha.length) {
      throw new Error(
        `GTP engines only support board sizes that don’t exceed ${alpha.length}.`
      )
    }

    let komi = +getRootProperty(tree, 'KM', 0)
    let boardsize = [board.width, board.height]

    // Replay

    let nodeBoard = getBoard(tree, id)
    let engineBoard = newBoard(board.width, board.height)
    let history = []
    let boardSynced = true
    let nodes = [...tree.listNodesVertically(id, -1, {})].reverse()

    for (let node of nodes) {
      let placedHandicapStones = false

      if (
        node.data.AB &&
        node.data.AB.length >= 2 &&
        engineBoard.isEmpty() &&
        (await this.stateTracker.knowsCommand('set_free_handicap'))
      ) {
        // Place handicap stones

        let vertices = []
          .concat(...node.data.AB.map(parseCompressedVertices))
          .sort()
        let coords = vertices
          .map(v => board.stringifyVertex(v))
          .filter(x => x != null)
          .filter((x, i, arr) => i === 0 || x !== arr[i - 1])

        if (coords.length > 0) {
          history.push({name: 'set_free_handicap', args: coords})

          for (let vertex of vertices) {
            if (engineBoard.get(vertex) !== 0) continue

            engineBoard = engineBoard.makeMove(1, vertex)
          }

          placedHandicapStones = true
        }
      }

      for (let prop of ['B', 'W', 'AB', 'AW']) {
        if (node.data[prop] == null || (placedHandicapStones && prop === 'AB'))
          continue

        let color = prop.slice(-1)
        let sign = color === 'B' ? 1 : -1
        let vertices = [].concat(
          ...node.data[prop].map(parseCompressedVertices)
        )

        for (let vertex of vertices) {
          if (engineBoard.has(vertex) && engineBoard.get(vertex) !== 0) continue

          let coord = !engineBoard.has(vertex)
            ? 'pass'
            : board.stringifyVertex(vertex)

          history.push({name: 'play', args: [color, coord]})
          engineBoard = engineBoard.makeMove(sign, vertex)
        }
      }
    }

    if (!equals(engineBoard.signMap, nodeBoard.signMap)) {
      boardSynced = false
    }

    // Incremental rearrangement

    if (!boardSynced) {
      history = [...this.state.history]
      engineBoard = newBoard(board.width, board.height)

      for (let command of this.state.history) {
        if (command.name === 'play') {
          let [color, coord] = command.args
          let sign = color.toUpperCase() === 'B' ? 1 : -1

          engineBoard = engineBoard.makeMove(
            sign,
            parseVertex(coord, boardsize)
          )
        } else if (command.name === 'set_free_handicap') {
          for (let coord of command.args) {
            engineBoard = engineBoard.makeMove(1, parseVertex(coord, boardsize))
          }
        }
      }

      let diff = engineBoard.diff(board).filter(v => board.get(v) !== 0)

      for (let vertex of diff) {
        let sign = board.get(vertex)
        let color = sign > 0 ? 'B' : 'W'
        let coord = board.stringifyVertex(vertex)

        history.push({name: 'play', args: [color, coord]})
        engineBoard = engineBoard.makeMove(sign, vertex)
      }

      if (equals(engineBoard.signMap, board.signMap)) {
        boardSynced = true
      }
    }

    // Complete rearrangement

    if (!boardSynced) {
      history = []
      engineBoard = newBoard(board.width, board.height)

      for (let x = 0; x < board.width; x++) {
        for (let y = 0; y < board.height; y++) {
          let vertex = [x, y]
          let sign = board.get(vertex)
          let color = sign > 0 ? 'B' : 'W'
          if (sign === 0) continue

          history.push({
            name: 'play',
            args: [color, board.stringifyVertex(vertex)]
          })
          engineBoard = engineBoard.makeMove(sign, vertex)
        }
      }

      if (equals(engineBoard.signMap, board.signMap)) {
        boardSynced = true
      }
    }

    if (!boardSynced) {
      throw new Error(
        'Current board arrangement can’t be recreated on the GTP engine.'
      )
    }

    try {
      await this.stateTracker.sync({komi, boardsize, history})
    } catch (err) {
      throw new Error('GTP engine can’t be synced to current state.')
    }

    this.treePosition = id
    this.analysis = null
  }
}
