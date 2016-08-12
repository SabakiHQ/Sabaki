const child_process = require('child_process')
const path = require('path')
const EventEmitter = require('events')

const gtp = require('./index')

class Controller extends EventEmitter {
    constructor(exec, args) {
        super()
        
        this._buffer = ''
        this.commands = []
        this.error = false
        this.process = child_process.execFile(exec, args, {
            cwd: path.dirname(exec)
        })

        this.process.on('error', () => {
            this.error = true
        })

        this.process.on('exit', signal => {
            this.emit('quit', signal)
        })

        this.process.stdout.on('data', data => {
            this._buffer += (data + '').replace(/\r/g, '').replace(/#.*?\n/g, '').replace(/\t/g, ' ')

            let start = this._buffer.indexOf('\n\n')

            while (start != -1) {
                let response = gtp.parseResponse(this._buffer.substr(0, start))
                this._buffer = this._buffer.substr(start + 2)

                if (this.commands.length > 0) {
                    this.emit('response-' + this.commands[0].internalId, response, this.commands[0])
                    this.commands.splice(0, 1)
                }

                start = this._buffer.indexOf('\n\n')
            }
        })

        this.process.stderr.on('data', data => {
            this.emit('stderr', data)
        })
    }

    sendCommand(command) {
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
}

module.exports = Controller
