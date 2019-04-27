const simple = ['AB', 'AW', 'AE', 'B', 'CR', 'DD', 'MA', 'SL', 'SQ', 'TB', 'TR', 'TW', 'VW', 'W']
const pointWithText = ['LB']
const arrowish = ['AR', 'LN']

const alpha = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
const alphaRev = [...alpha].reverse()

const colorInvertMap = {
    'AB': 'AW',
    'AW': 'AB',
    'B': 'W',
    'W': 'B',
}

// Special functions that return the "min" and "max"
// for the SGF coordinate system...
//
// a-z : 0-25
// A-Z : 26-51
//
// Note that lowercase has higher ASCII value,
// but is considered lower in the SGF system.

function min(one, two) {
    // In case exactly one is lowercase, return it...

    if (one >= 'a' && two <= 'Z') return one
    if (one <= 'Z' && two >= 'a') return two

    // Same case...

    if (one < two) return one
    return two
}

function max(one, two) {
    if (one >= 'a' && two <= 'Z') return two
    if (one <= 'Z' && two >= 'a') return one
    if (one < two) return two
    return one
}

function pointIntegers(point, width, height) {
    // point is something like 'ae'
    // Returns [null, null] on failure; otherwise returns something like [0,4]

    if (typeof point !== 'string' || point.length !== 2) return [null, null]
    let index0 = alpha.indexOf(point[0])
    let index1 = alpha.indexOf(point[1])
    if (index0 === -1 || index1 === -1 || index0 >= width || index1 >= height) return [null, null]
    return [index0, index1]
}

function extractTwoPoints(s) {
    // s is something like 'aa:cc'
    // Returns [null, null] on failure; otherwise returns something like ['aa','cc']

    if (typeof s !== 'string' || s.length !== 5 || s[2] !== ':') return [null, null]
    return [s.slice(0, 2), s.slice(3, 5)]
}

function fixedRectangle(first, second) {
    // Given two SGF formatted corners of a rectangle, e.g. 'ch' and 'fc',
    // return a string using top-left : bottom-right format, e.g. 'cc:fh'

    return min(first[0], second[0]) + min(first[1], second[1])
    + ':' + max(first[0], second[0]) + max(first[1], second[1])
}

exports.rotatePoint = function(point, width, height, anticlockwise) {
    // Returns null on failure; point is something like 'ae'

    let [x, y] = pointIntegers(point, width, height)
    if (x === null || y === null) return null

    if (anticlockwise) {
        let rev = alphaRev.slice(52 - width)
        return point[1] + rev[x]
    } else {
        let rev = alphaRev.slice(52 - height)
        return rev[y] + point[0]
    }
}

exports.rotateTwoPoints = function(twopoints, width, height, anticlockwise, isRect) {
    // Returns null on failure; twopoints is something like 'aa:cc'

    let [first, second] = extractTwoPoints(twopoints)
    first = exports.rotatePoint(first, width, height, anticlockwise)
    second = exports.rotatePoint(second, width, height, anticlockwise)
    if (first === null || second === null) return null

    // For a rectangle (e.g. anything except line / arrow) we
    // need to make the format topleft : bottomright

    if (isRect) {
        return fixedRectangle(first, second)
    } else {
        return first + ':' + second
    }
}

exports.rotateRect = function(twopoints, width, height, anticlockwise) {
    return exports.rotateTwoPoints(twopoints, width, height, anticlockwise, true)
}

exports.rotateArrow = function(twopoints, width, height, anticlockwise) {
    return exports.rotateTwoPoints(twopoints, width, height, anticlockwise, false)
}

