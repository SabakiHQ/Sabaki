var Response = function(id, content, error) {
    this.id = parseInt(id)
    this.content = content
    this.error = error ? true : false
}

Response.parse = function(input) {
    input = input.replace(/\t/g, ' ').trim()
    var error = input[0] != '='
    var hasId = input[1] != ' '

    input = input.substr(1)
    var id = hasId ? parseInt(input.split(' ')[0]) : null

    if (hasId) input = input.substr((id + '').length)

    return new Response(id, input.substr(1), error)
}

Response.prototype = {
    toString: function() {
        return (this.error ? '?' : '=') + (!isNaN(this.id) ? this.id : '') + ' ' + this.content
    }
}

module.exports = Response
