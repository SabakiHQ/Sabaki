import {readFileSync} from 'fs'
import {decode} from 'iconv-lite'
import {detect} from 'jschardet'
import {fromDimensions} from '@sabaki/go-board'
import {stringifyVertex} from '@sabaki/sgf'
import i18n from '../../i18n.js'
import * as gametree from '../gametree.js'

const t = i18n.context('fileformats')

export const meta = {
  name: t('wBaduk NGF'),
  extensions: ['ngf']
}

export function parse(content) {
  return [
    gametree.new().mutate(draft => {
      let lines = content.split('\n')
      let rootId = draft.root.id

      draft.updateProperty(rootId, 'CA', ['UTF-8'])
      draft.updateProperty(rootId, 'FF', ['4'])
      draft.updateProperty(rootId, 'GM', ['1'])
      draft.updateProperty(rootId, 'SZ', ['19'])

      // These array accesses might throw if out of range, that's fine.
      // The caller will deal with the exception.

      let boardsize = Math.floor(parseFloat(lines[1]))
      let handicap = Math.floor(parseFloat(lines[5]))
      let pw = lines[2].split(' ')[0]
      let pb = lines[3].split(' ')[0]
      let rawdate = lines[8].slice(0, 8)
      let komi = Math.floor(parseFloat(lines[7]))

      if (isNaN(boardsize)) boardsize = 19
      if (isNaN(handicap)) handicap = 0
      if (isNaN(komi)) komi = 0

      let line2 = lines[2].trim().split(' ')
      if (line2.length > 1) {
        let whiterank = line2[line2.length - 1]
        whiterank = whiterank
          .replace('DP', 'p')
          .replace('K', 'k')
          .replace('D', 'd')

        draft.updateProperty(rootId, 'WR', [whiterank])
      }

      let line3 = lines[3].trim().split(' ')
      if (line3.length > 1) {
        let blackrank = line3[line3.length - 1]
        blackrank = blackrank
          .replace('DP', 'p')
          .replace('K', 'k')
          .replace('D', 'd')

        draft.updateProperty(rootId, 'BR', [blackrank])
      }

      if (handicap === 0 && komi === Math.floor(komi)) komi += 0.5

      let winner = ''
      let margin = ''

      if (lines[10].includes('resign')) margin = 'R'
      if (lines[10].includes('time')) margin = 'T'
      if (lines[10].includes('hite win') || lines[10].includes('lack lose'))
        winner = 'W'
      if (lines[10].includes('lack win') || lines[10].includes('hite lose'))
        winner = 'B'

      if (margin === '') {
        let score = null
        let strings = lines[10].split(' ')

        // Try to find score by assuming any float found is the score.

        for (let s of strings) {
          let p = parseFloat(s)
          if (isNaN(p) === false) score = p
        }

        if (score !== null) {
          margin = score.toString()
        }
      }

      if (winner !== '') {
        draft.updateProperty(rootId, 'RE', [`${winner}+${margin}`])
      }

      draft.updateProperty(rootId, 'SZ', [boardsize.toString()])

      if (handicap >= 2) {
        draft.updateProperty(rootId, 'HA', [handicap.toString()])

        let points = fromDimensions(
          boardsize,
          boardsize
        ).getHandicapPlacement(handicap, {tygem: true})

        for (let [x, y] of points) {
          let s = stringifyVertex([x, y])
          draft.addToProperty(rootId, 'AB', s)
        }
      }

      if (komi) {
        draft.updateProperty(rootId, 'KM', [komi.toString()])
      }

      if (rawdate.length === 8) {
        let ok = true

        for (let n = 0; n < 8; n++) {
          let tmp = parseFloat(rawdate.charAt(n))

          if (isNaN(tmp)) {
            ok = false
            break
          }
        }

        if (ok) {
          let date = ''
          date += rawdate.slice(0, 4)
          date += '-' + rawdate.slice(4, 6)
          date += '-' + rawdate.slice(6, 8)

          draft.updateProperty(rootId, 'DT', [date])
        }
      }

      draft.updateProperty(rootId, 'PW', [pw])
      draft.updateProperty(rootId, 'PB', [pb])

      // We currently search for moves in all lines. Current files start moves at line 12.
      // But some older files have less headers and start moves earlier.

      let lastNodeId = rootId

      for (let n = 0; n < lines.length; n++) {
        let line = lines[n].trim()

        if (line.length >= 7) {
          if (line.slice(0, 2) === 'PM') {
            let key = line.charAt(4)

            if (key === 'B' || key === 'W') {
              // Coordinates are letters but with 'B' as the lowest.

              let x = line.charCodeAt(5) - 66
              let y = line.charCodeAt(6) - 66
              let val = stringifyVertex([x, y])

              lastNodeId = draft.appendNode(lastNodeId, {[key]: [val]})
            }
          }
        }
      }
    })
  ]
}

export function parseFile(filename) {
  // NGF files have a huge amount of ASCII-looking text. To help
  // the detector, we just send it the first few lines.

  let buffer = readFileSync(filename)
  let encoding = 'utf8'
  let detected = detect(buffer.slice(0, 200))
  if (detected.confidence > 0.2) encoding = detected.encoding

  let content = decode(buffer, encoding)
  return parse(content)
}
