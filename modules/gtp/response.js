const helper = require('../helper')

class Response {
    constructor(id, content, error, internal) {
        this.id = +id
        this.content = content
        this.error = !!error
        this.internal = !!internal
    }

    toString() {
        return `${this.error ? '?' : '='}${!isNaN(this.id) ? this.id : ''} ${this.content}`
    }
}

module.exports = Response
