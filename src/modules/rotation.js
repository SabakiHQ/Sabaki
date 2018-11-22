const simple = ['AB', 'AW', 'AE', 'B', 'CR', 'DD', 'MA', 'SL', 'SQ', 'TB', 'TR', 'TW', 'VW', 'W']
const pointWithText = ['LB']
const arrowish = ['AR', 'LN']

const alpha = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
const alphaRev = [...alpha].reverse()

// Special functions that return the "min" and "max"
// for the SGF coordinate system...
//
// a-z : 1-26
// A-Z : 27-52
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

exports.rotatePoint = function(point, width, height, anticlockwise) {
    // returns null on failure; point is something like "aa"

    if (typeof point !== 'string') return null
    if (point.length !== 2) return null

    if (typeof width !== 'number') return null
    if (width < 1 || width > 52) return null

    if (typeof height !== 'number') return null
    if (height < 1 || height > 52) return null

    let index0 = alpha.indexOf(point[0])
    let index1 = alpha.indexOf(point[1])

    if (index0 === -1 || index1 === -1) return null

    if (anticlockwise) {
        let rev = alphaRev.slice(52 - width)
        return point[1] + rev[index0]
    } else {
        let rev = alphaRev.slice(52 - height)
        return rev[index1] + point[0]
    }
}

exports.rotateTwoPoints = function(twopoints, width, height, anticlockwise, isRect) {
    // returns null on failure; twopoints is something like "aa:cc"

    if (typeof twopoints !== 'string') return null
    if (twopoints.length !== 5) return null
    if (twopoints[2] !== ':') return null

    let first = twopoints.slice(0, 2)
    let second = twopoints.slice(3, 5)

    first = exports.rotatePoint(first, width, height, anticlockwise)
    second = exports.rotatePoint(second, width, height, anticlockwise)

    if (first === null || second === null) {
        return null
    }

    // For a rectangle (e.g. anything except line / arrow) we
    // need to make the format topleft : bottomright

    if (isRect) {
        return min(first[0], second[0])
            + min(first[1], second[1])
            + ':' + max(first[0], second[0])
            + max(first[1], second[1])
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
        let rotateNode = node => {
            // 'simple' cases are either a single point (e.g. "aa") or a rect (e.g. "aa:cc")

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

            // 'pointWithText' means something like "aa:hi there"

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

            // Rotate children

            for (let child of node.children) {
                rotateNode(child)
            }
        }

        rotateNode(draft.root)

        if (draft.root.data.SZ != null && draft.root.data.SZ.include(':')) {
            draft.updateProperty(draft.root.id, 'SZ', draft.root.data.SZ.split(':').reverse().join(':'))
        }
    })
}
