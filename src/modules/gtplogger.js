import * as remote from '@electron/remote'
import winston from 'winston'
import {resolve, join} from 'path'

import i18n from '../i18n.js'
import {showMessageBox} from './dialog.js'
import * as helper from './helper.js'

const t = i18n.context('gtplogger')
const setting = remote.require('./setting')

let filename = null

let winstonLogger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp({format: 'YYYY-MM-DD HH:mm:ss.SSS'}),
    winston.format.printf(info => `\[${info.timestamp}\] ${info.message}`)
  ),
  handleExceptions: false,
  exitOnError: false
})

export function write(stream) {
  let enabled = setting.get('gtp.console_log_enabled')
  if (!enabled) return

  let typeText =
    {
      stderr: '  (err)',
      stdin: '   (in)',
      stdout: '  (out)',
      meta: ' (meta)'
    }[stream.type] || ''

  try {
    winstonLogger.log(
      'info',
      `<${stream.engine}> ${typeText} : ${stream.message}`
    )
  } catch (err) {}
}

let timestamp = function() {
  let now = new Date()
  let t = {
    month: 1 + now.getMonth(),
    day: now.getDate(),
    hour: now.getHours(),
    minute: now.getMinutes(),
    second: now.getSeconds(),
    year: now.getFullYear()
  }

  for (let key in t) {
    if (t[key] < 10) t[key] = `0${t[key]}`
  }

  return `${t.year}-${t.month}-${t.day}-${t.hour}-${t.minute}-${t.second}`
}

let validate = function() {
  if (!helper.isWritableDirectory(setting.get('gtp.console_log_path'))) {
    showMessageBox(
      t(
        [
          'You have an invalid log folder for GTP console logging in your settings.',
          'Please make sure the log directory is valid and writable, or disable GTP console logging.'
        ].join('\n\n')
      ),
      'warning'
    )

    return false
  }

  return true
}

export function updatePath() {
  // Return false when we did not update the log path but wanted to

  let enabled = setting.get('gtp.console_log_enabled')
  if (!enabled) return true
  if (!validate()) return false

  // Remove trailing separators and normalize

  let logPath = setting.get('gtp.console_log_path')
  if (logPath == null) return false

  let newDir = resolve(logPath)

  if (filename == null) {
    // Generate a new log file name

    let pid = remote.getCurrentWebContents().getOSProcessId()
    filename = `sabaki_${timestamp()}_${pid}.log`
  }

  try {
    let newPath = join(newDir, filename)
    let matching = winstonLogger.transports.find(
      transport =>
        transport.filename === filename && resolve(transport.dirname) === newDir
    )

    if (matching != null) {
      // Log file path has not changed
      return true
    }

    let notMatching = winstonLogger.transports.find(
      transport =>
        transport.filename !== filename || resolve(transport.dirname) !== newDir
    )

    winstonLogger.add(new winston.transports.File({filename: newPath}))

    if (notMatching != null) {
      winstonLogger.remove(notMatching)
    }

    return true
  } catch (err) {
    return false
  }
}

export function rotate() {
  // On next engine attach, we will use a new log file
  filename = null
}

export function close() {
  try {
    winstonLogger.close()
  } catch (err) {}
}
