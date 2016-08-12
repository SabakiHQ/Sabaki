const helper = require('../helper')

class Command {
    constructor(id, name, args) {
        this.internalId = helper.getId()
        this.id = parseFloat(id)
        this.name = name
        this.arguments = args ? args : []
    }

    toString() {
        return ((!isNaN(this.id) ? this.id + ' ' : '') + this.name + ' ' + this.arguments.join(' ')).trim()
    }
}

module.exports = Command
