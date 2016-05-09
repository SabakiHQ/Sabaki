(function(root) {

var fs = null
var gametree = root.gametree
var setting = root.setting
var helper = root.helper

if (typeof require != 'undefined') {
    fs = require('fs')
    gametree = require('./gametree')
    setting = require('./setting')
    helper = require('./helper')
}

var context = typeof module != 'undefined' ? module.exports : (window.sgf = {})
var alpha = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

context.meta = {
    name: 'Smart Game Format',
    extensions: ['sgf']
}

context.tokenize = function(input) {
    input = helper.normalizeEndings(input)

    var tokens = []
    var rules = {
        ignore: /^\s+/,
        parenthesis: /^(\(|\))/,
        semicolon: /^;/,
        prop_ident: /^[A-Za-z]+/,
        c_value_type: /^\[([^\\\]]|\\[^])*\]/
    }

    while (input.length > 0) {
        var token = null
        var length = 1

        for (var type in rules) {
            var matches = rules[type].exec(input)
            if (!matches) continue

            var value = matches[0]
            length = value.length
            token = [type, value]

            break
        }

        if (token && token[0] != 'ignore') tokens.push(token)
        input = input.substr(length)
    }

    return tokens
}

context.parse = function(tokens, callback, start, depth) {
    if (!callback) callback = function(progress) {}
    if (!start) start = [0]
    if (isNaN(depth)) depth = 0

    var i = start[0]
    var node, property, tree = gametree.new()
    tree.collapsed = tokens.length >= setting.get('graph.collapse_tokens_count')
        && depth > setting.get('graph.collapse_min_depth')

    while (i < tokens.length) {
        if (tokens[i][0] == 'parenthesis' && tokens[i][1] == '(') break
        if (tokens[i][0] == 'parenthesis' && tokens[i][1] == ')') return tree

        var type = tokens[i][0], value = tokens[i][1]

        if (type == 'semicolon') {
            node = {}
            tree.nodes.push(node)
        } else if (type == 'prop_ident') {
            var id = value.split('').filter(function(x) {
                return x.toUpperCase() == x
            }).join('')

            if (id != '') {
                node[id] = []
                property = node[id]
            }
        } else if (type == 'c_value_type') {
            property.push(context.unescapeString(value.substr(1, value.length - 2)))
        }

        start[0] = ++i
    }

    while (i < tokens.length) {
        if (tokens[i][0] == 'parenthesis' && tokens[i][1] == '(') {
            start[0] = i + 1

            t = context.parse(tokens, callback, start, depth + Math.min(tree.subtrees.length, 1))

            if (t.nodes.length > 0) {
                t.parent = tree
                tree.subtrees.push(t)
                tree.current = 0
            }

            i = start[0]
        } else if (tokens[i][0] == 'parenthesis' && tokens[i][1] == ')') {
            start[0] = i
            callback(i / tokens.length)
            break
        }

        i++
    }

    return tree
}

context.parseFile = function(filename, callback) {
    if (!fs) return null

    var input = fs.readFileSync(filename, { encoding: 'utf8' })
    var tokens = context.tokenize(input)

    return context.parse(tokens, callback)
}

context.string2dates = function(input) {
    if (!input.match(/^\d{4}(-\d{1,2}(-\d{1,2})?)?(,(\d{4}-)?\d{1,2}(-\d{1,2})?)*$/)) {
        return null
    }

    var dates = input.split(',').map(function(x) {
        return x.trim().split('-').map(function(y) { return +y })
    })

    for (var i = 1; i < dates.length; i++) {
        var date = dates[i]
        var prev = dates[i - 1]

        dates[i] = prev.slice(0, prev.length - date.length).concat(date)
    }

    return dates
}

context.dates2string = function(dates) {
    var datesCopy = [dates[0].slice()]

    for (var i = 1; i < dates.length; i++) {
        var date = dates[i]
        var prev = dates[i - 1]

        var k = 0
        for (var j = 0; j < date.length; j++) {
            if (date[j] == prev[j] && k == j) k++
            else break
        }

        datesCopy.push(date.slice(k))
    }

    return datesCopy.map(function(x) {
        return x.map(function(y) {
            return y > 9 ? '' + y : '0' + y
        }).join('-')
    }).join(',')
}

context.point2vertex = function(point) {
    if (point.length != 2) return [-1, -1]
    return point.split('').map(function(x) { return alpha.indexOf(x) })
}

context.vertex2point = function(vertex) {
    var x = vertex[0], y = vertex[1]
    if (Math.min(x, y) < 0 || Math.max(x, y) >= alpha.length)
        return ''
    return alpha[x] + alpha[y]
}

context.compressed2list = function(compressed) {
    var colon = compressed.indexOf(':')
    if (colon < 0) return [context.point2vertex(compressed)]

    var v1 = context.point2vertex(compressed.slice(0, colon))
    var v2 = context.point2vertex(compressed.slice(colon + 1))
    var list = []

    for (var i = Math.min(v1[0], v2[0]); i <= Math.max(v1[0], v2[0]); i++) {
        for (var j = Math.min(v1[1], v2[1]); j <= Math.max(v1[1], v2[1]); j++) {
            list.push([i, j])
        }
    }

    return list
}

context.stringify = function(tree) {
    var output = ''

    tree.nodes.forEach(function(node) {
        output += ';'

        for (var id in node) {
            if (id.toUpperCase() != id) continue
            output += id + '[' + node[id].map(context.escapeString).join('][') + ']'
        }

        output += '\n'
    })

    for (var i = 0; i < tree.subtrees.length; i++) {
        output += '(' + context.stringify(tree.subtrees[i]) + ')'
    }

    return output
}

context.escapeString = function(input) {
    return input.toString().replace(/\\/g, '\\\\').replace(/\]/g, '\\]')
}

context.unescapeString = function(input) {
    var result = ''
    var inBackslash = false

    input = helper.normalizeEndings(input)

    for (var i = 0; i < input.length; i++) {
        if (!inBackslash) {
            if (input[i] != '\\')
                result += input[i]
            else if (input[i] == '\\')
                inBackslash = true
        } else {
            if (input[i] != '\n')
                result += input[i]

            inBackslash = false
        }
    }

    return result
}

}).call(null, typeof module != 'undefined' ? module : window)
