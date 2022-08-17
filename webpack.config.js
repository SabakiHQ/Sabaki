const path = require('path')

module.exports = (env, argv) => ({
  entry: './src/components/App.js',

  output: {
    filename: 'bundle.js',
    path: __dirname
  },

  devtool: argv.mode === 'production' ? false : 'eval-cheap-module-source-map',
  target: 'electron-renderer',

  node: {
    __dirname: false
  },

  resolve: {
    alias: {
      react: 'preact/compat',
      'react-dom/test-utils': 'preact/test-utils',
      'react-dom': 'preact/compat',
      'react/jsx-runtime': 'preact/jsx-runtime'
    }
  },

  externals: {
    '@sabaki/i18n': 'require("@sabaki/i18n")',
    'cross-spawn': 'null',
    'iconv-lite': 'require("iconv-lite")',
    moment: 'null'
  }
})
