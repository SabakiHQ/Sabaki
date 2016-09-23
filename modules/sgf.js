const fs = require('fs')
const iconv = {encodingExists: () => false}
const gametree = require('./gametree')
const setting = require('./setting')
const helper = require('./helper')

const alpha = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

// The default encoding and list of properties that should be interpreted as
// being encoded by the file's CA[] property is defined in the SGF spec at
// http://www.red-bean.com/sgf/properties.html#CA

const defaultEncoding = 'ISO-8859-1'
const encodedProperties = ['C', 'N', 'AN', 'BR', 'BT', 'CP', 'DT', 'EV', 'GN',
                           'ON', 'OT', 'PB', 'PC', 'PW', 'RE', 'RO', 'RU', 'SO',
                           'US', 'WR', 'WT', 'GC']

exports.meta = {
    name: 'Smart Game Format',
    extensions: ['sgf']
}

exports.tokenize = function(input) {
    input = helper.normalizeEndings(input)

    let tokens = []
    let rules = {
        ignore: /^\s+/,
        parenthesis: /^(\(|\))/,
        semicolon: /^;/,
        prop_ident: /^[A-Za-z]+/,
        c_value_type: /^\[([^\\\]]|\\[^])*\]/
    }

    while (input.length > 0) {
        let token = null
        let length = 1

        for (let type in rules) {
            let matches = rules[type].exec(input)
            if (!matches) continue

            let value = matches[0]
            length = value.length
            token = [type, value]

            break
        }

        if (token && token[0] != 'ignore') tokens.push(token)
        input = input.substr(length)
    }

    return tokens
}

exports.parse = function(tokens, callback = () => {}, start = [0], depth = 0, encoding = defaultEncoding) {
    let i = start[0]
    let tree = gametree.new(), node, property, id

    tree.collapsed = tokens.length >= setting.get('graph.collapse_tokens_count')
        && depth > setting.get('graph.collapse_min_depth')

    while (i < tokens.length) {
        let [type, value] = tokens[i]

        if (type == 'parenthesis' && value == '(') break
        if (type == 'parenthesis' && value == ')') return tree

        if (type == 'semicolon') {
            node = {}
            tree.nodes.push(node)
        } else if (type == 'prop_ident') {
            id = value.split('').filter(x => x.toUpperCase() == x).join('')

            if (id != '') {
                node[id] = []
                property = node[id]
            }
        } else if (type == 'c_value_type') {
            let encodedValue = exports.unescapeString(value.substr(1, value.length - 2))

            if (id == 'CA' && iconv.encodingExists(encodedValue) && encodedValue != defaultEncoding) {
                encoding = encodedValue
                property.push(encodedValue)

                // We may have already incorrectly parsed some values in this root node
                // already, so we have to go back and re-parse them now.

                for (let k in node) {
                    if (encodedProperties.indexOf(k) >= 0) {
                        node[k] = node[k].map(x => iconv.decode(Buffer.from(x, 'binary'), encoding))
                    }
                }
            } else if (encodedProperties.indexOf(id) > -1 && encoding != defaultEncoding) {
                let decodedValue = iconv.decode(Buffer.from(encodedValue, 'binary'), encoding)
                property.push(decodedValue)
            } else {
                property.push(encodedValue)
            }
        }

        start[0] = ++i
    }

    while (i < tokens.length) {
        let [type, value] = tokens[i]

        if (type == 'parenthesis' && value == '(') {
            start[0] = i + 1

            let t = exports.parse(tokens, callback, start, depth + Math.min(tree.subtrees.length, 1), encoding)

            if (t.nodes.length > 0) {
                t.parent = tree
                tree.subtrees.push(t)
                tree.current = 0
            }

            i = start[0]
        } else if (type == 'parenthesis' && value == ')') {
            start[0] = i
            callback(i / tokens.length)
            break
        }

        i++
    }

    return tree
}

exports.parseFile = function(filename, callback) {
    let input = fs.readFileSync(filename, {encoding: 'binary'})
    let tokens = exports.tokenize(input)

    return exports.parse(tokens, callback)
}

exports.string2dates = function(input) {
    if (!input.match(/^(\d{4}(-\d{1,2}(-\d{1,2})?)?(\s*,\s*(\d{4}|(\d{4}-)?\d{1,2}(-\d{1,2})?))*)?$/))
        return null
    if (input.trim() == '')
        return []

    let dates = input.split(',').map(x => x.trim().split('-'))

    for (let i = 1; i < dates.length; i++) {
        let date = dates[i]
        let prev = dates[i - 1]

        if (date[0].length != 4) {
            // No year

            if (date.length == 1 && prev.length == 3) {
                // Add month
                date.unshift(prev[1])
            }

            // Add year
            date.unshift(prev[0])
        }
    }

    return dates.map(x => x.map(y => +y))
}

exports.dates2string = function(dates) {
    if (dates.length == 0) return ''

    let datesCopy = [dates[0].slice()]

    for (let i = 1; i < dates.length; i++) {
        let date = dates[i]
        let prev = dates[i - 1]
        let k = 0

        for (let j = 0; j < date.length; j++) {
            if (date[j] == prev[j] && k == j) k++
            else break
        }

        datesCopy.push(date.slice(k))
    }

    return datesCopy.map(x => {
        return x.map(y => y > 9 ? '' + y : '0' + y).join('-')
    }).join(',')
}

exports.point2vertex = function(point) {
    if (point.length != 2) return [-1, -1]
    return point.split('').map(x => alpha.indexOf(x))
}

exports.vertex2point = function([x, y]) {
    if (Math.min(x, y) < 0 || Math.max(x, y) >= alpha.length)
        return ''
    return alpha[x] + alpha[y]
}

exports.compressed2list = function(compressed) {
    let colon = compressed.indexOf(':')
    if (colon < 0) return [exports.point2vertex(compressed)]

    let v1 = exports.point2vertex(compressed.slice(0, colon))
    let v2 = exports.point2vertex(compressed.slice(colon + 1))
    let list = []

    for (let i = Math.min(v1[0], v2[0]); i <= Math.max(v1[0], v2[0]); i++) {
        for (let j = Math.min(v1[1], v2[1]); j <= Math.max(v1[1], v2[1]); j++) {
            list.push([i, j])
        }
    }

    return list
}

exports.stringify = function(tree) {
    let output = ''

    tree.nodes.forEach(function(node) {
        output += ';'

        for (let id in node) {
            if (id.toUpperCase() != id) continue

            if (id == 'CA') {
                // Since we are outputting UTF8-encoded strings no matter what the input
                // encoding was, we need to intercept the CA property and reset it.

                output += 'CA[UTF-8]'
                continue
            }

            output += id + '[' + node[id].map(exports.escapeString).join('][') + ']'
        }

        output += '\n'
    })

    for (let i = 0; i < tree.subtrees.length; i++) {
        output += '(' + exports.stringify(tree.subtrees[i]) + ')'
    }

    return output
}

exports.escapeString = function(input) {
    return input.toString().replace(/\\/g, '\\\\').replace(/\]/g, '\\]')
}

exports.unescapeString = function(input) {
    let result = ''
    let inBackslash = false

    input = helper.normalizeEndings(input)

    for (let i = 0; i < input.length; i++) {
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
