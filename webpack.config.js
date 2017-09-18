const path = require('path')

module.exports = () => ({
    entry: './components/App.js',

    output: {
        filename: 'bundle.js',
        path: __dirname
    },

    devtool: 'source-map',

    target: 'electron-renderer',

    node: {
        __dirname: false
    },

    resolve: {
        alias: {
            'react': path.join(__dirname, 'node_modules/preact/dist/preact.min'),
            'preact': path.join(__dirname, 'node_modules/preact/dist/preact.min')
        }
    },

    externals: {
        'moment': 'null',
        '../data/menu': "require('./data/menu')",
        './helper': "require('./modules/helper')",
        '../helper': "require('./modules/helper')",
        '../modules/helper': "require('./modules/helper')",
        '../../modules/helper': "require('./modules/helper')"
    }
})
