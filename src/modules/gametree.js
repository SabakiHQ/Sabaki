import {fromDimensions} from '@sabaki/go-board'
import GameTree from '@sabaki/immutable-gametree'
import {
  stringifyVertex,
  parseVertex,
  parseCompressedVertices
} from '@sabaki/sgf'
import * as helper from './helper.js'

const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

let boardCache = {}

function nodeMerger(node, data) {
  if (
    (data.B == null || node.data.B == null || data.B[0] !== node.data.B[0]) &&
    (data.W == null || node.data.W == null || data.W[0] !== node.data.W[0])
  )
    return null

  return {...data, ...node.data}
}

const _new = function(options = {}) {
  return new GameTree({
    ...options,
    getId: helper.getId,
    merger: nodeMerger
  })
}
export {_new as new}

export function getRootProperty(tree, property, fallback = null) {
  let result = ''
  if (property in tree.root.data) result = tree.root.data[property][0]

  return result === '' ? fallback : result
}

export function getGameInfo(tree) {
  let komi = getRootProperty(tree, 'KM')
  if (komi != null && !isNaN(komi)) komi = +komi
  else komi = null

  let size = getRootProperty(tree, 'SZ')
  if (size == null) {
    size = [19, 19]
  } else {
    let s = size.toString().split(':')
    size = [+s[0], +s[s.length - 1]]
  }

  let handicap = getRootProperty(tree, 'HA', 0)
  handicap = Math.max(1, Math.min(9, Math.round(handicap)))
  if (handicap === 1) handicap = 0

  let playerNames = ['B', 'W'].map(
    x => getRootProperty(tree, `P${x}`) || getRootProperty(tree, `${x}T`)
  )

  let playerRanks = ['BR', 'WR'].map(x => getRootProperty(tree, x))

  return {
    playerNames,
    playerRanks,
    blackName: playerNames[0],
    blackRank: playerRanks[0],
    whiteName: playerNames[1],
    whiteRank: playerRanks[1],
    gameName: getRootProperty(tree, 'GN'),
    eventName: getRootProperty(tree, 'EV'),
    gameComment: getRootProperty(tree, 'GC'),
    date: getRootProperty(tree, 'DT'),
    result: getRootProperty(tree, 'RE'),
    komi,
    handicap,
    size
  }
}

export function setGameInfo(tree, data) {
  let newTree = tree.mutate(draft => {
    if ('size' in data) {
      // Update board size

      if (data.size) {
        let value = data.size
        value = value.map(x =>
          isNaN(x) || !x ? 19 : Math.min(25, Math.max(2, x))
        )

        if (value[0] === value[1]) value = value[0].toString()
        else value = value.join(':')

        draft.updateProperty(draft.root.id, 'SZ', [value])
      } else {
        draft.removeProperty(draft.root.id, 'SZ')
      }
    }
  })

  return newTree.mutate(draft => {
    let props = {
      blackName: 'PB',
      blackRank: 'BR',
      whiteName: 'PW',
      whiteRank: 'WR',
      gameName: 'GN',
      eventName: 'EV',
      gameComment: 'GC',
      date: 'DT',
      result: 'RE',
      komi: 'KM',
      handicap: 'HA'
    }

    for (let key in props) {
      if (!(key in data)) continue
      let value = data[key]

      if (value && value.toString() !== '') {
        if (key === 'komi') {
          if (isNaN(value)) value = 0
        } else if (key === 'handicap') {
          let board = getBoard(newTree, newTree.root.id)
          let stones = board.getHandicapPlacement(+value)

          value = stones.length
          if (value <= 1) {
            draft.removeProperty(draft.root.id, props[key])
            draft.removeProperty(draft.root.id, 'AB')
            continue
          }

          draft.updateProperty(draft.root.id, 'AB', stones.map(stringifyVertex))
        }

        draft.updateProperty(draft.root.id, props[key], [value.toString()])
      } else {
        draft.removeProperty(draft.root.id, props[key])
      }
    }
  })
}

export function getMatrixDict(tree) {
  let matrix = [...Array(tree.getHeight() + 1)].map(_ => [])
  let dict = {}

  let inner = (node, matrix, dict, xshift, yshift) => {
    let sequence = [...tree.getSequence(node.id)]
    let hasCollisions = true

    while (hasCollisions) {
      hasCollisions = false

      for (let y = 0; y <= sequence.length; y++) {
        if (xshift >= matrix[yshift + y].length - (y === sequence.length))
          continue

        hasCollisions = true
        xshift++
        break
      }
    }

    for (let y = 0; y < sequence.length; y++) {
      matrix[yshift + y][xshift] = sequence[y].id
      dict[sequence[y].id] = [xshift, yshift + y]
    }

    let lastSequenceNode = sequence.slice(-1)[0]

    for (let k = 0; k < lastSequenceNode.children.length; k++) {
      let child = lastSequenceNode.children[k]
      inner(child, matrix, dict, xshift + k, yshift + sequence.length)
    }

    return [matrix, dict]
  }

  return inner(tree.root, matrix, dict, 0, 0)
}

