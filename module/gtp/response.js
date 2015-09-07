var Response = function(id, content, error) {
    this.id = parseInt(id)
    this.content = content
    this.error = error ? true : false
}

Response.prototype = {
    toString: function() {
        return (this.error ? '?' : '=') + (!isNaN(this.id) ? this.id : '') + ' ' + this.content
    }
}

module.exports = Response
