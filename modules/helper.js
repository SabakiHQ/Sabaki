var gtp = require('./gtp')
var crypto = require('crypto')
var shell = require('shell')

var id = 0
var storage = {}

exports.getId = function() {
    return ++id
}

exports.md5 = function(str) {
    return crypto.createHash('md5').update(str).digest('hex')
}

exports.roundEven = function(float) {
    var value = Math.round(float)
    return value % 2 == 0 ? value : value - 1
}

exports.store = function(key, value) {
    storage[key] = value
}

exports.retrieve = function(key, value) {
    if (key in storage) return storage[key]
    return null
}

exports.equals = function(a, b) {
    if (a === b) return true
    if (a == null || b == null) return a == b

    var t = Object.prototype.toString.call(a)
    if (t !== Object.prototype.toString.call(b)) return false

    var aa = t === "[object Array]"
    var ao = t === "[object Object]"

    if (aa) {
        if (a.length !== b.length) return false
        for (var i = 0; i < a.length; i++)
            if (!exports.equals(a[i], b[i])) return false
        return true
    } else if (ao) {
        var kk = Object.keys(a)
        if (kk.length !== Object.keys(b).length) return false
        for (var i = 0; i < kk.length; i++) {
            k = kk[i]
            if (!(k in b)) return false
            if (!exports.equals(a[k], b[k])) return false
        }
        return true
    }

    return false
}

exports.htmlify = function(input, renderUrl, renderEmail, renderCoord, useParagraphs) {
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

exports.wireLinks = function(container) {
    container.getElements('a').addEvent('click', function() {
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
