const {remote} = require('electron')
const fs = require('fs');
const setting = remote.require('./setting')
const dialog = require('./dialog')
const winston = require('winston');
const path = require('path')

let filename = null
let stalePath = false

let winstonLogger = winston.createLogger({
    format: winston.format.combine(
        winston.format.timestamp({format: 'YYYY-MM-DD HH:mm:ss.SSS'}),
        winston.format.printf(info => {
            return `\[${info.timestamp}\] ${info.message}`;
        })),
    handleExceptions: false,
    exitOnError: false});

exports.write = function(stream) {
    let gtpText = ""

    let enabled = setting.get('gtp.console_log_enabled')
    if (enabled == null || !enabled) { return }

    if (stream.type === 'stderr') {
        gtpText += "e:" stream.message
    } else if (stream.type === 'stdin') {
        gtpText += "i:" stream.message
    } else if (stream.type === 'stdout') {
        gtpText += "o:" + stream.message
    } else if (stream.type === 'meta') {
        gtpText += "m: " + stream.message
    }

    let color
    if (stream.sign === 1) {
        color = "B"
    } else if (stream.sign === -1) {
        color = "W"
    } else {
        color = ''
    }

    let engine
    if (stream.engine != null) {
        engine = " <" + stream.name + ">"
    } else {
        engine = '<>'
    }

    gtpText = color + engine + " " + gtpText

    try {winstonLogger.log('info', gtpText)} catch (err) {}
}

let timestamp = function() {
    let now = new Date();
    let t = {
        'month': 1 + now.getMonth();
        'day': now.getDate();
        'hour': now.getHours();
        'minute': now.getMinutes();
        'second': now.getSeconds();
    }
    for(let idx in t) {
        if (t[idx] < 10) {
            t[idx] = "0" + t[idx]
        }
    }
    t['year'] = now.getFullYear();
    return t['year'] + "-" + t['month'] + "-" + t['day'] + "-" +
        t['hour'] + "-" + t['minute'] + "-" + t['second'];
}

exports.updatePath = function() {
    if (!stalePath)
        return

    let newDir = null;
    let enabled = null;
    // remove trailing separators and normalize
    let logPath = setting.get('gtp.console_log_path')
    if (logPath != null && typeof logPath === 'string') {
        newDir = path.resolve(setting.get('gtp.console_log_path'))
    }
    enabled = setting.get('gtp.console_log_enabled')

    stalePath = false

    let newName = null
    if (filename == null) {
        // generate a new log file name
        newName = "sabaki" + "_" +
            timestamp() + "_" +
            (sabaki.window.webContents.getOSProcessId().toString()) +
            ".log"
    } else {
        newName = filename
    }

    try {
        if ((enabled != null) && (newDir != null) && enabled) {
            let newPath = path.join(newDir, newName)
            let matching = winstonLogger.transports.find(transport => {
                return (transport.filename === newName) &&
                    (path.resolve(transport.dirname) === newDir)
            });
            if (matching != null) {
                return
            }
            filename = newName
            let notmatching = winstonLogger.transports.find(transport => {
                return (transport.filename !== newName) ||
                    (path.resolve(transport.dirname) !== newDir)
            });
            winstonLogger.add(new winston.transports.File({ filename: newPath }))
            if (notmatching != null) {
                winstonLogger.remove(notmatching)
            }
        }
    } catch (err) {}
}

exports.validPath = function() {
    /* Verify any path to directory is writable */

    let newPath = setting.get('gtp.console_log_path')
    let enabled = setting.get('gtp.console_log_enabled')
    // For GUI don't show a warning when logging is disabled AND the path is empty
    if (newPath == null) {
        if (!enabled) {
            stalePath = false
            return true
        } else {
            stalePath = false
            return false
        }
    }

    let fileStats = null
    try {
        fileStats = fs.statSync(newPath)
    } catch (err) {}

    // if fileStats null, path doesnt exist
    if (fileStats != null) {
        if (fileStats.isDirectory()) {
            try {
                fs.accessSync(newPath, fs.W_OK)
                stalePath = true
                return true
            } catch (err) {}
        }
        // Path exists, either no write permissions to directory, or path is not a directory
        stalePath = true
        return false
    } else {
        stalePath = false
        return false
    }
}

exports.validate = function() {
    if (!exports.validPath()) {
        let enabled = setting.get('gtp.console_log_enabled')
        if (enabled != null && enabled) {
            dialog.showMessageBox([
                'You have an invalid log folder for GTP console logging in your settings.\n\n',
                'Please make sure the log directory is valid & writable or disable GTP console logging.',
                ].join(''), 'warning'
            )
        }
        return false
    } else {
        return true
    }
}

exports.loadOnce = function() {
    if (exports.validate()) {
        exports.updatePath()
    }
}

exports.rotate = function() {
    // On next engine attach, we will use a new log file
    filename = null;
}

exports.close = function() {
    try {
        winstonLogger.close()
    } catch (err) {}
}
