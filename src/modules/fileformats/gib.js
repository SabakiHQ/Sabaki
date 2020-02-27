import {readFileSync} from 'fs'
import {decode} from 'iconv-lite'
import {detect} from 'jschardet'
import {fromDimensions} from '@sabaki/go-board'
import {stringifyVertex} from '@sabaki/sgf'
import i18n from '../../i18n.js'
import * as gametree from '../gametree.js'

const t = i18n.context('fileformats')

export const meta = {
  name: t('Tygem GIB'),
  extensions: ['gib']
}

function makeResult(grlt, zipsu) {
  // Arguments are expected to be numbers
  // Given a game result type and a score, return a text result.

  // The GRLT tag contains the type of result:
  // 0: B+n   1: W+n   3: B+R   4: W+R   7: B+T   8: W+T

  let easycases = {'3': 'B+R', '4': 'W+R', '7': 'B+T', '8': 'W+T'}

  if (easycases[grlt] !== undefined) {
    return easycases[grlt]
  }

  // If there is a score, the ZIPSU tag contains it (multiplied by 10).

  if (grlt === 0 || grlt === 1) {
    let winner = grlt === 0 ? 'B' : 'W'
    let margin = (zipsu / 10).toString()
    return winner + '+' + margin
  }

  // We couldn't work it out...

  return ''
}

function getResult(line, grltRegex, zipsuRegex) {
  // Takes a line and two regexes, the first finding the GRLT (game
  // result type, e.g. 3 == B+R) and the second finding the score.

  let result = ''
  let match = grltRegex.exec(line)

  if (match) {
    let grlt = parseFloat(match[1])
    match = zipsuRegex.exec(line)
    if (match) {
      let zipsu = parseFloat(match[1])
      result = makeResult(grlt, zipsu)
    }
  }

  return result
}

function parsePlayerName(raw) {
  let name = ''
  let rank = ''

  // If there's exactly one opening bracket...

  let foo = raw.split('(')
  if (foo.length === 2) {
    // And if the closing bracket is right at the end...

    if (foo[1].indexOf(')') === foo[1].length - 1) {
      // Then extract the rank...

      name = foo[0].trim()
      rank = foo[1].slice(0, foo[1].length - 1)
    }
  }

  if (name === '') {
    return [raw, '']
  } else {
    return [name, rank]
  }
}

export function parse(content) {
  return [
    gametree.new().mutate(draft => {
      let lines = content.split('\n')
      let rootId = draft.root.id
      let lastNodeId = rootId

      draft.updateProperty(rootId, 'CA', ['UTF-8'])
      draft.updateProperty(rootId, 'FF', ['4'])
      draft.updateProperty(rootId, 'GM', ['1'])
      draft.updateProperty(rootId, 'SZ', ['19'])

      for (let n = 0; n < lines.length; n++) {
        let line = lines[n].trim()

        if (line.startsWith('\\[GAMEBLACKNAME=') && line.endsWith('\\]')) {
          let s = line.slice(16, -2)
          let [name, rank] = parsePlayerName(s)

          if (name) draft.updateProperty(rootId, 'PB', [name])
          if (rank) draft.updateProperty(rootId, 'BR', [rank])
        } else if (
          line.startsWith('\\[GAMEWHITENAME=') &&
          line.endsWith('\\]')
        ) {
          let s = line.slice(16, -2)
          let [name, rank] = parsePlayerName(s)

          if (name) draft.updateProperty(rootId, 'PW', [name])
          if (rank) draft.updateProperty(rootId, 'WR', [rank])
        } else if (line.startsWith('\\[GAMEINFOMAIN=')) {
          if (draft.root.data.RE == null) {
            let result = getResult(line, /GRLT:(\d+),/, /ZIPSU:(\d+),/)
            if (result !== '') draft.updateProperty(rootId, 'RE', [result])
          }

          if (draft.root.data.KM == null) {
            let regex = /GONGJE:(\d+),/
            let match = regex.exec(line)

            if (match) {
              let komi = parseFloat(match[1]) / 10
              draft.updateProperty(rootId, 'KM', [komi.toString()])
            }
          }
        } else if (line.startsWith('\\[GAMETAG=')) {
          if (draft.root.data.DT == null) {
            let regex = /C(\d\d\d\d):(\d\d):(\d\d)/
            let match = regex.exec(line)

            if (match)
              draft.updateProperty(rootId, 'DT', [match.slice(1, 4).join('-')])
          }

          if (draft.root.data.RE == null) {
            let result = getResult(line, /,W(\d+),/, /,Z(\d+),/)

            if (result !== '') draft.updateProperty(rootId, 'RE', [result])
          }

          if (draft.root.data.KM == null) {
            let regex = /,G(\d+),/
            let match = regex.exec(line)

            if (match) {
              let komi = parseFloat(match[1]) / 10
              draft.updateProperty(rootId, 'KM', [komi.toString()])
            }
          }
        } else if (line.slice(0, 3) === 'INI') {
          let setup = line.split(' ')
          let handicap = 0

          let p = Math.floor(parseFloat(setup[3]))
          if (!isNaN(p)) handicap = p

          if (handicap >= 2 && handicap <= 9) {
            draft.updateProperty(rootId, 'HA', [handicap.toString()])

            let points = fromDimensions(19, 19).getHandicapPlacement(handicap, {
              tygem: true
            })

            for (let [x, y] of points) {
              let s = stringifyVertex([x, y])
              draft.addToProperty(rootId, 'AB', s)
            }
          }
        } else if (line.slice(0, 3) === 'STO') {
          let elements = line.split(' ')
          if (elements.length < 6) continue

          let key = elements[3] === '1' ? 'B' : 'W'
          let x = Math.floor(parseFloat(elements[4]))
          let y = Math.floor(parseFloat(elements[5]))
          if (isNaN(x) || isNaN(y)) continue

          let val = stringifyVertex([x, y])
          lastNodeId = draft.appendNode(lastNodeId, {[key]: [val]})
        }
      }
    })
  ]
}

export function parseFile(filename) {
  let buffer = readFileSync(filename)
  let encoding = 'utf8'
  let detected = detect(buffer)
  if (detected.confidence > 0.2) encoding = detected.encoding

  let content = decode(buffer, encoding)
  return parse(content)
}
