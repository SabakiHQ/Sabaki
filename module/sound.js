var captureSounds = Object.keys(new Int8Array(5)).map(function(x) {
    return new Audio('../sound/capture' + x + '.wav')
})

var pachiSounds = Object.keys(new Int8Array(5)).map(function(x) {
    return new Audio('../sound/' + x + '.wav')
})

exports.playCaptureSound = function() {
    captureSounds[Math.floor(Math.random() * 5)].play()
}

exports.playPachiSound = function() {
    pachiSounds[Math.floor(Math.random() * 5)].play()
}

exports.playPassSound = function() {
    new Audio('../sound/pass.wav').play()
}
