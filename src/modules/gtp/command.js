const helper = require('../helper')

class Command {
    constructor(id, name, ...args) {
        this.internalId = helper.getId()
        this.id = id
        this.name = name
        this.arguments = args || []
    }

    toString() {
        return `${this.id != null ? this.id : ''} ${this.name} ${this.arguments.join(' ')}`.trim()
    }
}

module.exports = Command
