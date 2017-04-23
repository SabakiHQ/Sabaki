const {noop} = require('../helper')

module.exports = {
    readFileSync: () => '',
    writeFileSync: noop,
    mkdirSync: noop,
    accessSync: noop
}
