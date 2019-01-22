const noop = require('./noop')

module.exports = {
    write: noop,
    updatePath: noop,
    rotate: noop,
    close: noop
}
