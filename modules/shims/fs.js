const helper = require('../helper')

module.exports = {
    R_OK: null,
    readFileSync: () => '',
    writeFileSync: helper.noop,
    mkdirSync: helper.noop,
    accessSync: helper.noop
}
