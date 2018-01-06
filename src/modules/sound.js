const helper = require('./helper')

let lastPachiIndex = -1
let lastCaptureIndex = -1

let captureSounds = [...Array(5)].map((_, i) => new Audio(`./data/capture${i}.mp3`))
let pachiSounds = [...Array(5)].map((_, i) => new Audio(`./data/${i}.mp3`))

let newGameSound = new Audio('./data/newgame.mp3')
let passSound = new Audio('./data/pass.mp3')

exports.playPachi = function(delay = 0) {
    let index = lastPachiIndex

    while (index === lastPachiIndex) {
        index = Math.floor(Math.random() * pachiSounds.length)
    }

    lastPachiIndex = index

    setTimeout(() => pachiSounds[index].play().catch(helper.noop), delay)
}

exports.playCapture = function(delay = 0) {
    let index = lastCaptureIndex

    while (index === lastCaptureIndex) {
        index = Math.floor(Math.random() * captureSounds.length)
    }

    lastCaptureIndex = index

    setTimeout(() => captureSounds[index].play().catch(helper.noop), delay)
}

exports.playPass = function(delay = 0) {
    setTimeout(() => passSound.play().catch(helper.noop), delay)
}

exports.playNewGame = function(delay = 0) {
    setTimeout(() => newGameSound.play().catch(helper.noop), delay)
}
