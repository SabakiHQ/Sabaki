const {remote} = require('electron')
const fs = require('fs');
const setting = remote.require('./setting')
const dialog = require('./dialog')
const winston = require('winston');
const path = require('path')

let logger = null
let logFileNameGTP = null
let staleLogFilePath = false

exports.writeToLogFileGTP = function(enginestream) {
    let GTPText = ""
    try {
        let loggingEnabled = setting.get('gtp.console_log_enabled')
        if (!loggingEnabled) { return }

        if (enginestream.stderr != null && typeof(enginestream.stderr) == 'string') {
            GTPText = GTPText + enginestream.stderr
        }
        if (enginestream.stdin != null && typeof(enginestream.stdin) == 'string') {
            GTPText = GTPText + enginestream.stdin
            if (enginestream.args != null) {
                GTPText = GTPText + " " + enginestream.args.join(" ")
            }
        }
        if (enginestream.stdout != null && typeof(enginestream.stdout) == 'string') {
            GTPText = GTPText + enginestream.stdout
        }

        GTPText = ((enginestream.sign === 0) ? "B" : "W" ) +
            (enginestream.name != null ? " <" + enginestream.name + ">" : " <>") + " " +
            GTPText

        logger.log('info',GTPText)
    } catch (err) {}
}

exports.clearLoggers = function() {
    try {
        logger.clear()
    } catch (err) {}
}

getFileTimestamp = function() {
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
    return t['year'] + "-" + t['mon'] + "-" + t['day'] + "-" + t['hour'] + "-" + t['min'] + "-" + t['sec'];
}

exports.updateLogFilePathGTP = function() {
    if (!staleLogFilePath)
        return

    let newLogFileDir = null;
    let loggingEnabled = null;
    try {
        // remove trailing separators and normalize
        newLogFileDir = path.resolve(setting.get('gtp.console_log_path'))
        loggingEnabled = setting.get('gtp.console_log_enabled')

    } catch (err) {}

    staleLogFilePath = false

    let newLogFileName = null
    if (logFileNameGTP == null) {
        // generate a new log file name
        newLogFileName = "sabaki" + "_" +
            getFileTimestamp() + "_" +
            (sabaki.window.webContents.getOSProcessId().toString()) +
            ".log"
    } else {
        newLogFileName = logFileNameGTP
    }

    try {
        if ((loggingEnabled != null) && (newLogFileDir != null) && loggingEnabled) {
            let newLogFilePathGTP = path.join(newLogFileDir, newLogFileName)
            let matchingLog = logger.transports.find(transport => {
                return (transport.filename === newLogFileName) && (path.resolve(transport.dirname) === newLogFileDir)
            });
            if (matchingLog != null) {
                return
            }
            logFileNameGTP = newLogFileName
            let notMatchingLog = logger.transports.find(transport => {
                return (transport.filename !== newLogFileName) || (path.resolve(transport.dirname) !== newLogFileDir)
            });
            logger.add(new winston.transports.File({ filename: newLogFilePathGTP }))
            if (notMatchingLog != null) {
                logger.remove(notMatchingLog)
            }
        }
    } catch (err) {}
}

exports.validLogFilePathGTP = function() {
    /* Verify any path to directory is writable */

    let newLogFilePathGTP = setting.get('gtp.console_log_path')
    let loggingEnabled = setting.get('gtp.console_log_enabled')
    // For GUI don't show a warning when logging is disabled AND the path is empty
    if (newLogFilePathGTP === null) {
        if (!loggingEnabled) {
            staleLogFilePath = false
            return true
        } else {
            staleLogFilePath = false
            return false
        }
    }

    let fileStats = null
    try {
        fileStats = fs.statSync(newLogFilePathGTP)
    } catch (err) {}

    // if fileStats null, path doesnt exist
    if (fileStats != null) {
        if (fileStats.isDirectory()) {
            try {
                fs.accessSync(newLogFilePathGTP, fs.W_OK)
                staleLogFilePath = true
                return true
            } catch (err) {}
        }
        // Path exists, either no write permissions to directory, or path is not a directory
        staleLogFilePath = true
        return false
    } else {
        staleLogFilePath = false
        return false
    }
}

exports.validateLoggerSettings = function() {
    if (!exports.validLogFilePathGTP()) {
        let loggingEnabled = setting.get('gtp.console_log_enabled')
        if (loggingEnabled) {
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
    if (logger == null) {
        if(setting.get('gtp.console_log_timestamps')) {
            logger = winston.createLogger({
                format: winston.format.combine(
                    winston.format.timestamp({format: 'YYYY-MM-DD HH:mm:ss.SSS'}),
                    winston.format.printf(info => {
                        return `\[${info.timestamp}\] ${info.message}`;
                    })),
                handleExceptions: false,
                exitOnError: false});
        } else {
            logger = winston.createLogger({
                format: winston.format.combine(
                    winston.format.printf(info => {
                        return `${info.message}`;
                    })),
                handleExceptions: false,
                exitOnError: false});
        }
    }
    if (exports.validateLoggerSettings()) {
        exports.updateLogFilePathGTP()
    }
}

exports.rotateLog = function() {
    // On next engine attach, we will use a new log file
    logFileNameGTP = null;
}

exports.unload = function() {
    try {
        logger.close()
    } catch (err) {}
}

exports.close = function() {
    try {
        logger.close()
    } catch (err) {}
}
