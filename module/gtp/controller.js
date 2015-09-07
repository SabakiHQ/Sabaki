var remote = require('remote')
var util = require('util')
var child_process = remote.require('child_process')
var events = require('events')

var Controller = function(command, args) {
    var self = this
    events.EventEmitter.call(self)

    self._buffer = ''
    self.process = child_process.spawn(command, args)

    self.process.stdout.on('data', function(data) {
        self.emit('data', data)
    })
}

util.inherits(Controller, events.EventEmitter)

Controller.prototype.close = function() {
    this.process.close()
}

Controller.prototype.sendCommand = function(command) {
    this.process.stdin.write(command.toString() + '\n')
}

module.exports = Controller
