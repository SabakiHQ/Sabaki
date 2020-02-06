const path = require('path')

module.exports = (env, argv) => ({
  entry: './src/components/App.js',

  output: {
    filename: 'bundle.js',
    path: __dirname
  },

  devtool: argv.mode === 'production' ? false : 'cheap-module-eval-source-map',
  target: 'electron-renderer',

  node: {
    __dirname: false
  },

  resolve: {
    alias: {
      react: path.join(__dirname, 'node_modules/preact/dist/preact.min.js'),
      preact: path.join(__dirname, 'node_modules/preact/dist/preact.min.js'),
      'prop-types': path.join(__dirname, 'src/modules/shims/prop-types.js')
    }
  },

  externals: {
    moment: 'null',
    'iconv-lite': 'require("iconv-lite")'
  }
})
