var crypto = require('crypto')

exports.md5 = function(str) {
    return crypto.createHash('md5').update(str).digest('hex')
}

exports.pick = function(array) {
    for (var i = 0, l = array.length; i < l; i++){
        if (array[i] != null) return array[i];
    }
    return null;
}
