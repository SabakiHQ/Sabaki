const fs = require('fs')

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

exports.typographer = function(input) {
    return input.replace(/\.{3}/g, '…')
        .replace(/(\S)'/g, '$1’')
        .replace(/(\S)"/g, '$1”')
        .replace(/'(\S)/g, '‘$1')
        .replace(/"(\S)/g, '“$1')
        .replace(/(\s)-(\s)/g, '$1–$2')
}

exports.normalizeEndings = function(input) {
    return input.replace(/\r\n|\n\r|\r/g, '\n')
}

exports.isTextLikeElement = function(element) {
    return ['textarea', 'select'].includes(element.tagName.toLowerCase())
        || element.tagName.toLowerCase() === 'input'
        && !['submit', 'reset', 'button', 'checkbox', 'radio', 'color', 'file'].includes(element.type)
}

exports.popupMenu = function(template, x, y) {
    let {remote} = require('electron')
    let setting = remote.require('./setting')
    let zoomFactor = +setting.get('app.zoom_factor')

    remote.Menu.buildFromTemplate(template).popup({
        x: Math.round(x * zoomFactor),
        y: Math.round(y * zoomFactor)
    })
}

exports.wait = function(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

exports.isWritableDirectory = function(path) {
    if (path == null) return false

    let fileStats = null

    try {
        fileStats = fs.statSync(path)
    } catch (err) {}

    if (fileStats != null) {
        if (fileStats.isDirectory()) {
            try {
                fs.accessSync(path, fs.W_OK)
                return true
            } catch (err) {}
        }

        // Path exists, either no write permissions to directory or path is not a directory
        return false
    } else {
        // Path doesn't exist
        return false
    }
}

exports.getScore = function(board, areaMap, {komi = 0, handicap = 0} = {}) {
    let score = {
        area: [0, 0],
        territory: [0, 0],
        captures: [1, -1].map(sign => board.getCaptures(sign))
    }

    for (let x = 0; x < board.width; x++) {
        for (let y = 0; y < board.height; y++) {
            let sign = areaMap[y][x]
            if (sign === 0) continue

            let index = sign > 0 ? 0 : 1

            score.area[index]++
            if (board.get([x, y]) === 0) score.territory[index]++
        }
    }

    score.areaScore = score.area[0] - score.area[1] - komi - handicap
    score.territoryScore = score.territory[0] - score.territory[1]
        + score.captures[0] - score.captures[1] - komi

    return score
}
