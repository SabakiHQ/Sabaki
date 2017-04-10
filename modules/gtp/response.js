const helper = require('../helper')

class Response {
    constructor(id, content, error, internal) {
        this.id = id
        this.content = content
        this.error = !!error
        this.internal = !!internal
    }

    toString() {
        return `${this.internal ? '' : this.error ? '?' : '='}${this.id != null ? this.id : ''} ${this.content}`.trim()
    }
}

module.exports = Response
