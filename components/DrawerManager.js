const {h, Component} = require('preact')
const gametree = require('../modules/gametree')

const InfoDrawer = require('./InfoDrawer')
const ScoreDrawer = require('./ScoreDrawer')
const PreferencesDrawer = require('./PreferencesDrawer')
const GameChooserDrawer = require('./GameChooserDrawer')
const CleanMarkupDrawer = require('./CleanMarkupDrawer')

class DrawerManager extends Component {
    render({
        mode,
        openDrawer,
        treePosition,
        rootTree,
        gameInfo,
        currentPlayer,

        scoringMethod,
        scoreBoard,
        areaMap
    }) {
        return h('section', {},
            h(InfoDrawer, {
                show: openDrawer === 'info',
                treePosition,
                gameInfo,
                currentPlayer
            }),

            h(PreferencesDrawer, {
                show: openDrawer === 'preferences'
            }),

            h(GameChooserDrawer, {
                show: openDrawer === 'gamechooser'
            }),

            h(CleanMarkupDrawer, {
                show: openDrawer === 'cleanmarkup'
            }),

            h(ScoreDrawer, {
                show: openDrawer === 'score',
                estimating: mode === 'estimator',
                areaMap,
                board: scoreBoard,
                method: scoringMethod,
                komi: +gametree.getRootProperty(treePosition[0], 'KM', 0),

                onSubmitButtonClick: ({resultString}) => {
                    rootTree.nodes[0].RE = [resultString]
                    sabaki.closeDrawers()
                    setTimeout(() => sabaki.setMode('play'), 500)
                }
            })
        )
    }
}

module.exports = DrawerManager
