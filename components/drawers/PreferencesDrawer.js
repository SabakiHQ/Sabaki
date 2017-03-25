const {remote} = require('electron')
const {h, Component} = require('preact')

const setting = require('../../modules/setting')
const helper = require('../../modules/helper')

const Drawer = require('./Drawer')

class PreferencesItem extends Component {
    constructor() {
        super()

        this.handleChange = evt => {
            let {onChange = helper.noop} = this.props
            let {checked} = evt.currentTarget

            setting.set(this.props.id, checked)
            onChange(Object.assign({checked}, this.props))
        }
    }

    shouldComponentUpdate() {
        return false
    }

    render({id, text}) {
        return h('li', {},
            h('label', {},
                h('input', {
                    type: 'checkbox',
                    checked: setting.get(id),
                    onChange: this.handleChange
                }), ' ',

                text
            )
        )
    }
}

class GeneralTab extends Component {
    constructor() {
        super()

        this.handleSoundEnabledChange = evt => {
            remote.getCurrentWindow().webContents.setAudioMuted(!evt.checked)
        }

        this.handleStateChange = evt => {
            let data = {
                'view.fuzzy_stone_placement': 'fuzzyStonePlacement',
                'view.animated_stone_placement': 'animatedStonePlacement'
            }

            sabaki.setState({[data[evt.id]]: evt.checked})
        }
    }

    render() {
        return h('div', {class: 'general'},
            h('ul', {},
                h(PreferencesItem, {
                    id: 'app.startup_check_updates',
                    text: 'Check for updates at startup'
                }),
                h(PreferencesItem, {
                    id: 'sound.enable',
                    text: 'Enable sounds',
                    onChange: this.handleSoundEnabledChange
                }),
                h(PreferencesItem, {
                    id: 'game.goto_end_after_loading',
                    text: 'Jump to end after loading a file'
                }),
                h(PreferencesItem, {
                    id: 'view.fuzzy_stone_placement',
                    text: 'Fuzzy stone placement',
                    onChange: this.handleStateChange
                }),
                h(PreferencesItem, {
                    id: 'view.animated_stone_placement',
                    text: 'Animate fuzzy placement',
                    onChange: this.handleStateChange
                }),
                h(PreferencesItem, {
                    id: 'file.show_reload_warning',
                    text: 'Offer to reload file if changed externally'
                })
            ),

            h('ul', {},
                h(PreferencesItem, {
                    id: 'comments.show_move_interpretation',
                    text: 'Show automatic move titles'
                }),
                h(PreferencesItem, {
                    id: 'game.show_ko_warning',
                    text: 'Show ko warning'
                }),
                h(PreferencesItem, {
                    id: 'game.show_suicide_warning',
                    text: 'Show suicide warning'
                }),
                h(PreferencesItem, {
                    id: 'edit.show_removenode_warning',
                    text: 'Show remove node warning'
                }),
                h(PreferencesItem, {
                    id: 'edit.show_removeothervariations_warning',
                    text: 'Show remove other variations warning'
                }),
                h(PreferencesItem, {
                    id: 'edit.click_currentvertex_to_remove',
                    text: 'Click last played stone to remove'
                })
            ),

            h('div', {},
                h('p', {}, h('label', {},
                    'Game Tree Style: ',

                    h('select', {},
                        h('option', {value: 'compact'}, 'Compact'),
                        h('option', {value: 'spacious'}, 'Spacious'),
                        h('option', {value: 'big'}, 'Big')
                    )
                ))
            )
        )
    }
}

class EngineItem extends Component {
    shouldComponentUpdate({name, path, args}) {
        return name !== this.props.name
            || path !== this.props.path
            || args !== this.props.args
    }

    render({name, path, args}) {
        return h('li', {},
            h('h3', {},
                h('input', {
                    type: 'text',
                    placeholder: '(Unnamed engine)',
                    value: name
                })
            ),
            h('p', {},
                h('input', {
                    type: 'text',
                    placeholder: 'Path',
                    value: path
                }),
                h('a', {class: 'browse'},
                    h('img', {
                        src: './node_modules/octicons/build/svg/file-directory.svg',
                        title: 'Browse…',
                        height: 14
                    })
                )
            ),
            h('p', {},
                h('input', {
                    type: 'text',
                    placeholder: 'No arguments',
                    value: args
                })
            ),
            h('a', {class: 'remove'},
                h('img', {
                    src: './node_modules/octicons/build/svg/x.svg',
                    height: 14
                })
            )
        )
    }
}

class EnginesTab extends Component {
    render({engines}) {
        return h('div', {class: 'engines'},
            h('div', {class: 'engines-list'},
                h('ul', {}, engines.map(engine =>
                    h(EngineItem, engine)
                ))
            ),

            h('p', {},
                h('button', {}, 'Add')
            )
        )
    }
}

class PreferencesDrawer extends Component {
    constructor() {
        super()

        this.handleCloseButtonClick = evt => {
            evt.preventDefault()
            sabaki.closeDrawer()
        }
    }

    render({show, tab = 'general', engines}) {
        return h(Drawer,
            {
                type: 'preferences',
                show
            },

            h('ul', {class: 'tabs'},
                h('li', {class: {current: tab === 'general'}},
                    h('a', {href: '#'}, 'General')
                ),
                h('li', {class: {current: tab === 'engines'}},
                    h('a', {href: '#'}, 'Engines')
                )
            ),

            h('form', {class: {[tab]: true}},
                h(GeneralTab),
                h(EnginesTab, {engines}),

                h('p', {},
                    h('button', {onClick: this.handleCloseButtonClick}, 'Close')
                )
            )
        )
    }
}

module.exports = PreferencesDrawer
