import {h, Component} from 'preact'

import Goban from './Goban.js'
import PlayBar from './bars/PlayBar.js'
import EditBar from './bars/EditBar.js'
import GuessBar from './bars/GuessBar.js'
import AutoplayBar from './bars/AutoplayBar.js'
import ScoringBar from './bars/ScoringBar.js'
import FindBar from './bars/FindBar.js'

import sabaki from '../modules/sabaki.js'
import * as gametree from '../modules/gametree.js'

export default class MainView extends Component {
  constructor(props) {
    super(props)

    this.handleTogglePlayer = () => {
      let {gameTree, treePosition, currentPlayer} = this.props
      sabaki.setPlayer(treePosition, -currentPlayer)
    }

    this.handleToolButtonClick = evt => {
      sabaki.setState({selectedTool: evt.tool})
    }

    this.handleFindButtonClick = evt =>
      sabaki.findMove(evt.step, {
        vertex: this.props.findVertex,
        text: this.props.findText
      })

    this.handleGobanVertexClick = this.handleGobanVertexClick.bind(this)
    this.handleGobanLineDraw = this.handleGobanLineDraw.bind(this)
  }

  componentDidMount() {
    // Pressing Ctrl/Cmd should show crosshair cursor on Goban in edit mode

    document.addEventListener('keydown', evt => {
      if (evt.key !== 'Control' || evt.key !== 'Meta') return

      if (this.props.mode === 'edit') {
        this.setState({gobanCrosshair: true})
      }
    })

    document.addEventListener('keyup', evt => {
      if (evt.key !== 'Control' || evt.key !== 'Meta') return

      if (this.props.mode === 'edit') {
        this.setState({gobanCrosshair: false})
      }
    })
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.mode !== 'edit') {
      this.setState({gobanCrosshair: false})
    }
  }

  handleGobanVertexClick(evt) {
    sabaki.clickVertex(evt.vertex, evt)
  }

  handleGobanLineDraw(evt) {
    let {v1, v2} = evt.line
    sabaki.useTool(this.props.selectedTool, v1, v2)
    sabaki.editVertexData = null
  }

  render(
    {
      mode,
      gameIndex,
      gameTree,
      gameCurrents,
      treePosition,
      currentPlayer,
      gameInfo,

      deadStones,
      scoringMethod,
      scoreBoard,
      playVariation,
      analysis,
      analysisTreePosition,
      areaMap,
      blockedGuesses,

      highlightVertices,
      analysisType,
      showAnalysis,
      showCoordinates,
      showMoveColorization,
      showMoveNumbers,
      showNextMoves,
      showSiblings,
      fuzzyStonePlacement,
      animateStonePlacement,
      boardTransformation,

      selectedTool,
      findText,
      findVertex
    },
    {gobanCrosshair}
  ) {
    let node = gameTree.get(treePosition)
    let board = gametree.getBoard(gameTree, treePosition)
    let komi = +gametree.getRootProperty(gameTree, 'KM', 0)
    let handicap = +gametree.getRootProperty(gameTree, 'HA', 0)
    let paintMap

    if (['scoring', 'estimator'].includes(mode)) {
      paintMap = areaMap
    } else if (mode === 'guess') {
      paintMap = [...Array(board.height)].map(_ => Array(board.width).fill(0))

      for (let [x, y] of blockedGuesses) {
        paintMap[y][x] = 1
      }
    }

    return h(
      'section',
      {id: 'main'},

      h(
        'main',
        {ref: el => (this.mainElement = el)},

        h(Goban, {
          gameTree,
          treePosition,
          board,
          highlightVertices:
            findVertex && mode === 'find' ? [findVertex] : highlightVertices,
          analysisType,
          analysis:
            showAnalysis &&
            analysisTreePosition != null &&
            analysisTreePosition === treePosition
              ? analysis
              : null,
          paintMap,
          dimmedStones: ['scoring', 'estimator'].includes(mode)
            ? deadStones
            : [],

          crosshair: gobanCrosshair,
          showCoordinates,
          showMoveColorization,
          showMoveNumbers: mode !== 'edit' && showMoveNumbers,
          showNextMoves: mode !== 'guess' && showNextMoves,
          showSiblings: mode !== 'guess' && showSiblings,
          fuzzyStonePlacement,
          animateStonePlacement,

          playVariation,
          drawLineMode:
            mode === 'edit' && ['arrow', 'line'].includes(selectedTool)
              ? selectedTool
              : null,
          transformation: boardTransformation,

          onVertexClick: this.handleGobanVertexClick,
          onLineDraw: this.handleGobanLineDraw
        })
      ),

      h(
        'section',
        {id: 'bar'},
        h(PlayBar, {
          mode,
          engineSyncers: [
            this.props.blackEngineSyncerId,
            this.props.whiteEngineSyncerId
          ].map(id =>
            this.props.attachedEngineSyncers.find(syncer => syncer.id === id)
          ),
          playerNames: gameInfo.playerNames,
          playerRanks: gameInfo.playerRanks,
          playerCaptures: [1, -1].map(sign => board.getCaptures(sign)),
          currentPlayer,
          showHotspot: node.data.HO != null,
          onCurrentPlayerClick: this.handleTogglePlayer
        }),

        h(EditBar, {
          mode,
          selectedTool,
          onToolButtonClick: this.handleToolButtonClick
        }),

        h(GuessBar, {
          mode,
          treePosition
        }),

        h(AutoplayBar, {
          mode,
          gameTree,
          gameCurrents: gameCurrents[gameIndex],
          treePosition
        }),

        h(ScoringBar, {
          type: 'scoring',
          mode,
          method: scoringMethod,
          scoreBoard,
          areaMap,
          komi,
          handicap
        }),

        h(ScoringBar, {
          type: 'estimator',
          mode,
          method: scoringMethod,
          scoreBoard,
          areaMap,
          komi,
          handicap
        }),

        h(FindBar, {
          mode,
          findText,
          onButtonClick: this.handleFindButtonClick
        })
      )
    )
  }
}
