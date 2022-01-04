import * as remote from '@electron/remote'
import {h, Component} from 'preact'
import classNames from 'classnames'
import sgf from '@sabaki/sgf'
import {BoundedGoban} from '@sabaki/shudan'

import i18n from '../i18n.js'
import * as gametree from '../modules/gametree.js'
import * as gobantransformer from '../modules/gobantransformer.js'
import * as helper from '../modules/helper.js'

const t = i18n.context('Goban')
const setting = remote.require('./setting')
const alpha = 'ABCDEFGHJKLMNOPQRSTUVWXYZ'

export default class Goban extends Component {
  constructor(props) {
    super(props)

    for (let handler of [
      'handleVertexMouseUp',
      'handleVertexMouseDown',
      'handleVertexMouseMove',
      'handleVertexMouseEnter',
      'handleVertexMouseLeave'
    ]) {
      let oldHandler = this[handler].bind(this)
      this[handler] = (evt, vertex) => {
        let transformation = this.props.transformation
        let inverse = gobantransformer.invert(transformation)
        let {width, height} = gobantransformer.transformSize(
          this.props.board.width,
          this.props.board.height,
          transformation
        )

        let originalVertex = gobantransformer.transformVertex(
          vertex,
          inverse,
          width,
          height
        )

        oldHandler(evt, originalVertex)
      }
    }
  }

  componentDidMount() {
    document.addEventListener('mouseup', () => {
      this.mouseDown = false

      if (this.state.temporaryLine) {
        this.setState({temporaryLine: null})
      }
    })

    // Resize board when window is resizing

    window.addEventListener('resize', () => {
      this.resize()
    })

    this.resize()
    this.componentWillReceiveProps()
  }

  componentDidUpdate() {
    if (!this.element || !this.element.parentElement) return

    let {maxWidth, maxHeight} = this.state

    setTimeout(() => {
      let {width, height} = this.element.getBoundingClientRect()

      let left = Math.round((maxWidth - width) / 2)
      let top = Math.round((maxHeight - height) / 2)

      if (left !== this.state.left || top !== this.state.top) {
        this.setState({left, top})
      }
    }, 0)
  }

  componentWillReceiveProps(nextProps = {}) {
    if (nextProps.playVariation !== this.props.playVariation) {
      if (nextProps.playVariation != null) {
        let {sign, moves, sibling} = nextProps.playVariation

        this.stopPlayingVariation()
        this.playVariation(sign, moves, sibling)
      } else {
        this.stopPlayingVariation()
      }
    } else if (this.props.treePosition !== nextProps.treePosition) {
      this.stopPlayingVariation()
    }
  }

  resize() {
    let {
      offsetWidth: maxWidth,
      offsetHeight: maxHeight
    } = this.element.parentElement

    if (
      maxWidth !== this.state.maxWidth ||
      maxHeight !== this.state.maxHeight
    ) {
      this.setState({maxWidth, maxHeight})
    }
  }

  handleVertexMouseDown(evt, vertex) {
    this.mouseDown = true
    this.startVertex = vertex
  }

  handleVertexMouseUp(evt, vertex) {
    if (!this.mouseDown) return

    let {onVertexClick = helper.noop, onLineDraw = helper.noop} = this.props

    this.mouseDown = false
    evt.vertex = vertex
    evt.line = this.state.temporaryLine

    if (evt.x == null) evt.x = evt.clientX
    if (evt.y == null) evt.y = evt.clientY

    if (evt.line) {
      onLineDraw(evt)
    } else {
      this.stopPlayingVariation()
      onVertexClick(evt)
    }

    this.setState({clicked: true})
    setTimeout(() => this.setState({clicked: false}), 200)
  }

  handleVertexMouseMove(evt, vertex) {
    let {drawLineMode, onVertexMouseMove = helper.noop} = this.props

    onVertexMouseMove(
      Object.assign(evt, {
        mouseDown: this.mouseDown,
        startVertex: this.startVertex,
        vertex
      })
    )

    if (!!drawLineMode && evt.mouseDown && evt.button === 0) {
      let temporaryLine = {v1: evt.startVertex, v2: evt.vertex}

      if (!helper.equals(temporaryLine, this.state.temporaryLine)) {
        this.setState({temporaryLine})
      }
    }
  }

  handleVertexMouseEnter(evt, vertex) {
    if (this.props.analysis == null) return

    let {sign, variations} = this.props.analysis
    let variation = variations.find(x => helper.vertexEquals(x.vertex, vertex))
    if (variation == null) return

    this.playVariation(sign, variation.moves)
  }

