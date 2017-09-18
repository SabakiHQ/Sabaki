let id = 0

exports.linebreak = process.platform === 'win32' ? '\r\n' : '\n'
exports.noop = () => {}

exports.getId = function() {
    return ++id
}

exports.hash = function(str) {
    let hash = 0, chr
    if (str.length == 0) return hash

    for (let i = 0; i < str.length; i++) {
        chr = str.charCodeAt(i)
        hash = ((hash << 5) - hash) + chr
        hash = hash & hash
    }

    return hash
}

exports.floorEven = function(float) {
    let value = Math.floor(float)
    return value % 2 === 0 ? value : value - 1
}

exports.equals = function(a, b) {
    if (a === b) return true
    if (a == null || b == null) return a == b

    let t = Object.prototype.toString.call(a)
    if (t !== Object.prototype.toString.call(b)) return false

    let aa = t === '[object Array]'
    let ao = t === '[object Object]'

    if (aa) {
        if (a.length !== b.length) return false
        for (let i = 0; i < a.length; i++)
            if (!exports.equals(a[i], b[i])) return false
        return true
    } else if (ao) {
        let kk = Object.keys(a)
        if (kk.length !== Object.keys(b).length) return false
        for (let i = 0; i < kk.length; i++) {
            let k = kk[i]
            if (!(k in b)) return false
            if (!exports.equals(a[k], b[k])) return false
        }
        return true
    }

    return false
}

exports.shallowEquals = function(a, b) {
    return a == null || b == null ? a === b : a === b || a.length === b.length && a.every((x, i) => x == b[i])
}

exports.vertexEquals = function([a, b], [c, d]) {
    return a === c && b === d
}

exports.lexicalCompare = function(a, b) {
    if (!a.length || !b.length) return a.length - b.length
    return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : exports.lexicalCompare(a.slice(1), b.slice(1))
}

exports.normalizeEndings = function(input) {
    return input.replace(/\r\n|\n\r|\r/g, '\n')
}

exports.markdown = function(input) {
    let marked = require('./marked')
    return marked(exports.normalizeEndings(input.trim()).replace(/\n/g, '  \n'))
}

exports.htmlify = function(input) {
    let urlRegex = '\\b(https?|ftps?):\\/\\/[^\\s<]+[^<.,:;"\')\\]\\s](\\/\\B|\\b)'
    let emailRegex = '\\b[^\\s@<]+@[^\\s@<]+\\b'
    let coordRegex = '\\b[a-hj-zA-HJ-Z][1-9][0-9]?\\b'
    let movenumberRegex = '\\B#\\d+\\b'
    let totalRegex = '(' + [urlRegex, emailRegex, coordRegex, movenumberRegex].join('|') + ')'

    input = input.replace(new RegExp(totalRegex, 'g'), match => {
        if (new RegExp(urlRegex).test(match))
            return '<a href="' + match + '" class="external">' + match + '</a>'
        if (new RegExp(emailRegex).test(match))
            return '<a href="mailto:' + match + '" class="external">' + match + '</a>'
        if (new RegExp(movenumberRegex).test(match))
            return '<a href="#" class="movenumber">' + match + '</a>'
        if (new RegExp(coordRegex).test(match))
            return '<span class="coord">' + match + '</span>'
    })

    return input
}

exports.popupMenu = function(template, x, y) {
    let {remote} = require('electron')
    let setting = remote.require('./setting')
    let zoomFactor = +setting.get('app.zoom_factor')

    remote.Menu.buildFromTemplate(template).popup(remote.getCurrentWindow(), {
        x: Math.round(x * zoomFactor),
        y: Math.round(y * zoomFactor),
        async: true
    })
}
