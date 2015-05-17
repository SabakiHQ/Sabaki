var remote = require('remote')
var fs = require('fs')
var path = require('path')
var app = remote.require('app')

var filename = path.join(app.getPath('userData'), 'settings.json')
var settings = {}

exports.load = function() {
    settings = JSON.decode(fs.readFileSync(filename, { encoding: 'utf8' }))
}

exports.save = function() {
    fs.writeFileSync(filename, JSON.encode(settings))
}

exports.get = function(key) {
    if (key in settings) return settings[key]
    else return null
}

exports.set = function(key, value) {
    settings[key] = value
    fs.writeFileSync(filename, JSON.encode(settings))
}

exports.default = function(key, value) {
    if (exports.get(key) == null) exports.set(key, value)
}

try { fs.accessSync(filename, fs.F_OK) } catch(err) { exports.save() }
exports.load()
