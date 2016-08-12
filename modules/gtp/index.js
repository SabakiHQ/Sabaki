exports.Command = require('./command.js')
exports.Response = require('./response.js')
exports.Controller = require('./controller.js')

exports.parseCommand = function(input) {
    input = input.replace(/\t/g, ' ').trim()
    let inputs = input.split(' ').filter(function(x) { return x != '' })
    let id = parseFloat(inputs[0])

    if (!isNaN(id)) inputs.splice(0, 1)
    let name = inputs[0]
    inputs.splice(0, 1)

    return new exports.Command(id, name, inputs)
}

exports.parseResponse = function(input) {
    input = input.replace(/\t/g, ' ').trim()
    let error = input[0] != '='
    let hasId = input[1] != ' '

    input = input.substr(1)
    let id = hasId ? parseFloat(input.split(' ')[0]) : null

    if (hasId) input = input.substr((id + '').length)

    return new exports.Response(id, input.substr(1), error)
}
