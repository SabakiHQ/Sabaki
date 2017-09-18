const path = require('path')

let noopPath = path.join(__dirname, 'modules/shims/noop')
let emptyPath = path.join(__dirname, 'modules/shims/empty')

module.exports = () => ({
    entry: './components/App.js',

    output: {
        filename: 'bundle.js',
        path: __dirname
    },

    devtool: 'source-map',

    module: {
        loaders: [
            {
                loader: 'babel-loader',
                test: /\.js$/,
                query: {
                    presets: [['es2015', {modules: false}]]
                }
            }
        ]
    },

    resolve: {
        alias: {
            'preact': path.join(__dirname, 'node_modules/preact/dist/preact.min'),
            'fs': path.join(__dirname, 'modules/shims/fs'),
            'electron': path.join(__dirname, 'modules/shims/electron'),
            'buffer': path.join(__dirname, 'modules/shims/buffer'),
            'iconv-lite': path.join(__dirname, 'modules/shims/iconv-lite'),
            'jschardet': path.join(__dirname, 'modules/shims/jschardet'),
            'moment': emptyPath,
            'uuid': emptyPath,
            'recursive-copy': emptyPath,
            'rimraf': emptyPath,
            'argv-split': emptyPath,
            '../modules/gtp': emptyPath,
            '../data/menu': emptyPath,

            './ThemeManager': noopPath,
            './LeftSidebar': noopPath,
            './drawers/PreferencesDrawer': noopPath,
            './drawers/CleanMarkupDrawer': noopPath,
            './bars/AutoplayBar': noopPath,
            './bars/GuessBar': noopPath
        }
    }
})
