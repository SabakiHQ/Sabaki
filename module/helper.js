var crypto = require('crypto')

exports.md5 = function(str) {
    return crypto.createHash('md5').update(str).digest('hex')
}

exports.pick = function(array) {
    for (var i = 0; i < array.length; i++){
        if (array[i] != null) return array[i];
    }
    return null;
}

exports.roundEven = function(float) {
    var value = Math.round(float)
    return value % 2 == 0 ? value : value - 1
}
