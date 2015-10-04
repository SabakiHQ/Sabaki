exports.filter = function(needle, haystack) {
    var result = []

    for (var i = 0; i < haystack.length; i++) {
        var v = generateVector(needle, haystack[i])
        if (v) result.push(v)
    }

    result.sort(lexicalSort)
    return result.map(function(x) { return x[x.length - 1] })
}

exports.find = function(needle, haystack) {
    var min = null

    for (var i = 0; i < haystack.length; i++) {
        var v = generateVector(needle, haystack[i])
        if (v && (!min || lexicalSort(v, min) < 0)) min = v
    }

    return min ? min[min.length - 1] : null
}

function generateVector(needle, hay) {
    // Create a list of the form:
    // [-number of consecutive matches, compactness, position, hay length, hay]

    if (needle == '') return null
    needle = needle.toLowerCase()
    hay = hay.toLowerCase()

    var indices = [-1]
    var v = [0, 0, 0, hay.length, hay]

    for (var i = 0; i < needle.length; i++) {
        var last = indices[indices.length - 1]
        var index = hay.indexOf(needle[i], last + 1)
        if (index == -1) return null
        if (index - last == 1) v[0]--

        indices.push(index)
    }

    v[1] = indices[indices.length - 1] - indices[1]
    v[2] = indices[1]

    return v
}

function lexicalSort(a, b) {
    if (!a.length || !b.length) return a.length - b.length
    return a[0] < b[0] ? -1 : (a[0] > b[0] ? 1 : lexicalSort(a.slice(1), b.slice(1)))
}
