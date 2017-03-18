const {h, Component} = require('preact')

const InfoDrawer = require('./InfoDrawer')
const ScoreDrawer = require('./ScoreDrawer')
const PreferencesDrawer = require('./PreferencesDrawer')
const GameChooserDrawer = require('./GameChooserDrawer')
const CleanMarkupDrawer = require('./CleanMarkupDrawer')

class DrawerManager extends Component {
    render() {
        return h('section', {}, {
            h(InfoDrawer),
            h(ScoreDrawer),
            h(PreferencesDrawer),
            h(GameChooserDrawer),
            h(CleanMarkupDrawer),
        })
    }
}

module.exports = DrawerManager
