const {noop} = require('../helper')

module.exports = {
    readFile: (file, callback = noop) => {
        let reader = new FileReader()
        reader.onload = evt => callback(null, evt.target.result)
        reader.readAsText(file)
    },

    readFileSync: () => '',
    writeFileSync: noop,
    mkdirSync: noop,
    accessSync: noop
}
