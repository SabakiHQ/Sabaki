let lastPachiIndex = -1
let lastCaptureIndex = -1

let captureSounds = Object.keys(new Int8Array(5)).map(x => new Audio(`./data/capture${x}.mp3`))
let pachiSounds = Object.keys(new Int8Array(5)).map(x => new Audio(`./data/${x}.mp3`))

let newGameSound = new Audio('./data/newgame.mp3')
let passSound = new Audio('./data/pass.mp3')

exports.playPachi = function(delay = 0) {
    let index = lastPachiIndex

    while (index === lastPachiIndex) {
        index = Math.floor(Math.random() * pachiSounds.length)
    }

    lastPachiIndex = index

    setTimeout(() => pachiSounds[index].play(), delay)
}

exports.playCapture = function(delay = 0) {
    let index = lastCaptureIndex

    while (index === lastCaptureIndex) {
        index = Math.floor(Math.random() * captureSounds.length)
    }

    lastCaptureIndex = index

    setTimeout(() => captureSounds[index].play(), delay)
}

exports.playPass = function(delay = 0) {
    setTimeout(() => passSound.play(), delay)
}

exports.playNewGame = function(delay = 0) {
    setTimeout(() => newGameSound.play(), delay)
}