export function getMatrixWidth(y, matrix) {
  let keys = [...Array(10)]
    .map((_, i) => i + y - 4)
    .filter(i => i >= 0 && i < matrix.length)

  let padding = Math.min(
    ...keys.map(i => {
      for (let j = 0; j < matrix[i].length; j++)
        if (matrix[i][j] != null) return j
      return 0
    })
  )

  let width = Math.max(...keys.map(i => matrix[i].length)) - padding

  return [width, padding]
}

export function getBoard(tree, id) {
  let treePositions = []
  let board = null

  for (let node of tree.listNodesVertically(id, -1, {})) {
    if (boardCache[node.id] != null && node.id !== id) {
      board = boardCache[node.id]
      break
    }

    treePositions.unshift(node.id)
  }

  if (!board) {
    let size = [19, 19]

    if (tree.root.data.SZ != null) {
      let value = tree.root.data.SZ[0]

      if (value.includes(':')) size = value.split(':')
      else size = [value, value]

      size = size.map(x => (isNaN(x) ? 19 : +x))
    }

    board = fromDimensions(...size)
  }

  let inner = (tree, id, baseboard) => {
    let node = tree.get(id)
    let parent = tree.get(node.parentId)
    if (node == null) return null

    let vertex = null
    let board = null

    // Make move

    let propData = {B: 1, W: -1}

    for (let prop in propData) {
      if (node.data[prop] == null) continue

      vertex = parseVertex(node.data[prop][0])
      board = baseboard.makeMove(propData[prop], vertex)
      board.currentVertex = vertex

      break
    }

    if (!board) board = baseboard.clone()

    // Add markup

    propData = {AW: -1, AE: 0, AB: 1}

    for (let prop in propData) {
      if (node.data[prop] == null) continue

      for (let value of node.data[prop]) {
        for (let vertex of parseCompressedVertices(value)) {
          if (!board.has(vertex)) continue
          board.set(vertex, propData[prop])
        }
      }
    }

    Object.assign(board, {
      markers: board.signMap.map(row => row.map(_ => null)),
      lines: [],
      childrenInfo: [],
      siblingsInfo: []
    })

    if (vertex != null && board.has(vertex)) {
      let [x, y] = vertex
      board.markers[y][x] = {type: 'point'}
    }

    propData = {CR: 'circle', MA: 'cross', SQ: 'square', TR: 'triangle'}

    for (let prop in propData) {
      if (node.data[prop] == null) continue

      for (let value of node.data[prop]) {
        for (let [x, y] of parseCompressedVertices(value)) {
          if (board.markers[y] == null) continue
          board.markers[y][x] = {type: propData[prop]}
        }
      }
    }

    if (node.data.LB != null) {
      for (let composed of node.data.LB) {
        let sep = composed.indexOf(':')
        let point = composed.slice(0, sep)
        let label = composed.slice(sep + 1)
        let [x, y] = parseVertex(point)

        if (board.markers[y] == null) continue
        board.markers[y][x] = {type: 'label', label}
      }
    }

    if (node.data.L != null) {
      for (let i = 0; i < node.data.L.length; i++) {
        let point = node.data.L[i]
        let label = alpha[i]
        if (label == null) return
        let [x, y] = parseVertex(point)

        if (board.markers[y] == null) continue
        board.markers[y][x] = {type: 'label', label}
      }
    }

    for (let type of ['AR', 'LN']) {
      if (node.data[type] == null) continue

      for (let composed of node.data[type]) {
        let sep = composed.indexOf(':')
        let [v1, v2] = [composed.slice(0, sep), composed.slice(sep + 1)].map(
          parseVertex
        )

        board.lines.push({v1, v2, type: type === 'AR' ? 'arrow' : 'line'})
      }
    }

    // Add variation overlays

    let addInfo = (node, list) => {
      let v, sign

      if (node.data.B != null) {
        v = parseVertex(node.data.B[0])
        sign = 1
      } else if (node.data.W != null) {
        v = parseVertex(node.data.W[0])
        sign = -1
      } else {
        return
      }

      if (!board.has(v)) return

      let type = null

      if (node.data.BM != null) {
        type = 'bad'
      } else if (node.data.DO != null) {
        type = 'doubtful'
      } else if (node.data.IT != null) {
        type = 'interesting'
      } else if (node.data.TE != null) {
        type = 'good'
      }

      list[v] = {sign, type}
    }

    for (let child of node.children) {
      addInfo(child, board.childrenInfo)
    }

    if (parent != null) {
      for (let sibling of parent.children) {
        addInfo(sibling, board.siblingsInfo)
      }
    }

    boardCache[id] = board
    return board
  }

  for (let id of treePositions) {
    board = inner(tree, id, board)
  }

  return board
}

export function clearBoardCache() {
  boardCache = {}
}
