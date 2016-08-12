const helper = require('../helper')

class Response {
    constructor(id, content, error, internal) {
        this.id = parseFloat(id)
        this.content = content
        this.error = !!error
        this.internal = !!internal
    }

    toString() {
        return (this.error ? '?' : '=') + (!isNaN(this.id) ? this.id : '') + ' ' + this.content
    }

    toHtml() {
        if (!helper) return this.toString()

        if (!this.internal) {
            let c = this.error ? 'error' : 'success'
            return '<span class="' + c + '">' + (this.error ? '?' : '=') + '</span>'
                + (!isNaN(this.id) ? '<span class="id">' + this.id + '</span>' : '')
                + ' ' + helper.htmlify(this.content)
        } else {
            return '<span class="internal">' + this.content + '</span>'
        }
    }
}

module.exports = Response
