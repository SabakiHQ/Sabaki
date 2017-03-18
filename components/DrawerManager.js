const {h, Component} = require('preact')

const InfoDrawer = require('./InfoDrawer')
const ScoreDrawer = require('./ScoreDrawer')
const PreferencesDrawer = require('./PreferencesDrawer')
const GameChooserDrawer = require('./GameChooserDrawer')
const CleanMarkupDrawer = require('./CleanMarkupDrawer')

class DrawerManager extends Component {
    render({
        treePosition,
        openDrawer
    }) {
        return h('section', {},
            h(InfoDrawer, {
                treePosition,
                show: openDrawer === 'info'
            }),

            h(ScoreDrawer, {
                show: openDrawer === 'score'
            }),

            h(PreferencesDrawer, {
                show: openDrawer === 'preferences'
            }),

            h(GameChooserDrawer, {
                show: openDrawer === 'gamechooser'
            }),

            h(CleanMarkupDrawer, {
                show: openDrawer === 'cleanmarkup'
            })
        )
    }
}

module.exports = DrawerManager
