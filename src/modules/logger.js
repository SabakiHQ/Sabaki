const {remote} = require('electron')
const fs = require('fs');
const setting = remote.require('./setting')
const dialog = require('./dialog')
const winston = require('winston');
const path = require('path')

let logger = null
let logFileGTP = {}
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

        GTPText = (sabaki.window.webContents.getOSProcessId().toString()) + " : " + ((enginestream.sign === 0) ? "B" : "W" ) +
            (enginestream.name != null ? " <" + enginestream.name + ">" : " <>") + " " +
            GTPText

        logger.log('info',GTPText)
    } catch(err) {}
}

exports.clearLoggers = function() {
    try {
        logger.clear()
    } catch (err) {}
}

exports.updateLogFilePathGTP = function() {
    if (!staleLogFilePath)
        return

    let newLogFilePathGTP = setting.get('gtp.console_log_path')
    let loggingEnabled = setting.get('gtp.console_log_enabled')
    staleLogFilePath = false

    // winston drops the trailing separator, so here we can use path to compare
    let newLogFileName = path.basename(newLogFilePathGTP)
    let newLogFileDir = path.dirname(newLogFilePathGTP)

    try {
        if (loggingEnabled && (newLogFilePathGTP != null)) {
            let matchingLog = logger.transports.find(transport => {
                return (transport.filename === newLogFileName) && (transport.dirname === newLogFileDir)
            });
            if (matchingLog != null) {
                return
            }
            let notMatchingLog = logger.transports.find(transport => {
                return (transport.filename !== newLogFileName) || (transport.dirname !== newLogFileDir)
            });
            logger.add(new winston.transports.File({ filename: newLogFilePathGTP }))
            if (notMatchingLog != null) {
                logger.remove(notMatchingLog)
            }
        }
    } catch (err) {}
}

exports.validLogFilePathGTP = function() {
    /* Verify any path to either a writable & regular file, or
    verify a path to a file that doesn't exist, but whose parent directory is writable */

    let newLogFilePathGTP = setting.get('gtp.console_log_path')
    let loggingEnabled = setting.get('gtp.console_log_enabled')
    // For GUI don't show a warning when logging is disabled AND the path is empty
    if (newLogFilePathGTP === null) {
        exports.clearLoggers()
        if (!loggingEnabled) {
            staleLogFilePath = false
            return true
        } else {
            staleLogFilePath = false
            return false
        }
    }

    // Path doesn't care about separators when getting the directory, but we do for this case
    let newLogFileName = null;
    let lastsep = newLogFilePathGTP.lastIndexOf(path.sep)
    if (lastsep == -1) {
        lastsep = 0
    } else {
        lastsep++
    }

    // case where no filename (but still has trailing slash)
    newLogFileName = newLogFilePathGTP.slice(lastsep)
    if (newLogFileName === null || newLogFileName === "") {
        exports.clearLoggers()
        staleLogFilePath = false
        return false
    }

    let fileStats = null
    try {
        fileStats = fs.statSync(newLogFilePathGTP)
    } catch (err) {}

    // if fileStats null: either file, folder, or both don't exist
    if (fileStats != null) {
        if (fileStats.isFile()) {
            try {
                fs.accessSync(newLogFilePathGTP, fs.W_OK)
                staleLogFilePath = true
                return true
            } catch (err) {}
        }
        // Path exists but we can't write to the file, or path is not a file
        staleLogFilePath = true
        return false
    }

    // Only valid possibility left is if directory is valid & writable and file doesn't exist
    let newLogFileDir = null
    let canWriteToLogDir = false

    try {
        newLogFileDir = newLogFilePathGTP.slice(0, lastsep)
        fs.accessSync(newLogFileDir, fs.W_OK)
        canWriteToLogDir = true;
    } catch (err) {}

    if (canWriteToLogDir) {
        staleLogFilePath = true
        return true
    } else {
        exports.clearLoggers()
        staleLogFilePath = false
        return false
    }
}

exports.validateLoggerSettings = function() {
  if (!exports.validLogFilePathGTP()) {
      let loggingEnabled = setting.get('gtp.console_log_enabled')
      if (loggingEnabled) {
          dialog.showMessageBox([
              'You have an invalid log file path for GTP console logging in your settings.\n\n',
              'Please change the path for the log file in your Preferences or disable GTP console logging.',
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
                    winston.format.timestamp(),
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

exports.unload = function() {
    try {
        logger.close()
    } catch(err) {}
}

exports.close = function() {
    try {
        logger.close()
    } catch(err) {}
}
