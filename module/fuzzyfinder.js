exports.find = function(needle, haystack) {
    needle = removeSpecialChars(needle)
    if (needle.trim() == '') return []

    var regex = new RegExp(needle.split('').join('.*?'))

    var result = haystack.map(function(s) {
        var info = regex.exec(s)
        if (!info) return null
        return [info[0].length, info.index, info.input]
    }).filter(function(s) { return s != null })

    result.sort(lexicalSort)
    return result.map(function(x) { return x[2] })
}

function removeSpecialChars(input) {
    return input.replace(/[.*+?^${}()|[\]\\]/g, '')
}

function lexicalSort(a, b) {
    if (!a.length || !b.length) return a.length - b.length
    return a[0] < b[0] ? -1 : (a[0] > b[0] ? 1 : lexicalSort(a.slice(1), b.slice(1)))
}
