(function() {

var Menu = {}

Menu.buildFromTemplate = function(template) {
    var menu = {}
    var element = new Element('ul.popupmenu')

    template.forEach(function(item) {
        if (item.type == 'separator') {
            element.grab(new Element('li.separator'))
            return
        }

        var li = new Element('li', {
            text: item.label.replace(/&/g, ''),
            events: {
                click: function() {
                    item.click()
                    Menu.hide()
                }
            }
        })

        if (item.checked) li.addClass('checked')
        element.grab(li)
    })

    menu.popup = function(_, x, y) { Menu.show(element, x, y) }
    return menu
}

Menu.hide = function() {
    $$('ul.popupmenu, #popupmenu-overlay').dispose()
}

Menu.show = function(menu, x, y) {
    document.body.grab(new Element('div#popupmenu-overlay', {
        events: { click: Menu.hide }
    })).grab(menu)

    var menuSize = menu.getSize()
    var bodySize = document.body.getSize()
    menu.setStyle('left', x).setStyle('top', y)

    if (y + menuSize.y > bodySize.y) menu.setStyle('top', y - menuSize.y)
    if (x + menuSize.x > bodySize.x) menu.setStyle('left', x - menuSize.x)

    menu.addClass('show')
}

window.Menu = Menu

})()
