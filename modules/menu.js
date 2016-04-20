Menu = {}

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
}

Menu.hide = function() {
    $$('ul.popupmenu').dispose()
}

Menu.show = function(menu, x, y) {
    // TODO
}

window.Menu = Menu
