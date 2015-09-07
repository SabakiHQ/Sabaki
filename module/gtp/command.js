var Command = function(id, name, arguments) {
    this.id = parseInt(id)
    this.name = name
    this.arguments = arguments ? arguments : []
}

Command.parse = function(input) {
    input = input.replace(/\t/g, ' ').trim()
    var inputs = input.split(' ').filter(function(x) { return x != '' })
    var id = parseInt(inputs[0])

    if (!isNaN(id)) inputs.splice(0, 1)
    var name = inputs[0]
    inputs.splice(0, 1)

    return new Command(id, name, inputs)
}

Command.prototype = {
    toString: function() {
        return (!isNaN(this.id) ? this.id + ' ' : '') + this.name + ' ' + this.arguments.join(' ')
    }
}

module.exports = Command
