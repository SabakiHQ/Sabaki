(function(root) {

var shell = null
var gtp = null
var marked = root.marked

if (typeof require != 'undefined') {
    shell = require('electron').shell
    gtp = require('./gtp')
    marked = require('./marked')
}

gtp = {
    point2vertex: function(point, size) {
        var alpha = 'abcdefghjklmnopqrstuvwxyz'
        var x = alpha.indexOf(point[0].toLowerCase())
        var y = size - parseFloat(point.substr(1))
        return [x, y]
    }
}

var context = typeof module != 'undefined' ? module.exports : (window.helper = {})

var id = 0

context.getId = function() {
    return ++id
}

context.hash = function(str) {
    var hash = 0, chr
    if (str.length == 0) return hash

    for (var i = 0; i < str.length; i++) {
        chr = str.charCodeAt(i)
        hash = ((hash << 5) - hash) + chr
        hash = hash & hash
    }

    return hash
}

context.roundEven = function(float) {
    var value = Math.round(float)
    return value % 2 == 0 ? value : value - 1
}

context.equals = function(a, b) {
    if (a === b) return true
    if (a == null || b == null) return a == b

    var t = Object.prototype.toString.call(a)
    if (t !== Object.prototype.toString.call(b)) return false

    var aa = t === '[object Array]'
    var ao = t === '[object Object]'

    if (aa) {
        if (a.length !== b.length) return false
        for (var i = 0; i < a.length; i++)
            if (!context.equals(a[i], b[i])) return false
        return true
    } else if (ao) {
        var kk = Object.keys(a)
        if (kk.length !== Object.keys(b).length) return false
        for (var i = 0; i < kk.length; i++) {
            k = kk[i]
            if (!(k in b)) return false
            if (!context.equals(a[k], b[k])) return false
        }
        return true
    }

    return false
}

context.lexicalCompare = function(a, b) {
    if (!a.length || !b.length) return a.length - b.length
    return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : context.lexicalCompare(a.slice(1), b.slice(1))
}

context.getSymmetries = function(tuple) {
    var reversed = [tuple[1], tuple[0]]
    var s = function(v) {
        return [
            [-v[0], v[1]],
            [v[0], -v[1]],
            [-v[0], -v[1]]
        ]
    }

    return [tuple, reversed].concat(s(tuple)).concat(s(reversed))
}

context.htmlify = function(input) {
    urlRegex = '\\b(https?|ftps?):\\/\\/[^\\s<]+[^<.,:;"\')\\]\\s]\\b'
    emailRegex = '\\b[^\\s@<]+@[^\\s@<]+\\b'
    coordRegex = '\\b[a-hj-zA-HJ-Z][1-9][0-9]?\\b'
    totalRegex = '(' + [urlRegex, emailRegex, coordRegex].join('|') + ')'

    input = input.replace(new RegExp(totalRegex, 'g'), function(match) {
        if (new RegExp(urlRegex).test(match))
            return '<a href="' + match + '">' + match + '</a>'
        if (new RegExp(emailRegex).test(match))
            return '<a href="mailto:' + match + '">' + match + '</a>'
        if (new RegExp(coordRegex).test(match))
            return '<span class="coord">' + match + '</span>'
    })

    return input
}

context.markdown = function(input) {
    return marked(input.trim().replace(/\r\n/g, '\n').replace(/\n/g, '  \n'))
}

context.wireLinks = function(container) {
    container.getElements('a').addEvent('click', function() {
        if (!shell) {
            this.target = '_blank'
            return true
        }

        shell.openExternal(this.href)
        return false
    })

    container.getElements('.coord').addEvent('mouseenter', function() {
        var v = gtp.point2vertex(this.get('text'), getBoard().size)
        showIndicator(v)
    }).addEvent('mouseleave', function() {
        hideIndicator()
    })
}

}).call(null, typeof module != 'undefined' ? module : window)
