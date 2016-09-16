let lastPachiIndex = -1
let lastCaptureIndex = -1

let captureSounds = Object.keys(new Int8Array(5)).map(x => new Audio(`../sound/capture${x}.mp3`))
let pachiSounds = Object.keys(new Int8Array(5)).map(x => new Audio(`../sound/${x}.mp3`))

let newGameSound = new Audio('../sound/newgame.mp3')
let passSound = new Audio('../sound/pass.mp3')

exports.playCapture = function() {
    let index = lastCaptureIndex

    while (index == lastCaptureIndex) {
        index = Math.floor(Math.random() * captureSounds.length)
    }

    lastCaptureIndex = index
    captureSounds[index].play()
}

exports.playPachi = function() {
    let index = lastPachiIndex

    while (index == lastPachiIndex) {
        index = Math.floor(Math.random() * pachiSounds.length)
    }

    lastPachiIndex = index
    pachiSounds[index].play()
}

exports.playNewGame = function() { newGameSound.play() }
exports.playPass = function() { passSound.play() }
