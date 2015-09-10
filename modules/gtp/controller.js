var child_process = require('child_process')
var events = require('events')
var Response = require('./response')

/**
 * Attention! The GTP 2.0 draft specifies that the engine
 * has to respond to the commands in the same order as they
 * come in. Unfortunately, due to the asynchronous nature of
 * node.js, the `response` event could be handled *not*
 * in the given order.
 */

var Controller = function(exec, args) {
    var self = this
    events.EventEmitter.call(self)

    self._buffer = ''
    self.process = child_process.spawn(exec, args)

    self.process.stdout.on('data', function(data) {
        self._buffer += (data + '').replace(/\r/g, '').replace(/#.*?\n/g, '').replace(/\t/g, ' ')

        var start = self._buffer.indexOf('\n\n')

        while (start != -1) {
            var response = Response.parse(self._buffer.substr(0, start))
            self._buffer = self._buffer.substr(start + 2)
            self.emit('response', response)

            start = self._buffer.indexOf('\n\n')
        }
    })
}

require('util').inherits(Controller, events.EventEmitter)

Controller.prototype.sendCommand = function(command) {
    this.process.stdin.write(command.toString() + '\n')
}

module.exports = Controller
