var Response = function(id, content, error) {
    this.id = parseInt(id)
    this.content = content
    this.error = error ? true : false
}

Response.prototype = {
    toString: function() {
        return (this.error ? '?' : '=') + (!isNaN(this.id) ? this.id : '') + ' ' + this.content
    },

    toHtml: function() {
        var c = this.error ? 'error' : 'success'
        return '<span class="' + c + '">' + (this.error ? '?' : '=') + '</span>'
            + (!isNaN(this.id) ? '<span class="id">' + this.id + '</span>' : '')
            + ' ' + this.content
    }
}

module.exports = Response
