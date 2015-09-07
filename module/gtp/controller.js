var child_process = require('child_process')
var events = require('events')
var Response = require('./response')

var Controller = function(command, args) {
    var self = this
    events.EventEmitter.call(self)

    self._buffer = ''
    self.process = child_process.spawn(command, args)

    self.process.stdout.on('data', function(data) {
        self._buffer += (data + '').replace(/\r/g, '').replace(/#.*?\n/g, '').replace(/\t/g, ' ')

        var start = self._buffer.indexOf('\n\n')

        while (start != -1) {
            var response = Response.parse(self._buffer.substr(0, start))
            self._buffer = self._buffer.substr(start + 2)

            start = self._buffer.indexOf('\n\n')
            self.emit('response', response)
        }
    })
}

require('util').inherits(Controller, events.EventEmitter)

Controller.prototype.close = function() {
    this.process.close()
}

Controller.prototype.sendCommand = function(command) {
    this.process.stdin.write(command.toString() + '\n')
}

module.exports = Controller
