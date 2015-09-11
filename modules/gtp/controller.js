var child_process = require('child_process')
var events = require('events')
var gtp = require('./index')

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
    self.commands = []

    self.process.on('exit', function(signal) {
        self.emit('quit', signal)
    })

    self.process.stdout.on('data', function(data) {
        self._buffer += (data + '').replace(/\r/g, '').replace(/#.*?\n/g, '').replace(/\t/g, ' ')

        var start = self._buffer.indexOf('\n\n')

        while (start != -1) {
            var response = gtp.parseResponse(self._buffer.substr(0, start))
            self._buffer = self._buffer.substr(start + 2)

            if (self.commands.length > 0) {
                self.emit('response-' + self.commands[0].internalId, response, self.commands[0])
                self.commands.splice(0, 1)
            }

            start = self._buffer.indexOf('\n\n')
        }
    })
}

require('util').inherits(Controller, events.EventEmitter)

Controller.prototype.sendCommand = function(command) {
    this.commands.push(command)

    try {
        this.process.stdin.write(command.toString() + '\n')
    } catch(e) {
        this.emit(
            'response-' + command.internalId,
            new gtp.Response(command.id, 'connection error', true, true),
            command
        )
        this.commands.splice(0, 1)
    }
}

module.exports = Controller
