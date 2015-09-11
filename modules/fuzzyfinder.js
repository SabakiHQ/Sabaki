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
    // [compactness, difference of indices, position, hay]

    if (needle == '') return null
    var v = [-1]
    var last = -1

    for (var i = 0; i < needle.length; i++) {
        var index = hay.indexOf(needle[i], last + 1)
        if (index == -1) return null
        v.push(index - last)
        last = index
    }

    v.push(v[1] - 1)
    v.splice(0, 2, last - v[1] + 1)
    v.push(hay)
    return v
}

function lexicalSort(a, b) {
    if (!a.length || !b.length) return a.length - b.length
    return a[0] < b[0] ? -1 : (a[0] > b[0] ? 1 : lexicalSort(a.slice(1), b.slice(1)))
}
