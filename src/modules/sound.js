const helper = require('./helper')

function prepareFunction(sounds) {
    let lastIndex = -1

    return async function(delay) {
        let index = 0

        if (sounds.length === 0) return
        if (sounds.length > 1) {
            index = lastIndex
            while (index === lastIndex) index = Math.floor(Math.random() * sounds.length)
            lastIndex = index
        }

        await helper.wait(delay)
        sounds[index].play().catch(helper.noop)
    }
}

exports.playPachi = prepareFunction([...Array(5)].map((_, i) => new Audio(`./data/${i}.mp3`)))

exports.playCapture = prepareFunction([...Array(5)].map((_, i) => new Audio(`./data/capture${i}.mp3`)))

exports.playPass = prepareFunction([new Audio('./data/pass.mp3')])

exports.playNewGame = prepareFunction([new Audio('./data/newgame.mp3')])
