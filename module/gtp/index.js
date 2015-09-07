exports.Command = require('./command.js')
exports.Response = require('./response.js')
exports.Controller = require('./controller.js')

var alpha = 'abcdefghjklmnopqrstuvwxyz'

exports.parseCommand = function(input) {
    input = input.replace(/\t/g, ' ').trim()
    var inputs = input.split(' ').filter(function(x) { return x != '' })
    var id = parseInt(inputs[0])

    if (!isNaN(id)) inputs.splice(0, 1)
    var name = inputs[0]
    inputs.splice(0, 1)

    return new exports.Command(id, name, inputs)
}

exports.parseResponse = function(input) {
    input = input.replace(/\t/g, ' ').trim()
    var error = input[0] != '='
    var hasId = input[1] != ' '

    input = input.substr(1)
    var id = hasId ? parseInt(input.split(' ')[0]) : null

    if (hasId) input = input.substr((id + '').length)

    return new exports.Response(id, input.substr(1), error)
}

exports.vertex2point = function(tuple, size) {
    return tuple.unpack(function(x, y) {
        return alpha[x] + (size - y)
    })
}

exports.point2vertex = function(point, size) {
    var x = alpha.indexOf(point[0].toLowerCase())
    var y = size - parseInt(point.substr(1))
    return new Tuple(x, y)
}
