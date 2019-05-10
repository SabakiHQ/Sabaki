exports.normalize = function(transformation) {
    // Change transformation so that we rotate first, flip next, then invert
    // i.e. replace 'fr' by 'rrrf', 'if' by 'fi', 'ir' by 'ri'
    //
    // 'i' denotes a color inversion
    // 'r' denotes a clockwise rotation
    // 'f' denotes a horizontal flip

    let inversions = [...transformation].filter(c => c === 'i').length
    let rf = [...transformation].filter(c => 'rf'.includes(c))

    while (true) {
        let firstFlipIndex = rf.findIndex((c, i, arr) => c === 'f' && arr[i + 1] === 'r')
        if (firstFlipIndex < 0) break

        rf.splice(firstFlipIndex, 2, ...'rrrf')
    }

    // Eliminate unnecessary rotations/flips
    // i.e. remove full rotations, double flips

    return rf.join('').replace(/(rrrr|ff)/g, '') + (inversions % 2 === 1 ? 'i' : '')
}

exports.invert = function(transformation) {
    transformation = exports.normalize(transformation)

    let result = ''
    let flipped = transformation.includes('f')
    let inverted = transformation.includes('i')

    if (flipped) result += 'f'
    if (inverted) result += 'i'

    let rotations = transformation.length - +flipped - +inverted
    result += Array(4 - rotations % 4).fill('r').join('')

    return exports.normalize(result)
}

exports.transformationSwapsSides = function(transformation) {
    let rotations = [...transformation].filter(c => c === 'r').length
    return rotations % 2 === 1
}

exports.transformSize = function(width, height, transformation) {
    if (exports.transformationSwapsSides(transformation)) [width, height] = [height, width]

    return {width, height}
}

exports.transformCoords = function(coordX, coordY, transformation, width, height) {
    let inverse = exports.invert(transformation)
    let sidesSwapped = exports.transformationSwapsSides(transformation)
    if (sidesSwapped) [width, height] = [height, width]

    let inner = v => {
        let [x, y] = exports.transformVertex(v, inverse, width, height)
        return [coordX(x), coordY(y)]
    }

    return {
        coordX: x => inner([x, 0])[!sidesSwapped ? 0 : 1],
        coordY: y => inner([0, y])[!sidesSwapped ? 1 : 0]
    }
}

exports.transformVertex = function(vertex, transformation, width, height) {
    let {width: newWidth, height: newHeight} = exports.transformSize(width, height, transformation)
    let [x, y] = [...transformation].reduce(([x, y], c) =>
        c === 'f' ? [-x - 1, y]
        : c === 'r' ? [-y - 1, x]
        : [x, y],
        vertex
    )

    return [(x + newWidth) % newWidth, (y + newHeight) % newHeight]
}

exports.transformLine = function(line, transformation, width, height) {
    let transform = v => exports.transformVertex(v, transformation, width, height)

    return Object.assign({}, line, {
        v1: transform(line.v1),
        v2: transform(line.v2)
    })
}

exports.transformMap = function(map, transformation, {ignoreInvert = false} = {}) {
    let inverse = exports.invert(transformation)
    let inverted = inverse.includes('i')
    let {width, height} = exports.transformSize(map.length === 0 ? 0 : map[0].length, map.length, inverse)

    return [...Array(height)].map((_, y) => [...Array(width)].map((__, x) => {
        let [ix, iy] = exports.transformVertex([x, y], inverse, width, height)
        let entry = map[iy][ix]

        if (!ignoreInvert && inverted && entry != null) {
            if (typeof entry === 'number') entry = -entry
            else if (entry.sign != null) entry.sign = -entry.sign
        }

        return entry
    }))
}
