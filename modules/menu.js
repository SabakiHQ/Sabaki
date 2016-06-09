(function() {

var Menu = {}

Menu.buildFromTemplate = function(template) {
    var menu = {}
    var $element = $('<ul class="popupmenu"/>')

    template.forEach(function(item) {
        if (item.type == 'separator') {
            $element.append(new Element('li.separator'))
            return
        }

        var $li = $('<li/>')
        .text(item.label.replace(/&/g, ''))
        .on('click', function() {
            item.click()
            Menu.hide()
        })

        if (item.checked) $li.addClass('checked')
        $element.append($li)
    })

    menu.popup = function(_, x, y) { Menu.show($element, x, y) }
    return menu
}

Menu.hide = function() {
    $('ul.popupmenu, #popupmenu-overlay').remove()
}

Menu.show = function($menu, x, y) {
    $('body').append(
        $('<div id="popupmenu-overlay"/>')
        .on('click', Menu.hide)
    ).append($menu)

    var menuWidth = $menu.width()
    var menuHeight = $menu.height() + 6
    var bodyWidth = $('body').width()
    var bodyHeight = $('body').height()
    $menu.css('left', x).css('top', y)

    if (y + menuHeight > bodyHeight) $menu.css('top', Math.max(0, y - menuHeight))
    if (x + menuWidth > bodyWidth) $menu.css('left', Math.max(0, x - menuWidth))

    $menu.addClass('show')
}

window.Menu = Menu

})()
