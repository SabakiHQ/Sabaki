const dolm = require('dolm').load({})
const helper = require('../helper')

module.exports = {
    t: dolm.t,
    context: dolm.context,
    loadStrings: helper.noop,
    loadFile: helper.noop,
    loadLang: helper.noop,
    serialize: dolm.serialize
}

