import fs from 'fs'
import {join} from 'path'
import {ipcRenderer} from 'electron'

// Re-export pure utilities from utils.js for backwards compatibility
export {
  noop,
  getId,
  hash,
  equals,
  shallowEquals,
  vertexEquals,
  lexicalCompare,
  typographer,
  normalizeEndings,
  wait,
  getScore,
} from './utils.js'

export const linebreak = process.platform === 'win32' ? '\r\n' : '\n'

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
        'file',
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
  const processTemplate = (items) => {
    return items.map((item) => {
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
  fs.readdirSync(from).forEach((element) => {
    if (fs.lstatSync(join(from, element)).isFile()) {
      fs.copyFileSync(join(from, element), join(to, element))
    } else {
      copyFolderSync(join(from, element), join(to, element))
    }
  })
}