exports.rotateTree = function(tree, width, height, anticlockwise) {
    return tree.mutate(draft => {
        for (let node of tree.listNodes()) {
            // 'simple' cases are either a single point (e.g. 'aa') or a rect (e.g. 'aa:cc')

            for (let key of simple) {
                if (node.data[key] == null) continue

                draft.updateProperty(node.id, key, node.data[key].map(value => {
                    if (value.length === 2) {
                        let result = exports.rotatePoint(value, width, height, anticlockwise)
                        if (result) return result
                    } else if (value.length === 5 && value[2] === ':') {
                        let result = exports.rotateRect(value, width, height, anticlockwise)
                        if (result) return result
                    }

                    return value
                }))
            }

            // 'pointWithText' means something like 'aa:hi there'

            for (let key of pointWithText) {
                if (node.data[key] == null) continue

                draft.updateProperty(node.id, key, node.data[key].map(value => {
                    if (value[2] === ':') {
                        let point = value.slice(0, 2)

                        point = exports.rotatePoint(point, width, height, anticlockwise)
                        if (point) return point + value.slice(2)
                    }

                    return value
                }))
            }

            // 'arrowish' things are formatted like rects, but with no requirement of topleft:bottomright

            for (let key of arrowish) {
                if (node.data[key] == null) continue

                draft.updateProperty(node.id, key, node.data[key].map(value => {
                    if (value[2] === ':') {
                        let result = exports.rotateArrow(value, width, height, anticlockwise)
                        if (result) return result
                    }

                    return value
                }))
            }
        }

        if (draft.root.data.SZ != null && draft.root.data.SZ[0].includes(':')) {
            draft.updateProperty(draft.root.id, 'SZ', [draft.root.data.SZ[0].split(':').reverse().join(':')])
        }
    })
}

exports.flipPoint = function(point, width, height, horizontal) {
    // Returns null on failure; point is something like 'ae'

    let [x, y] = pointIntegers(point, width, height)
    if (x === null || y === null) return null

    if (horizontal) {
        let rev = alphaRev.slice(52 - width)
        return rev[x] + point[1]
    } else {
        let rev = alphaRev.slice(52 - height)
        return point[0] + rev[y]
    }
}

exports.flipTwoPoints = function(twopoints, width, height, horizontal, isRect) {
    // Returns null on failure; twopoints is something like 'aa:cc'

    let [first, second] = extractTwoPoints(twopoints)
    first = exports.flipPoint(first, width, height, horizontal)
    second = exports.flipPoint(second, width, height, horizontal)
    if (first === null || second === null) return null

    // For a rectangle (e.g. anything except line / arrow) we
    // need to make the format topleft : bottomright

    if (isRect) {
        return fixedRectangle(first, second)
    } else {
        return first + ':' + second
    }
}

exports.flipRect = function(twopoints, width, height, horizontal) {
    return exports.flipTwoPoints(twopoints, width, height, horizontal, true)
}

exports.flipArrow = function(twopoints, width, height, horizontal) {
    return exports.flipTwoPoints(twopoints, width, height, horizontal, false)
}

exports.flipTree = function(tree, width, height, horizontal) {
    return tree.mutate(draft => {
        for (let node of tree.listNodes()) {
            for (let key of simple) {
                if (node.data[key] == null) continue

                draft.updateProperty(node.id, key, node.data[key].map(value => {
                    if (value.length === 2) {
                        let result = exports.flipPoint(value, width, height, horizontal)
                        if (result) return result
                    } else if (value.length === 5 && value[2] === ':') {
                        let result = exports.flipRect(value, width, height, horizontal)
                        if (result) return result
                    }

                    return value
                }))
            }

            // 'pointWithText' means something like 'aa:hi there'

            for (let key of pointWithText) {
                if (node.data[key] == null) continue

                draft.updateProperty(node.id, key, node.data[key].map(value => {
                    if (value[2] === ':') {
                        let point = value.slice(0, 2)

                        point = exports.flipPoint(point, width, height, horizontal)
                        if (point) return point + value.slice(2)
                    }

                    return value
                }))
            }

            // 'arrowish' things are formatted like rects, but with no requirement of topleft:bottomright

            for (let key of arrowish) {
                if (node.data[key] == null) continue

                draft.updateProperty(node.id, key, node.data[key].map(value => {
                    if (value[2] === ':') {
                        let result = exports.flipArrow(value, width, height, horizontal)
                        if (result) return result
                    }

                    return value
                }))
            }
        }
    })
}

exports.invertTreeColors = function(tree) {
    return tree.mutate(draft => {
        for (let node of tree.listNodes()) {
            let newProperties = {}

            for (let key of Object.keys(colorInvertMap)) {
                let data = node.data[key]
                if (data == null) continue

                let newKey = colorInvertMap[key]
                newProperties[newKey] = data
                draft.removeProperty(node.id, key)
            }

            for (let key of Object.keys(newProperties)) {
                draft.updateProperty(node.id, key, newProperties[key])
            }
        }
    })
}
