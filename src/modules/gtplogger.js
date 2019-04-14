const {remote} = require('electron')
const winston = require('winston')
const path = require('path')
const setting = remote.require('./setting')
const dialog = require('./dialog')
const helper = require('./helper')
const t = require('../i18n').context('gtplogger')

let filename = null

let winstonLogger = winston.createLogger({
    format: winston.format.combine(
        winston.format.timestamp({format: 'YYYY-MM-DD HH:mm:ss.SSS'}),
        winston.format.printf(info => `\[${info.timestamp}\] ${info.message}`)
    ),
    handleExceptions: false,
    exitOnError: false
})

exports.write = function(stream) {
    let enabled = setting.get('gtp.console_log_enabled')
    if (!enabled) return

    let typeText = stream.type === 'stderr' ? '  (err)'
        : stream.type === 'stdin' ? '   (in)'
        : stream.type === 'stdout' ? '  (out)'
        : stream.type === 'meta' ? ' (meta)'
        : ''

    let color = stream.sign > 0 ? 'B'
        : stream.sign < 0 ? 'W'
        : ''

    try {
        winstonLogger.log('info', `${color} <${stream.engine}> ${typeText} : ${stream.message}`)
    } catch(err) {}
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

    for(let key in t) {
        if (t[key] < 10) t[key] = `0${t[key]}`
    }

    return `${t.year}-${t.month}-${t.day}-${t.hour}-${t.minute}-${t.second}`
}

let validate = function() {
    if (!helper.isWritableDirectory(setting.get('gtp.console_log_path'))) {
        dialog.showMessageBox(
            t([
                'You have an invalid log folder for GTP console logging in your settings.',
                'Please make sure the log directory is valid and writable, or disable GTP console logging.',
            ].join('\n\n')),
            'warning'
        )

        return false
    }

    return true
}

exports.updatePath = function() {
    // Return false when we did not update the log path but wanted to

    let enabled = setting.get('gtp.console_log_enabled')
    if (!enabled) return true
    if (!validate()) return false

    // Remove trailing separators and normalize

    let logPath = setting.get('gtp.console_log_path')
    if (logPath == null) return false

    let newDir = path.resolve(logPath)

    if (filename == null) {
        // Generate a new log file name

        let pid = sabaki.window.webContents.getOSProcessId()
        filename = `sabaki_${timestamp()}_${pid}.log`
    }

    try {
        let newPath = path.join(newDir, filename)
        let matching = winstonLogger.transports.find(transport =>
            transport.filename === filename
            && path.resolve(transport.dirname) === newDir
        )

        if (matching != null) {
            // Log file path has not changed
            return true
        }

        let notMatching = winstonLogger.transports.find(transport =>
            transport.filename !== filename
            || path.resolve(transport.dirname) !== newDir
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

exports.rotate = function() {
    // On next engine attach, we will use a new log file
    filename = null
}

exports.close = function() {
    try {
        winstonLogger.close()
    } catch (err) {}
}
