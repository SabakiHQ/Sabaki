const path = require('path')
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')

const devConfig = require('./webpack.dev')

module.exports = Object.assign({}, devConfig, {
    plugins: [
        new UglifyJsPlugin({
            uglifyOptions: {
                compress: false
            }
        })
    ]
})
