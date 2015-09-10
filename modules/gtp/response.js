var helper = require('../helper')

var Response = function(id, content, error, internal) {
    this.id = parseInt(id)
    this.content = content
    this.error = error ? true : false
    this.internal = internal ? true : false
}

Response.prototype = {
    toString: function() {
        return (this.error ? '?' : '=') + (!isNaN(this.id) ? this.id : '') + ' ' + this.content
    },

    toHtml: function() {
        if (!helper) return this.toString()
        
        if (!this.internal) {
            var c = this.error ? 'error' : 'success'
            return '<span class="' + c + '">' + (this.error ? '?' : '=') + '</span>'
                + (!isNaN(this.id) ? '<span class="id">' + this.id + '</span>' : '')
                + ' ' + helper.htmlify(this.content, true, true, true)
        } else {
            return '<span class="internal">' + this.content + '</span>'
        }
    }
}

module.exports = Response
