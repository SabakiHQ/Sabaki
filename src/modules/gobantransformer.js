exports.normalize = function(transformation) {
    // Change transformation so that we rotate first, then flip
    // i.e. replace 'fr' by 'rrrf'

    transformation = [...transformation].filter(c => 'rf'.includes(c))

    while (true) {
        let firstFlipIndex = transformation.findIndex((c, i, t) => c === 'f' && t[i + 1] === 'r')
        if (firstFlipIndex < 0) break

        transformation.splice(firstFlipIndex, 2, ...'rrrf')
    }

    // Eliminate unnecessary rotations/flips
    // i.e. remove full rotations and double flips

    return transformation.join('').replace(/(rrrr|ff)/g, '')
}

exports.invert = function(transformation) {
    transformation = [...exports.normalize(transformation)]

    let result = ''
    let flipped = transformation.slice(-1)[0] === 'f'
    if (flipped) result += 'f'

    let rotations = transformation.length - +flipped
    result += Array((rotations * 3) % 4).fill('r').join('')

    return exports.normalize(result)
}

exports.transformSize = function(width, height, transformation) {
    let rotations = [...transformation].filter(c => c === 'r').length
    if (rotations % 2 === 1) [width, height] = [height, width]

    return {width, height}
}

exports.transformCoords = function(coordX, coordY, transformation, width, height) {
    let inverse = exports.invert(transformation)
    let rotations = [...transformation].filter(c => c === 'r').length
    let sidesSwapped = rotations % 2 === 1
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
    transformation = [...exports.normalize(transformation)]

    let {width: newWidth, height: newHeight} = exports.transformSize(width, height, transformation)
    let [x, y] = transformation.reduce(([x, y], c) =>
        c === 'f' ? [-x - 1, y] : [-y - 1, x],
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

exports.transformMap = function(map, transformation) {
    let inverse = exports.invert(transformation)
    let {width, height} = exports.transformSize(map.length === 0 ? 0 : map[0].length, map.length, inverse)

    return [...Array(height)].map((_, y) => [...Array(width)].map((__, x) => {
        let [ix, iy] = exports.transformVertex([x, y], inverse, width, height)
        return map[iy][ix]
    }))
}
