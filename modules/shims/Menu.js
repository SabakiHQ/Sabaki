const {h, render} = require('preact')
const classNames = require('classnames')

function hide() {
    document.getElementById('popupmenu-overlay').remove()
}

function show(velement, x, y) {
    let element = render(velement, document.body).childNodes[0]

    let {width, height} = element.getBoundingClientRect()
    let {width: bodyWidth, height: bodyHeight} = document.body.getBoundingClientRect()

    element.style.left = (x + width <= bodyWidth ? x : Math.max(0, x - width)) + 'px'
    element.style.top = (y + height <= bodyHeight ? y : Math.max(0, y - height)) + 'px'
}

exports.buildFromTemplate = function(template) {
    return {
        popup: (_, {x, y}) => show(h('section',
            {
                id: 'popupmenu-overlay',
                onClick: () => hide()
            },

            h('ul', {class: 'popupmenu'}, template.map(item =>
                h('li', {
                    class: classNames({
                        checked: item.checked,
                        [item.type]: item.type
                    }),
                    onClick: () => item.click && item.click()
                }, item.label && item.label.replace(/&/g, ''))
            ))
        ), x, y)
    }
}

render(h('style', {}, `
    #popupmenu-overlay {
        position: absolute;
        left: 0;
        top: 0;
        right: 0;
        bottom: 0;
        z-index: 1000;
    }

    .popupmenu {
            position: absolute;
            padding: 3px 0;
            max-height: calc(100% - 6px);
            max-width: 100%;
            overflow: auto;
            background: rgba(0, 0, 0, .9);
            box-shadow: 0 5px 10px rgba(0, 0, 0, .5);
            color: white;
            list-style: none;
        }
        .popupmenu li:not(.separator) {
            position: relative;
            display: block;
            height: 1em;
            padding: 7px 30px;
            line-height: 1em;
        }
        .popupmenu li.checked::before {
            content: '';
            position: absolute;
            width: 1em;
            height: 1em;
            left: 9px;
            top: 7px;
            background: url('./node_modules/octicons/build/svg/check.svg') left top/contain no-repeat;
            filter: invert(100%);
            -webkit-filter: invert(100%);
        }
        .popupmenu li.separator {
            height: 2px;
            margin: 3px 0;
            background: rgba(255, 255, 255, .3);
        }
        .popupmenu li:not(.separator):hover {
            background-color: #0050C0;
        }
        .popupmenu li:not(.separator):active {
            background-color: #0030A0;
    }
`), document.body)
