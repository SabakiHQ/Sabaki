const path = require('path')
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')

module.exports = (env, argv) => ({
    entry: './src/components/App.js',

    output: {
        filename: 'bundle.js',
        path: __dirname
    },

    devtool: 'source-map',
    target: 'electron-renderer',

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
        '@sabaki/deadstones': "require('@sabaki/deadstones')",
        'moment': 'null'
    },

    optimization: {
        minimize: argv.mode === 'production',
        minimizer: [
            new UglifyJsPlugin({
                uglifyOptions: {
                    compress: false
                }
            })
        ]
    }
})
