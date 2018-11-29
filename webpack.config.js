const path = require('path')

let noopPath = path.join(__dirname, 'src/modules/shims/noop')
let emptyPath = path.join(__dirname, 'src/modules/shims/empty')

module.exports = (env, argv) => ({
    entry: './src/components/App.js',

    output: {
        filename: 'bundle.js',
        path: __dirname
    },

    devtool: argv.mode === 'production' ? false : 'cheap-module-eval-source-map',

    node: {
        Buffer: false
    },

    resolve: {
        alias: {
            'react': path.join(__dirname, 'node_modules/preact/dist/preact.min'),
            'preact': path.join(__dirname, 'node_modules/preact/dist/preact.min'),
            'prop-types': path.join(__dirname, 'src/modules/shims/prop-types'),
            'fs': path.join(__dirname, 'src/modules/shims/fs'),
            'util': path.join(__dirname, 'src/modules/shims/util'),
            'electron': path.join(__dirname, 'src/modules/shims/electron'),
            'buffer': path.join(__dirname, 'src/modules/shims/buffer'),
            '@sabaki/boardmatcher': path.join(__dirname, 'src/modules/shims/boardmatcher'),
            'character-entities': emptyPath,
            'character-entities-html4': emptyPath,
            'character-entities-legacy': emptyPath,
            'character-entities-invalid': emptyPath,
            'character-reference-invalid': emptyPath,
            'moment': emptyPath,
            'uuid/v1': noopPath,
            'recursive-copy': noopPath,
            'rimraf': noopPath,
            'argv-split': noopPath,
            '@sabaki/gtp': emptyPath,
            '../modules/rotation': emptyPath,
            '../modules/enginesyncer': emptyPath,
            '../menu': emptyPath,

            './ThemeManager': noopPath,
            './LeftSidebar': noopPath,
            './GtpConsole': noopPath,
            './drawers/AdvancedPropertiesDrawer': noopPath,
            './drawers/PreferencesDrawer': noopPath,
            './drawers/CleanMarkupDrawer': noopPath,
            './bars/AutoplayBar': noopPath,
            './bars/GuessBar': noopPath
        }
    }
})
