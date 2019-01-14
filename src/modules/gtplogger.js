const {remote} = require('electron')
const fs = require('fs');
const setting = remote.require('./setting')
const dialog = require('./dialog')
const winston = require('winston');
const path = require('path')

let gtplogger = null
let filename = null
let stalePath = false

exports.write = function(stream) {
    let GTPText = ""

    let enabled = setting.get('gtp.console_log_enabled')
    if (enabled == null || !enabled) { return }

    if (stream.stderr != null && typeof(stream.stderr) == 'string') {
        GTPText = GTPText + stream.stderr
    }
    if (stream.stdin != null && typeof(stream.stdin) == 'string') {
        GTPText = GTPText + stream.stdin
        if (stream.args != null) {
            GTPText = GTPText + " " + stream.args.join(" ")
        }
    }
    if (stream.stdout != null && typeof(stream.stdout) == 'string') {
        GTPText = GTPText + stream.stdout
    }

    GTPText = ((stream.sign === 0) ? "B" : "W" ) +
        (stream.name != null ? " <" + stream.name + ">" : " <>") + " " +
        GTPText

    try {gtplogger.log('info', GTPText)} catch (err) {}
}

timestamp = function() {
    let now = new Date();
    let t = {};
    t['mon'] = 1 + now.getMonth();
    t['day'] = now.getDate();
    t['hour'] = now.getHours();
    t['min'] = now.getMinutes();
    t['sec'] = now.getSeconds();
    for(let idx in t) {
        if (t[idx] < 10) {
            t[idx] = "0" + t[idx]
        }
    }
    t['year'] = now.getFullYear();
    return t['year'] + "-" + t['mon'] + "-" + t['day'] + "-" +
        t['hour'] + "-" + t['min'] + "-" + t['sec'];
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
            let matching = gtplogger.transports.find(transport => {
                return (transport.filename === newName) &&
                    (path.resolve(transport.dirname) === newDir)
            });
            if (matching != null) {
                return
            }
            filename = newName
            let notmatching = gtplogger.transports.find(transport => {
                return (transport.filename !== newName) ||
                    (path.resolve(transport.dirname) !== newDir)
            });
            gtplogger.add(new winston.transports.File({ filename: newPath }))
            if (notmatching != null) {
                gtplogger.remove(notmatching)
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
    if (gtplogger == null) {
        if(setting.get('gtp.console_log_timestamps')) {
            gtplogger = winston.createLogger({
                format: winston.format.combine(
                    winston.format.timestamp({format: 'YYYY-MM-DD HH:mm:ss.SSS'}),
                    winston.format.printf(info => {
                        return `\[${info.timestamp}\] ${info.message}`;
                    })),
                handleExceptions: false,
                exitOnError: false});
        } else {
            gtplogger = winston.createLogger({
                format: winston.format.combine(
                    winston.format.printf(info => {
                        return `${info.message}`;
                    })),
                handleExceptions: false,
                exitOnError: false});
        }
    }
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
        gtplogger.close()
    } catch (err) {}
}
