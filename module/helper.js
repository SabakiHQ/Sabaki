var gtp = require('./gtp')
var crypto = require('crypto')
var shell = require('shell')

exports.md5 = function(str) {
    return crypto.createHash('md5').update(str).digest('hex')
}

exports.roundEven = function(float) {
    var value = Math.round(float)
    return value % 2 == 0 ? value : value - 1
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
        showIndicator(gtp.point2vertex(this.get('text'), getBoard().size))
    }).addEvent('mouseleave', function() {
        hideIndicator()
    })
}
