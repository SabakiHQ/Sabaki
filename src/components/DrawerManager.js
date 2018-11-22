const {h, Component} = require('preact')
const gametree = require('../modules/gametree')

const InfoDrawer = require('./drawers/InfoDrawer')
const ScoreDrawer = require('./drawers/ScoreDrawer')
const PreferencesDrawer = require('./drawers/PreferencesDrawer')
const GameChooserDrawer = require('./drawers/GameChooserDrawer')
const CleanMarkupDrawer = require('./drawers/CleanMarkupDrawer')
const AdvancedPropertiesDrawer = require('./drawers/AdvancedPropertiesDrawer')

class DrawerManager extends Component {
    constructor() {
        super()

        this.handleScoreSubmit = ({resultString}) => {
            this.props.rootTree.nodes[0].RE = [resultString]
            sabaki.closeDrawer()
            setTimeout(() => sabaki.setMode('play'), 500)
        }

        this.handleGameSelect = ({selectedTree}) => {
            sabaki.closeDrawer()
            sabaki.setMode('play')
            sabaki.setCurrentTreePosition(selectedTree, 0)
        }

        this.handleGameTreesChange = evt => {
            let newGameTrees = evt.gameTrees
            let {gameTrees, gameIndex} = this.props
            let tree = gameTrees[gameIndex]
            let newIndex = newGameTrees.findIndex(t => t.root.id === tree.root.id)

            if (newIndex < 0) {
                if (newGameTrees.length === 0) {
                    newGameTrees = [sabaki.getEmptyGameTree()]
                }

                newIndex = Math.min(Math.max(gameIndex - 1, 0), newGameTrees.length - 1)
                tree = newGameTrees[newIndex]
            }

            sabaki.setState({gameTrees: newGameTrees})
            sabaki.setCurrentTreePosition(tree, tree.root.id)
        }
    }

    render({
        mode,
        openDrawer,
        gameTree,
        gameTrees,
        gameIndex,
        treePosition,

        gameInfo,
        currentPlayer,

        scoringMethod,
        scoreBoard,
        areaMap,

        engines,
        attachedEngines,
        graphGridSize,
        preferencesTab
    }) {
        return h('section', {},
            h(InfoDrawer, {
                show: openDrawer === 'info',
                engines: attachedEngines,
                gameTree,
                treePosition,
                gameInfo,
                currentPlayer
            }),

            h(PreferencesDrawer, {
                show: openDrawer === 'preferences',
                tab: preferencesTab,
                engines,
                graphGridSize
            }),

            h(GameChooserDrawer, {
                show: openDrawer === 'gamechooser',
                gameTrees,
                gameIndex,

                onItemClick: this.handleGameSelect,
                onChange: this.handleGameTreesChange
            }),

            h(CleanMarkupDrawer, {
                show: openDrawer === 'cleanmarkup',
                gameTree,
                treePosition
            }),

            h(AdvancedPropertiesDrawer, {
                show: openDrawer === 'advancedproperties',
                gameTree,
                treePosition
            }),

            h(ScoreDrawer, {
                show: openDrawer === 'score',
                estimating: mode === 'estimator',
                areaMap,
                board: scoreBoard,
                method: scoringMethod,
                komi: +gametree.getRootProperty(gameTree, 'KM', 0),
                handicap: +gametree.getRootProperty(gameTree, 'HA', 0),

                onSubmitButtonClick: this.handleScoreSubmit
            })
        )
    }
}

module.exports = DrawerManager
