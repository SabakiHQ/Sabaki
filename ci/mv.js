const {renameSync} = require('fs')
const {version} = require('../package.json')

let [from, to] = [2, 3]
  .map(i => process.argv[i])
  .map(x => x.replace(/x\.x\.x/g, version))

renameSync(from, to)
