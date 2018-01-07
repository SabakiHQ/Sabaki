const path = require('path')

module.exports = {
    entry: './src/components/App.js',

    output: {
        filename: 'bundle.js',
        path: __dirname
    },

    devtool: 'source-map',

    target: 'electron-renderer',

    node: {
        __dirname: false
    },

    module: {
        rules: [
            {
                test: /\.sgf$/,
                use: 'raw-loader'
            }
        ]
    },

    resolve: {
        alias: {
            'react': path.join(__dirname, 'node_modules/preact/dist/preact.min'),
            'preact': path.join(__dirname, 'node_modules/preact/dist/preact.min'),
            'prop-types': path.join(__dirname, 'src/modules/shims/prop-types')
        }
    },

    externals: {
        'moment': 'null'
    }
}
