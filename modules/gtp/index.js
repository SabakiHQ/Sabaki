const {exec} = require('child_process')

const Command = exports.Command = require('./command')
const Response = exports.Response = require('./response')
const Controller = exports.Controller = require('./controller')

// System paths are not inherited in macOS
// This is a quick & dirty fix

if (process.platform === 'darwin') {
    exec('/bin/bash -ilc "env; exit"', (err, result) => {
        if (err) return

        process.env.PATH = result.trim().split('\n')
            .map(x => x.split('='))
            .find(x => x[0] === 'PATH')[1]
    })
}

exports.parseCommand = function(input) {
    input = input.replace(/\t/g, ' ').trim()
    let inputs = input.split(' ').filter(x => x !== '')
    let id = parseFloat(inputs[0])

    if (!isNaN(id)) inputs.shift()
    else id = null

    let name = inputs[0]
    inputs.shift()

    return new Command(id, name, ...inputs)
}

exports.parseResponse = function(input) {
    input = input.replace(/\t/g, ' ').trim()
    let error = input[0] !== '='
    let hasId = input.length >= 2 && input[1] !== ' '

    input = input.substr(1)
    let id = hasId ? +input.split(' ')[0] : null

    if (hasId) input = input.substr((id + '').length)

    return new Response(id, input.substr(1), error)
}