  handleVertexMouseLeave(evt, vertex) {
    this.stopPlayingVariation()
  }

  playVariation(sign, moves, sibling = false) {
    let replayMode = setting.get('board.variation_replay_mode')
    if (replayMode === 'instantly') {
      this.variationIntervalId = true

      this.setState({
        variationMoves: moves,
        variationSign: sign,
        variationSibling: sibling,
        variationIndex: moves.length
      })
    } else if (replayMode === 'move_by_move') {
      clearInterval(this.variationIntervalId)

      this.variationIntervalId = setInterval(() => {
        this.setState(({variationIndex = -1}) => ({
          variationMoves: moves,
          variationSign: sign,
          variationSibling: sibling,
          variationIndex: variationIndex + 1
        }))
      }, setting.get('board.variation_replay_interval'))
    } else {
      this.stopPlayingVariation()
    }
  }

  stopPlayingVariation() {
    if (this.variationIntervalId == null) return

    clearInterval(this.variationIntervalId)
    this.variationIntervalId = null

    this.setState({
      variationMoves: null,
      variationIndex: -1
    })
  }

  render(
    {
      gameTree,
      treePosition,
      board,
      paintMap = [],
      analysis,
      analysisType,
      highlightVertices = [],
      dimmedStones = [],

      crosshair = false,
      showCoordinates = false,
      showMoveColorization = true,
      showMoveNumbers = false,
      showNextMoves = true,
      showSiblings = true,
      fuzzyStonePlacement = true,
      animateStonePlacement = true,

      drawLineMode = null,
      transformation = ''
    },
    {
      top = 0,
      left = 0,
      maxWidth = 100,
      maxHeight = 100,
      clicked = false,
      temporaryLine = null,

      variationMoves = null,
      variationSign = 1,
      variationSibling = false,
      variationIndex = -1
    }
  ) {
    let signMap = board.signMap
    let markerMap = board.markers

    let transformLine = line =>
      gobantransformer.transformLine(
        line,
        transformation,
        board.width,
        board.height
      )
    let transformVertex = v =>
      gobantransformer.transformVertex(
        v,
        transformation,
        board.width,
        board.height
      )

    // Calculate coordinates

    let getCoordFunctions = coordinatesType => {
      if (coordinatesType === '1-1') {
        return [x => x + 1, y => y + 1]
      } else if (coordinatesType === 'relative') {
        let relativeCoord = (x, size) => {
          let halfSize = Math.ceil(size / 2)
          if (size === 19 && x === 10) return 'X'

          let ix = size - x + 1
          if (ix < halfSize) return `${ix}*`

          return x.toString()
        }

        return [
          x => relativeCoord(x + 1, board.width),
          y => relativeCoord(board.height - y, board.height)
        ]
      } else {
        return [x => alpha[x], y => board.height - y] // Default
      }
    }

    let coordinatesType = setting.get('view.coordinates_type')
    let coordFunctions = getCoordFunctions(coordinatesType)
    let {coordX, coordY} = gobantransformer.transformCoords(
      coordFunctions[0],
      coordFunctions[1],
      transformation,
      board.width,
      board.height
    )

    // Calculate lines

    let drawTemporaryLine = !!drawLineMode && !!temporaryLine
    let lines = board.lines.filter(({v1, v2, type}) => {
      if (
        drawTemporaryLine &&
        (helper.equals([v1, v2], [temporaryLine.v1, temporaryLine.v2]) ||
          ((type !== 'arrow' || drawLineMode === 'line') &&
            helper.equals([v2, v1], [temporaryLine.v1, temporaryLine.v2])))
      ) {
        drawTemporaryLine = false
        return false
      }

      return true
    })

    if (drawTemporaryLine)
      lines.push({
        v1: temporaryLine.v1,
        v2: temporaryLine.v2,
        type: drawLineMode
      })

    // Calculate ghost stones

    let ghostStoneMap = []

    if (showNextMoves || showSiblings) {
      ghostStoneMap = board.signMap.map(row => row.map(_ => null))

      if (showSiblings) {
        for (let v in board.siblingsInfo) {
          let [x, y] = v.split(',').map(x => +x)
          let {sign} = board.siblingsInfo[v]

          ghostStoneMap[y][x] = {sign, faint: showNextMoves}
        }
      }

      if (showNextMoves) {
        for (let v in board.childrenInfo) {
          let [x, y] = v.split(',').map(x => +x)
          let {sign, type} = board.childrenInfo[v]

          ghostStoneMap[y][x] = {sign, type: showMoveColorization ? type : null}
        }
      }
    }

    // Draw move numbers

    if (showMoveNumbers) {
      markerMap = markerMap.map(row => row.map(_ => null))

      let history = [
        ...gameTree.listNodesVertically(treePosition, -1, {})
      ].reverse()

      for (let i = 0; i < history.length; i++) {
        let node = history[i]
        let vertex = [-1, -1]

        if (node.data.B != null) vertex = sgf.parseVertex(node.data.B[0])
        else if (node.data.W != null) vertex = sgf.parseVertex(node.data.W[0])

        let [x, y] = vertex

        if (markerMap[y] != null && x < markerMap[y].length) {
          markerMap[y][x] = {type: 'label', label: i.toString()}
        }
      }
    }

    // Draw variationMoves

    let drawHeatMap = true

    if (variationMoves != null) {
      markerMap = board.markers.map(x => [...x])

      if (variationSibling) {
        let prevPosition = gameTree.navigate(treePosition, -1, {})

        if (prevPosition != null) {
          board = gametree.getBoard(gameTree, prevPosition.id)
          signMap = board.signMap
        }
      }

      let variationBoard = variationMoves
        .slice(0, variationIndex + 1)
        .reduce((board, [x, y], i) => {
          let sign = i % 2 === 0 ? variationSign : -variationSign
          markerMap[y][x] = {type: 'label', label: (i + 1).toString()}

          return board.makeMove(sign, [x, y])
        }, board)

      drawHeatMap = false
      signMap = variationBoard.signMap
    }

    // Draw heatmap

    let heatMap = []

    if (drawHeatMap && analysis != null) {
      let maxVisitsWin = Math.max(
        ...analysis.variations.map(x => x.visits * x.winrate)
      )
      heatMap = board.signMap.map(row => row.map(_ => null))

      for (let {
        vertex: [x, y],
        visits,
        winrate,
        scoreLead
      } of analysis.variations) {
        let strength = Math.round((visits * winrate * 8) / maxVisitsWin) + 1

        winrate =
          strength <= 3 ? Math.floor(winrate) : Math.floor(winrate * 10) / 10
        scoreLead = scoreLead == null ? null : Math.round(scoreLead * 10) / 10
        if (scoreLead === 0) scoreLead = 0 // Avoid -0

        heatMap[y][x] = {
          strength,
          text:
            visits < 10
              ? ''
              : [
                  analysisType === 'winrate'
                    ? i18n.formatNumber(winrate) +
                      (Math.floor(winrate) === winrate ? '%' : '')
                    : analysisType === 'scoreLead' && scoreLead != null
                    ? (scoreLead >= 0 ? '+' : '') + i18n.formatNumber(scoreLead)
                    : '–',
                  visits < 1000
                    ? i18n.formatNumber(visits)
                    : i18n.formatNumber(Math.round(visits / 100) / 10) + 'k'
                ].join('\n')
        }
      }
    }

    return h(BoundedGoban, {
      id: 'goban',
      class: classNames({crosshair}),
      style: {top, left},
      innerProps: {ref: el => (this.element = el)},

      maxWidth,
      maxHeight,

      showCoordinates,
      coordX,
      coordY,
      fuzzyStonePlacement,
      animateStonePlacement: clicked && animateStonePlacement,

      signMap: gobantransformer.transformMap(signMap, transformation),
      markerMap: gobantransformer.transformMap(markerMap, transformation),
      ghostStoneMap: gobantransformer.transformMap(
        ghostStoneMap,
        transformation
      ),
      paintMap: gobantransformer.transformMap(paintMap, transformation, {
        ignoreInvert: true
      }),
      heatMap: gobantransformer.transformMap(heatMap, transformation),
      lines: lines.map(transformLine),
      selectedVertices: highlightVertices.map(transformVertex),
      dimmedVertices: dimmedStones.map(transformVertex),

      onVertexMouseUp: this.handleVertexMouseUp,
      onVertexMouseDown: this.handleVertexMouseDown,
      onVertexMouseMove: this.handleVertexMouseMove,
      onVertexMouseEnter: this.handleVertexMouseEnter,
      onVertexMouseLeave: this.handleVertexMouseLeave
    })
  }
}
