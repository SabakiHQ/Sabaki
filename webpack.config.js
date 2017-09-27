const path = require('path')

let noopPath = path.join(__dirname, 'src/modules/shims/noop')
let emptyPath = path.join(__dirname, 'src/modules/shims/empty')

module.exports = () => ({
    entry: './src/components/App.js',

    output: {
        filename: 'bundle.js',
        path: __dirname
    },

    devtool: 'source-map',

    module: {
        rules: [
            {
                test: /\.sgf$/,
                use: 'raw-loader'
            },
            {
                test: /\.js$/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: [['env', {modules: false}]]
                    }
                }
            }
        ]
    },

    resolve: {
        alias: {
            'react': path.join(__dirname, 'node_modules/preact/dist/preact.min'),
            'preact': path.join(__dirname, 'node_modules/preact/dist/preact.min'),
            'fs': path.join(__dirname, 'src/modules/shims/fs'),
            'electron': path.join(__dirname, 'src/modules/shims/electron'),
            'buffer': path.join(__dirname, 'src/modules/shims/buffer'),
            'iconv-lite': path.join(__dirname, 'src/modules/shims/iconv-lite'),
            'jschardet': path.join(__dirname, 'src/modules/shims/jschardet'),
            'moment': emptyPath,
            'uuid': emptyPath,
            'recursive-copy': emptyPath,
            'rimraf': emptyPath,
            'argv-split': emptyPath,
            '../modules/gtp': emptyPath,
            '../menu': emptyPath,

            './ThemeManager': noopPath,
            './LeftSidebar': noopPath,
            './drawers/PreferencesDrawer': noopPath,
            './drawers/CleanMarkupDrawer': noopPath,
            './bars/AutoplayBar': noopPath,
            './bars/GuessBar': noopPath
        }
    }
})
