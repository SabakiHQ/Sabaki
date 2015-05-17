var remote = require('remote')
var fs = require('fs')
var path = require('path')
var app = remote.require('app')

var filename = path.join(app.getPath('userData'), 'settings.json')
var settings = JSON.decode(fs.readFileSync(filename, { encoding: 'utf8' }))

exports.get = function(key) {
    if (key in settings) return settings[key]
    else return null
}

exports.set = function(key, value) {
    settings[key] = value
    fs.writeFileSync(filename, JSON.encode(settings))
}
