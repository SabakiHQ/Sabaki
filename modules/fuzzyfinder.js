const helper = require('./helper')

exports.filter = function(needle, haystack) {
    let result = []

    for (let i = 0; i < haystack.length; i++) {
        let v = generateVector(needle, haystack[i])
        if (v) result.push(v)
    }

    result.sort(helper.lexicalCompare)
    return result.map(x => x[x.length - 1])
}

exports.find = function(needle, haystack) {
    let min = null

    for (let i = 0; i < haystack.length; i++) {
        let v = generateVector(needle, haystack[i])
        if (v && (!min || helper.lexicalCompare(v, min) < 0)) min = v
    }

    return min ? min[min.length - 1] : null
}

function generateVector(needle, hay) {
    // Create a list of the form:
    // [-number of consecutive matches, compactness, position, hay length, hay]

    if (needle == '') return null
    needle = needle.toLowerCase()
    hay = hay.toLowerCase()

    let indices = [-1]
    let v = [0, 0, 0, hay.length, hay]

    for (let i = 0; i < needle.length; i++) {
        let last = indices[indices.length - 1]
        let index = hay.indexOf(needle[i], last + 1)
        if (index == -1) return null
        if (index - last == 1) v[0]--

        indices.push(index)
    }

    v[1] = indices[indices.length - 1] - indices[1]
    v[2] = indices[1]

    return v
}
