exports.find = function(needle, haystack) {
    needle = removeSpecialChars(needle)
    if (needle.trim() == '') return []

    var regex = new RegExp(needle.split('').join('.*?'))

    var result = haystack.map(function(s) {
        var info = regex.exec(s)
        if (!info) return null
        return [info[0].length, info.index, info.input]
    }).filter(function(s) { return s != null })

    result.sort()
    return result.map(function(x) { return x[2] })
}

function removeSpecialChars(input) {
    return input.replace(/[.*+?^${}()|[\]\\]/g, '')
}
