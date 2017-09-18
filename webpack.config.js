const path = require('path')

module.exports = () => ({
    entry: './components/App.js',

    output: {
        filename: 'bundle.js',
        path: __dirname
    },

    devtool: 'source-map',

    target: 'electron-renderer',

    resolve: {
        alias: {
        }
    },

    externals: {
        moment: 'null'
    }
})
