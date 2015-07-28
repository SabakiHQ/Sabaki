var fs = require('fs')
var path = require('path')
var app = require('app')

var filename = path.join(app.getPath('userData'), 'settings.json')
var settings = {}

exports.load = function() {
    settings = JSON.parse(fs.readFileSync(filename, { encoding: 'utf8' }))
    return exports
}

exports.save = function() {
    fs.writeFileSync(filename, JSON.stringify(settings, null, '    '))
    return exports
}

exports.get = function(key) {
    if (key in settings) return settings[key]
    else return null
}

exports.set = function(key, value) {
    settings[key] = value
    return exports.save()
}

exports.default = function(key, value) {
    if (exports.get(key) == null) exports.set(key, value)
    return exports
}

try { fs.accessSync(filename, fs.F_OK) } catch(err) { exports.save() }
exports.load()
