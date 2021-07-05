import * as remote from '@electron/remote'
import {wait} from './helper.js'

const setting = remote.require('./setting')

function prepareFunction(sounds) {
  let lastIndex = -1

  return async (delay = 0) => {
    try {
      let index = 0

      if (sounds.length === 0) return
      if (sounds.length > 1) {
        index = lastIndex
        while (index === lastIndex)
          index = Math.floor(Math.random() * sounds.length)
        lastIndex = index
      }

      await wait(delay)
      await sounds[index].play()
    } catch (err) {
      // Do nothing
    }
  }
}

export const playPachi = prepareFunction(
  [...Array(5)].map((_, i) => new Audio(`./data/${i}.mp3`))
)

export const playCapture = (() => {
  let f = prepareFunction(
    [...Array(5)].map((_, i) => new Audio(`./data/capture${i}.mp3`))
  )

  return async delay => {
    if (delay == null) {
      delay = setting.get('sound.capture_delay_min')
      delay += Math.floor(
        Math.random() * (setting.get('sound.capture_delay_max') - delay)
      )
    }

    await f(delay)
  }
})()

export const playPass = prepareFunction([new Audio('./data/pass.mp3')])

export const playNewGame = prepareFunction([new Audio('./data/newgame.mp3')])
