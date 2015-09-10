var Command = function(id, name, arguments) {
    this.id = parseInt(id)
    this.name = name
    this.arguments = arguments ? arguments : []
}

Command.prototype = {
    toString: function() {
        return ((!isNaN(this.id) ? this.id + ' ' : '') + this.name + ' ' + this.arguments.join(' ')).trim()
    }
}

module.exports = Command
