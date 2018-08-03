const path = require('path')

let noopPath = path.join(__dirname, 'src/modules/shims/noop')
let emptyPath = path.join(__dirname, 'src/modules/shims/empty')

module.exports = (env, argv) => ({
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
                        plugins: ['fast-async'],
                        presets: [
                            ['env', {
                                modules: false,
                                exclude: [
                                    'babel-plugin-transform-regenerator',
                                    'babel-plugin-transform-async-to-generator'
                                ],
                                targets: {browsers: [
                                    'last 2 Chrome versions',
                                    'last 2 Firefox versions',
                                    'last 2 Edge versions'
                                ]}
                            }]
                        ]
                    }
                }
            }
        ]
    },

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
            'character-entities': emptyPath,
            'character-entities-html4': emptyPath,
            'character-entities-legacy': emptyPath,
            'character-entities-invalid': emptyPath,
            'character-reference-invalid': emptyPath,
            'moment': emptyPath,
            'uuid': emptyPath,
            'recursive-copy': emptyPath,
            'rimraf': emptyPath,
            'argv-split': emptyPath,
            '@sabaki/gtp': emptyPath,
            '../modules/rotation': emptyPath,
            '../modules/enginesyncer': emptyPath,
            '../menu': emptyPath,

            './ThemeManager': noopPath,
            './LeftSidebar': noopPath,
            './drawers/AdvancedPropertiesDrawer': noopPath,
            './drawers/PreferencesDrawer': noopPath,
            './drawers/CleanMarkupDrawer': noopPath,
            './bars/AutoplayBar': noopPath,
            './bars/GuessBar': noopPath
        }
    }
})
