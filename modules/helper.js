(function(root) {

var gtp = null
var shell = null

if (typeof require != 'undefined') {
    gtp = require('./gtp')
    shell = require('shell')
}

var context = typeof module != 'undefined' ? module.exports : (window.fuzzyfinder = {})

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

    var aa = t === "[object Array]"
    var ao = t === "[object Object]"

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

context.htmlify = function(input, renderUrl, renderEmail, renderCoord, useParagraphs) {
    input = input.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&rt;')

    if (renderUrl)
        input = input.replace(/\b((http|https|ftp|ftps)\:\/\/[a-zA-Z0-9\-\.]+\.[a-zA-Z]+(\/\S*)?)/g, function(url) {
            return '<a href="' + url + '">' + url + '</a>'
        })

    if (renderEmail)
        input = input.replace(/\b[^\s@]+@[a-zA-Z0-9\-\.]+\.[a-zA-Z]+\b/g, function(email) {
            return '<a href="mailto:' + email + '">' + email + '</a>'
        })

    if (renderCoord)
        input = input.replace(/\b[a-hj-zA-HJ-Z][1-9][0-9]?\b/g, function(coord) {
            return '<span class="coord">' + coord + '</span>'
        })

    if (useParagraphs) {
        input = '<p>' + input.trim().split('\n').map(function(s) {
            if (s.trim() == '') return ''

            if (s.trim().split('').every(function(x) {
                return x == '-' || x == '='
            })) return '</p><hr><p>'

            return s
        }).join('<br>')
        .replace(/<br><br>/g, '</p><p>')
        .replace(/(<br>)*<p>(<br>)*/g, '<p>')
        .replace(/(<br>)*<\/p>(<br>)*/g, '</p>') + '</p>'
    }

    return input
}

context.wireLinks = function(container) {
    container.getElements('a').addEvent('click', function() {
        if (!shell) return true
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
