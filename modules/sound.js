(function(root) {

var context = typeof module != 'undefined' ? module.exports : (window.sound = {})

var captureSounds = Object.keys(new Int8Array(5)).map(function(x) {
    return new Audio('../sound/capture' + x + '.mp3')
})

var pachiSounds = Object.keys(new Int8Array(5)).map(function(x) {
    return new Audio('../sound/' + x + '.mp3')
})

var newGameSound = new Audio('../sound/newgame.mp3')
var passSound = new Audio('../sound/pass.mp3')

context.playCapture = function() {
    captureSounds[Math.floor(Math.random() * captureSounds.length)].play()
}

context.playPachi = function() {
    pachiSounds[Math.floor(Math.random() * pachiSounds.length)].play()
}

context.playNewGame = function() { newGameSound.play() }
context.playPass = function() { passSound.play() }

}).call(null, typeof module != 'undefined' ? module : window)
