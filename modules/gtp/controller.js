const {spawn} = require('child_process')
const {dirname} = require('path')
const split = require('argv-split')
const EventEmitter = require('events')

const gtp = require('./index')
const helper = require('../helper')

class Controller extends EventEmitter {
    constructor(engine) {
        super()

        this._outBuffer = ''
        this._errBuffer = ''
        this.commands = []
        this.error = false
        this.process = spawn(engine.path, split(engine.args), {cwd: dirname(engine.path)})

        Object.assign(this, engine)

        this.process.on('error', () => {
            this.error = true
        })

        this.process.on('exit', signal => {
            this.emit('quit', signal)
        })

        this.process.stdout.on('data', data => {
            this._outBuffer += (data + '').replace(/\r/g, '').replace(/#.*?\n/g, '').replace(/\t/g, ' ')

            let start = this._outBuffer.indexOf('\n\n')

            while (start !== -1) {
                let response = gtp.parseResponse(this._outBuffer.substr(0, start))
                this._outBuffer = this._outBuffer.substr(start + 2)

                if (this.commands.length > 0) {
                    let command = this.commands.shift()
                    this.emit(`response-${command.internalId}`, {response, command})
                }

                start = this._outBuffer.indexOf('\n\n')
            }
        })

        this.process.stderr.on('data', data => {
            this._errBuffer += (data + '').replace(/\r/g, '').replace(/\t/g, ' ')

            let start = this._errBuffer.indexOf('\n')

            while (start !== -1) {
                this.emit('stderr', {content: this._errBuffer.substr(0, start)})
                this._errBuffer = this._errBuffer.substr(start + 1)

                start = this._errBuffer.indexOf('\n')
            }
        })
    }

    sendCommand(command, callback = helper.noop) {
        this.once(`response-${command.internalId}`, callback)

        try {
            this.process.stdin.write(command.toString() + '\n')
            this.commands.push(command)
        } catch (err) {
            let response = new gtp.Response(command.id, 'connection error', true, true)
            this.emit(`response-${command.internalId}`, {response, command})
        }
    }
}

module.exports = Controller
