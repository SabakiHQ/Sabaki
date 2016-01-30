(function(root) {

var context = module.exports
if (typeof module == 'undefined') context = window.sound = {}

var captureSounds = Object.keys(new Int8Array(5)).map(function(x) {
    return new Audio('../sound/capture' + x + '.wav')
})

var pachiSounds = Object.keys(new Int8Array(5)).map(function(x) {
    return new Audio('../sound/' + x + '.wav')
})

var newGameSound = new Audio('../sound/newgame.wav')
var passSound = new Audio('../sound/pass.wav')

context.playCapture = function() {
    captureSounds[Math.floor(Math.random() * captureSounds.length)].play()
}

context.playPachi = function() {
    pachiSounds[Math.floor(Math.random() * pachiSounds.length)].play()
}

context.playNewGame = function() { newGameSound.play() }
context.playPass = function() { passSound.play() }

}).call(null, typeof module != 'undefined' ? module : window)
