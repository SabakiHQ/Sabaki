if (!Array.prototype.includes) {
    Array.prototype.includes = function(searchElement) {
        return this.indexOf(searchElement) >= 0
    }
}

// The following ES6 polyfills are taken from MDN

if (typeof Object.assign != 'function') {
    Object.assign = function(target) {
        target = Object(target)
        for (var index = 1; index < arguments.length; index++) {
            var source = arguments[index]

            if (source != null) {
                for (var key in source) {
                    if (Object.prototype.hasOwnProperty.call(source, key)) {
                        target[key] = source[key]
                    }
                }
            }
        }
        return target
    }
}

if (!Array.prototype.fill) {
    Array.prototype.fill = function(value) {
        var O = Object(this)

        var len = O.length >>> 0
        var start = 0 >> 0
        var k = start < 0 ? Math.max(len + start, 0) : Math.min(start, len)
        var end = O.length >> 0
        var final = end < 0 ? Math.max(len + end, 0) : Math.min(end, len)

        while (k < final) {
            O[k] = value
            k++
        }

        return O
    }
}

Math.sign = Math.sign || function(x) {
    x = +x
    if (x === 0 || isNaN(x)) return x
    return x > 0 ? 1 : -1
}
