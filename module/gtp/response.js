var Response = function(id, content, error) {
    this.id = parseInt(id)
    this.content = content
    this.error = error ? true : false
}

Response.parse = function(input) {
    var error = input[0] != '='
    input = input.substr(1)

    var inputs = input.replace(/\t/g, ' ').split(' ').filter(function(x) { return x != '' })
    var id = parseInt(inputs[0])

    if (!isNaN(id)) input = input.substr((id + '').length)
    return new Response(id, input.substr(1), error)
}

Response.prototype = {
    toString: function() {
        return (this.error ? '?' : '=') + (!isNaN(this.id) ? this.id : '') + ' ' + this.content
    }
}

module.exports = Response
