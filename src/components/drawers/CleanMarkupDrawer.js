// TODO

const {remote} = require('electron')
const {h, Component} = require('preact')

const Drawer = require('./Drawer')

const gametree = require('../../modules/gametree')
const helper = require('../../modules/helper')
const setting = remote.require('./setting')

class CleanMarkupItem extends Component {
    constructor() {
        super()

        this.handleChange = evt => {
            setting.set(this.props.id, evt.currentTarget.checked)
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

class CleanMarkupDrawer extends Component {
    constructor() {
        super()

        this.handleCloseButtonClick = evt => {
            evt.preventDefault()
            sabaki.closeDrawer()
        }

        this.handleRemoveButtonClick = evt => {
            evt.preventDefault()

            let doRemove = async work => {
                sabaki.setUndoPoint('Undo Clean Markup')
                sabaki.setBusy(true)

                let data = {
                    cross: ['MA'],
                    triangle: ['TR'],
                    square: ['SQ'],
                    circle: ['CR'],
                    line: ['LN'],
                    arrow: ['AR'],
                    label: ['LB'],
                    comments: ['C', 'N'],
                    annotations: ['DM', 'GB', 'GW', 'UC', 'BM', 'DO', 'IT', 'TE'],
                    hotspots: ['HO'],
                    winrate: ['SBKV']
                }

                let properties = Object.keys(data)
                    .filter(id => setting.get(`cleanmarkup.${id}`))
                    .map(id => data[id])
                    .reduce((acc, x) => [...acc, ...x], [])

                await helper.wait(100)

                work(properties)

                sabaki.setBusy(false)
                sabaki.closeDrawer()
            }

            let template = [
                {
                    label: 'From Current &Position',
                    click: () => doRemove(properties => {
                        let [tree, i] = this.props.treePosition

                        for (let prop of properties) {
                            delete tree.nodes[i][prop]
                        }
                    })
                },
                {
                    label: 'From Entire &Game',
                    click: () => doRemove(properties => {
                        let root = gametree.getRoot(...this.props.treePosition)
                        let trees = gametree.getTreesRecursive(root)

                        for (let tree of trees) {
                            for (let node of tree.nodes) {
                                for (let prop of properties) {
                                    delete node[prop]
                                }
                            }
                        }
                    })
                }
            ]

            let element = evt.currentTarget
            let {left, bottom} = element.getBoundingClientRect()

            helper.popupMenu(template, left, bottom)
        }
    }

    shouldComponentUpdate({show}) {
        return show !== this.props.show
    }

    render({show}) {
        return h(Drawer,
            {
                type: 'cleanmarkup',
                show
            },

            h('h2', {}, 'Clean Markup'),

            h('form', {},
                h('ul', {},
                    h(CleanMarkupItem, {
                        id: 'cleanmarkup.cross',
                        text: 'Cross markers'
                    }),
                    h(CleanMarkupItem, {
                        id: 'cleanmarkup.triangle',
                        text: 'Triangle markers'
                    }),
                    h(CleanMarkupItem, {
                        id: 'cleanmarkup.square',
                        text: 'Square markers'
                    }),
                    h(CleanMarkupItem, {
                        id: 'cleanmarkup.circle',
                        text: 'Circle markers'
                    })
                ),
                h('ul', {},
                    h(CleanMarkupItem, {
                        id: 'cleanmarkup.line',
                        text: 'Line markers'
                    }),
                    h(CleanMarkupItem, {
                        id: 'cleanmarkup.arrow',
                        text: 'Arrow markers'
                    }),
                    h(CleanMarkupItem, {
                        id: 'cleanmarkup.label',
                        text: 'Label markers'
                    })
                ),
                h('ul', {},
                    h(CleanMarkupItem, {
                        id: 'cleanmarkup.comments',
                        text: 'Comments'
                    }),
                    h(CleanMarkupItem, {
                        id: 'cleanmarkup.annotations',
                        text: 'Annotations'
                    }),
                    h(CleanMarkupItem, {
                        id: 'cleanmarkup.hotspots',
                        text: 'Hotspots markers'
                    }),
                    h(CleanMarkupItem, {
                        id: 'cleanmarkup.winrate',
                        text: 'Winrate data'
                    })
                ),

                h('p', {},
                    h('button', {
                        type: 'button',
                        class: 'dropdown',
                        onClick: this.handleRemoveButtonClick
                    }, 'Remove'), ' ',

                    h('button', {onClick: this.handleCloseButtonClick}, 'Close')
                )
            )
        )
    }
}

module.exports = CleanMarkupDrawer
