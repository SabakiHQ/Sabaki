const $ = require('./sprint')

exports.buildFromTemplate = function(template) {
    let menu = {}
    let $element = $('<ul class="popupmenu"/>')

    template.forEach(item => {
        if (item.type == 'separator') {
            $element.append('<li class="separator"/>')
            return
        }

        let $li = $('<li/>')
        .text(item.label.replace(/&/g, ''))
        .on('click', function() {
            item.click()
            exports.hide()
        })

        if (item.type == 'saveClip') $li.addClass('saveClip')
        if (item.checked) $li.addClass('checked')
        $element.append($li)
    })

    menu.popup = (_, x, y) => exports.show($element, x, y)
    return menu
}

exports.hide = function() {
    $('ul.popupmenu, #popupmenu-overlay').remove()
}

exports.show = function($menu, x, y) {
    $('body').append(
        $('<div id="popupmenu-overlay"/>').on('click', exports.hide)
    ).append($menu)

    let menuWidth = Math.round($menu.width())
    let menuHeight = Math.round($menu.height())
    let bodyWidth = Math.round($('body').width())
    let bodyHeight = Math.round($('body').height())

    $menu.css('left', x).css('top', y)

    if (y + menuHeight > bodyHeight) $menu.css('top', Math.max(0, y - menuHeight))
    if (x + menuWidth > bodyWidth) $menu.css('left', Math.max(0, x - menuWidth))

    $menu.addClass('show')
}
