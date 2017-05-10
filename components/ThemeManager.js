const path = require('path')
const {remote} = require('electron')
const {h, Component} = require('preact')

const setting = remote.require('./modules/setting')

class ThemeManager extends Component {
    constructor() {
        super()

        this.updateSettingState()

        setting.events.on('change', ({key}) => this.updateSettingState(key))
    }

    shouldComponentUpdate(_, state) {
        return state.currentThemeId !== this.state.currentThemeId
            || state.blackStonePath !== this.state.blackStonePath
            || state.whiteStonePath !== this.state.whiteStonePath
            || state.backgroundPath !== this.state.backgroundPath
    }

    updateSettingState(key) {
        let data = {
            'themes.current': 'currentThemeId',
            'themes.custom_blackstones': 'blackStonePath',
            'themes.custom_whitestones': 'blackStonePath',
            'themes.custom_background': 'blackStonePath'
        }

        if (key == null) {
            for (let k in data) this.updateSettingState(k)
            return
        }

        if (key in data) {
            this.setState({[data[key]]: setting.get(key)})
        }
    }

    render(_, {currentThemeId, blackStonePath, whiteStonePath, backgroundPath}) {
        let currentTheme = setting.getThemes()[currentThemeId]

        return h('section', {},
            // Theme stylesheet

            currentTheme != null && h('link', {
                rel: 'stylesheet',
                type: 'text/css',
                href: path.join(currentTheme.path, currentTheme.main)
            }),

            // Custom images

            h('style', {},
                blackStonePath != null && `.goban li.sign_1 .stone.stone img {
                    background-image: url('${blackStonePath}');
                }`,

                whiteStonePath != null && `.goban li.sign_-1 .stone.stone img {
                    background-image: url('${whiteStonePath}');
                }`,

                backgroundPath != null && `main {
                    background-image: url('${backgroundPath}');
                }`
            ),

            // Userstyles

            h('link', {
                rel: 'stylesheet',
                type: 'text/css',
                href: setting.stylesPath
            })
        )
    }
}

module.exports = ThemeManager
