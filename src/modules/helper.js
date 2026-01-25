import fs from 'fs'
import {join} from 'path'
import {ipcRenderer} from 'electron'

let id = 0

export const linebreak = process.platform === 'win32' ? '\r\n' : '\n'

export function noop() {}

export function getId() {
  return ++id
}

export function hash(str) {
  let chr
  let hash = 0
  if (str.length == 0) return hash

  for (let i = 0; i < str.length; i++) {
    chr = str.charCodeAt(i)
    hash = (hash << 5) - hash + chr
    hash = hash & hash
  }

  return hash
}

export function equals(a, b) {
  if (a === b) return true
  if (a == null || b == null) return a == b

  let t = Object.prototype.toString.call(a)
  if (t !== Object.prototype.toString.call(b)) return false

  let aa = t === '[object Array]'
  let ao = t === '[object Object]'

  if (aa) {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) if (!equals(a[i], b[i])) return false
    return true
  } else if (ao) {
    let kk = Object.keys(a)
    if (kk.length !== Object.keys(b).length) return false
    for (let i = 0; i < kk.length; i++) {
      let k = kk[i]
      if (!(k in b)) return false
      if (!equals(a[k], b[k])) return false
    }
    return true
  }

  return false
}

export function shallowEquals(a, b) {
  return a == null || b == null
    ? a === b
    : a === b || (a.length === b.length && a.every((x, i) => x == b[i]))
}

export function vertexEquals([a, b], [c, d]) {
  return a === c && b === d
}

export function lexicalCompare(a, b) {
  if (!a.length || !b.length) return a.length - b.length
  return a[0] < b[0]
    ? -1
    : a[0] > b[0]
    ? 1
    : lexicalCompare(a.slice(1), b.slice(1))
}

export function typographer(input) {
  return input
    .replace(/\.{3}/g, '…')
    .replace(/(\S)'/g, '$1’')
    .replace(/(\S)"/g, '$1”')
    .replace(/'(\S)/g, '‘$1')
    .replace(/"(\S)/g, '“$1')
    .replace(/(\s)-(\s)/g, '$1–$2')
}

export function normalizeEndings(input) {
  return input.replace(/\r/g, '')
}

export function isTextLikeElement(element) {
  return (
    ['textarea', 'select'].includes(element.tagName.toLowerCase()) ||
    (element.tagName.toLowerCase() === 'input' &&
      ![
        'submit',
        'reset',
        'button',
        'checkbox',
        'radio',
        'color',
        'file'
      ].includes(element.type))
  )
}

// Store click handlers for popup menus
const menuClickHandlers = new Map()
let menuIdCounter = 0

// Listen for menu click events from main process
ipcRenderer.on('menu-click', (event, menuItemId) => {
  const handler = menuClickHandlers.get(menuItemId)
  if (handler) {
    handler()
  }
})

export function popupMenu(template, x, y) {
  // Clear old handlers
  menuClickHandlers.clear()

  // Process template to extract click handlers and assign IDs
  const processTemplate = items => {
    return items.map(item => {
      if (!item) return item

      const newItem = {...item}

      if (typeof item.click === 'function') {
        const menuItemId = `popup-menu-${++menuIdCounter}`
        menuClickHandlers.set(menuItemId, item.click)
        newItem.id = menuItemId
        delete newItem.click // Remove function, main process will use the id
      }

      if (item.submenu) {
        newItem.submenu = processTemplate(item.submenu)
      }

      return newItem
    })
  }

  const processedTemplate = processTemplate(template)
  window.sabaki.menu.popup(processedTemplate, x, y)
}

export function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function isWritableDirectory(path) {
  if (path == null) return false

  let fileStats = null

  try {
    fileStats = fs.statSync(path)
  } catch (err) {}

  if (fileStats != null) {
    if (fileStats.isDirectory()) {
      try {
        fs.accessSync(path, fs.W_OK)
        return true
      } catch (err) {}
    }

    // Path exists, either no write permissions to directory or path is not a directory
    return false
  } else {
    // Path doesn't exist
    return false
  }
}

export function copyFolderSync(from, to) {
  fs.mkdirSync(to)
  fs.readdirSync(from).forEach(element => {
    if (fs.lstatSync(join(from, element)).isFile()) {
      fs.copyFileSync(join(from, element), join(to, element))
    } else {
      copyFolderSync(join(from, element), join(to, element))
    }
  })
}

export function getScore(board, areaMap, {komi = 0, handicap = 0} = {}) {
  let score = {
    area: [0, 0],
    territory: [0, 0],
    captures: [1, -1].map(sign => board.getCaptures(sign))
  }

  for (let x = 0; x < board.width; x++) {
    for (let y = 0; y < board.height; y++) {
      let z = areaMap[y][x]
      let index = z > 0 ? 0 : 1

      score.area[index] += Math.abs(Math.sign(z))
      if (board.get([x, y]) === 0)
        score.territory[index] += Math.abs(Math.sign(z))
    }
  }

  score.area = score.area.map(Math.round)
  score.territory = score.territory.map(Math.round)

  score.areaScore = score.area[0] - score.area[1] - komi - handicap
  score.territoryScore =
    score.territory[0] -
    score.territory[1] +
    score.captures[0] -
    score.captures[1] -
    komi

  return score
}
