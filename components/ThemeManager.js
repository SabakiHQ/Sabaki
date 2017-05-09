const path = require('path')
const {remote} = require('electron')
const {h, Component} = require('preact')

const setting = remote.require('./modules/setting')

class ThemeManager extends Component {
    render() {
        return h('section', {},
            // Theme stylesheet

            setting.get('themes.current') != null && h('link', {
                rel: 'stylesheet',
                type: 'text/css',
                href: path.join(setting.themesDirectory, `${setting.get('themes.current')}.asar`, 'styles.css')
            }),

            // Custom images

            h('style', {},
                setting.get('themes.custom_blackstones') != null && `.goban li.sign_1 .stone.stone img {
                    background-image: url(${setting.get('themes.custom_blackstones')});
                }`,

                setting.get('themes.custom_whitestones') != null && `.goban li.sign_-1 .stone.stone img {
                    background-image: url(${setting.get('themes.custom_whitestones')});
                }`,

                setting.get('themes.custom_background') != null && `main {
                    background-image: url(${setting.get('themes.custom_background')});
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
