(function(root) {

var context = typeof module != 'undefined' ? module.exports : (window.sound = {})
var lastPachiIndex = -1
var lastCaptureIndex = -1

var captureSounds = Object.keys(new Int8Array(5)).map(function(x) {
    return new Audio('../sound/capture' + x + '.mp3')
})

var pachiSounds = Object.keys(new Int8Array(5)).map(function(x) {
    return new Audio('../sound/' + x + '.mp3')
})

var newGameSound = new Audio('../sound/newgame.mp3')
var passSound = new Audio('../sound/pass.mp3')

context.playCapture = function() {
    var index = lastCaptureIndex

    while (index == lastCaptureIndex) {
        index = Math.floor(Math.random() * captureSounds.length)
    }

    lastCaptureIndex = index
    captureSounds[index].play()
}

context.playPachi = function() {
    var index = lastPachiIndex

    while (index == lastPachiIndex) {
        index = Math.floor(Math.random() * pachiSounds.length)
    }

    lastPachiIndex = index
    pachiSounds[index].play()
}

context.playNewGame = function() { newGameSound.play() }
context.playPass = function() { passSound.play() }

}).call(null, typeof module != 'undefined' ? module : window)
