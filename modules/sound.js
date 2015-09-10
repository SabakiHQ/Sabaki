var captureSounds = Object.keys(new Int8Array(5)).map(function(x) {
    return new Audio('../sound/capture' + x + '.wav')
})

var pachiSounds = Object.keys(new Int8Array(5)).map(function(x) {
    return new Audio('../sound/' + x + '.wav')
})

var newGameSound = new Audio('../sound/newgame.wav')
var passSound = new Audio('../sound/pass.wav')

exports.playCapture = function() {
    captureSounds[Math.floor(Math.random() * 5)].play()
}

exports.playPachi = function() {
    pachiSounds[Math.floor(Math.random() * 5)].play()
}

exports.playNewGame = function() { newGameSound.play() }
exports.playPass = function() { passSound.play() }
