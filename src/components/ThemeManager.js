const path = require('path')
const {remote} = require('electron')
const {h, Component} = require('preact')

const setting = remote.require('./setting')

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
            || state.boardPath !== this.state.boardPath
            || state.backgroundPath !== this.state.backgroundPath
    }

    updateSettingState(key) {
        let data = {
            'theme.current': 'currentThemeId',
            'theme.custom_blackstones': 'blackStonePath',
            'theme.custom_whitestones': 'whiteStonePath',
            'theme.custom_board': 'boardPath',
            'theme.custom_background': 'backgroundPath'
        }

        if (key == null) {
            for (let k in data) this.updateSettingState(k)
            return
        }

        if (key in data) {
            this.setState({[data[key]]: setting.get(key)})
        }
    }

    render(_, {currentThemeId, blackStonePath, whiteStonePath, boardPath, backgroundPath}) {
        let currentTheme = setting.getThemes()[currentThemeId]

        return h('section', {},
            // Theme stylesheet

            currentTheme != null && h('link', {
                rel: 'stylesheet',
                type: 'text/css',
                href: path.join(currentTheme.path, currentTheme.main || 'styles.css')
            }),

            // Custom images

            h('style', {},
                blackStonePath != null && `.shudan-vertex.shudan-sign_1 .shudan-inner {
                    background-image: url('${blackStonePath.replace(/\\/g, '/')}');
                }`,

                whiteStonePath != null && `.shudan-vertex.shudan-sign_-1 .shudan-inner {
                    background-image: url('${whiteStonePath.replace(/\\/g, '/')}');
                }`,

                boardPath != null && `.shudan-goban {
                    background-image: url('${boardPath.replace(/\\/g, '/')}');
                }`,

                backgroundPath != null && `main {
                    background-image: url('${backgroundPath.replace(/\\/g, '/')}');
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
