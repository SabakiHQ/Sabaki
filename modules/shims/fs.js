const helper = require('../helper')

module.exports = {
    R_OK: null,
    readFileSync: helper.noop,
    writeFileSync: helper.noop,
    mkdirSync: helper.noop,
    accessSync: helper.noop
}
