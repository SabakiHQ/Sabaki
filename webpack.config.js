const path = require('path')

module.exports = function(env) {
    return {
        entry: './components/App.js',

        output: {
            filename: 'bundle.js',
            path: __dirname
        },

        module: {
            loaders: [
                {
                    loader: 'babel-loader',
                    exclude: /node_modules/,
                    test: /\.js$/,
                    query: {
                        presets: ['es2015']
                    }
                }
            ]
        },

        resolve: {
            alias: {
                fs$: path.join(__dirname, 'modules/shims/empty'),
                moment$: path.join(__dirname, 'modules/shims/empty'),
                'argv-split$': path.join(__dirname, 'modules/shims/empty'),
                '../modules/gtp$': path.join(__dirname, 'modules/shims/empty'),
                '../data/menu$': path.join(__dirname, 'modules/shims/empty'),
                electron$: path.join(__dirname, 'modules/shims/electron')
            }
        }
    }
}
