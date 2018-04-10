const {spawn} = require('child_process')
const {dirname} = require('path')
const EventEmitter = require('events')
const split = require('argv-split')

const Command = require('./command')
const gtp = require('./index')
const helper = require('../helper')

class Controller extends EventEmitter {
    constructor(engine) {
        super()

        this._outBuffer = ''
        this._errBuffer = ''

        this.commands = []
        this.error = false
        this.process = null
        this.engine = engine
    }

    start() {
        if (this.process) return

        let {path, args, commands = ''} = this.engine

        this.process = spawn(path, split(args), {cwd: dirname(path)})

        this.process.on('error', () => {
            this.error = true
        })

        this.process.on('exit', signal => {
            this.emit('quit', signal)
        })

        this.process.stdout.on('data', data => {
            this._outBuffer += (data + '').replace(/\r/g, '').replace(/\t/g, ' ')

            let start = this._outBuffer.indexOf('\n\n')

            while (start !== -1) {
                let response = gtp.parseResponse(this._outBuffer.slice(0, start))
                this._outBuffer = this._outBuffer.slice(start + 2)

                if (this.commands.length > 0) {
                    let command = this.commands.shift()
                    this.emit(`response-${command.internalId}`, response)
                }

                start = this._outBuffer.indexOf('\n\n')
            }
        })

        this.process.stderr.on('data', data => {
            this._errBuffer += (data + '').replace(/\r/g, '').replace(/\t/g, ' ')

            let start = this._errBuffer.indexOf('\n')

            while (start !== -1) {
                this.emit('stderr', {content: this._errBuffer.slice(0, start)})
                this._errBuffer = this._errBuffer.slice(start + 1)

                start = this._errBuffer.indexOf('\n')
            }
        })

        let initialCommands = commands.split(';')
            .map(x => x.trim()).filter(x => x !== '').map(x => new gtp.Command(null, x))

        for (let command of initialCommands) {
            this.sendCommand(command)
        }
    }

    stop(timeout) {
        return new Promise(resolve => {
            setTimeout(() => {
                this.kill()
                resolve()
            }, timeout)

            this.sendCommand(new Command(null, 'quit'))
            .then(response => response.error ? Promise.reject(new Error(response.content)) : response)
            .then(() => this.process = null)
            .catch(err => this.kill())
            .then(resolve)
        })
    }

    kill() {
        if (!this.process) return

        this.process.kill()
        this.process = null
    }

    sendCommand(command) {
        let promise = new Promise(resolve => {
            if (this.process == null) this.start()

            this.once(`response-${command.internalId}`, resolve)

            try {
                this.process.stdin.write(command.toString() + '\n')
                this.commands.push(command)
            } catch (err) {
                let response = new gtp.Response(command.id, 'connection error', true, true)
                this.emit(`response-${command.internalId}`, response)
            }
        })

        this.emit('command-sent', {
            controller: this,
            command,
            getResponse: () => promise
        })

        return promise
    }
}

module.exports = Controller
