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
                    presets: ['es2015']
                }
            }
        ]
    },

    resolve: {
        alias: {
            'fs$': path.join(__dirname, 'modules/shims/fs'),
            'electron$': path.join(__dirname, 'modules/shims/electron'),
            'iconv-lite$': path.join(__dirname, 'modules/shims/iconv-lite'),
            'jschardet$': path.join(__dirname, 'modules/shims/jschardet'),
            'moment$': emptyPath,
            'uuid$': emptyPath,
            'recursive-copy$': emptyPath,
            'argv-split$': emptyPath,
            '../modules/gtp$': emptyPath,
            '../data/menu$': emptyPath,

            './ThemeManager$': noopPath,
            './LeftSidebar$': noopPath,
            './drawers/PreferencesDrawer$': noopPath,
            './drawers/CleanMarkupDrawer$': noopPath,
            './bars/AutoplayBar$': noopPath,
            './bars/GuessBar$': noopPath
        }
    }
})
