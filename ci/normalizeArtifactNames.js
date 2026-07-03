const {readdirSync, renameSync} = require('fs')
const {join} = require('path')

// electron-builder names AppImages with AppImage-conventional arch tokens
// (x86_64, i386, aarch64). The in-app updater (src/updater.js) picks a
// download link by matching os.arch() against the asset URL, so rename to
// Node's arch names. No-op for files that already use them.
const archMap = {x86_64: 'x64', i386: 'ia32', aarch64: 'arm64'}

const dist = join(__dirname, '..', 'dist')

for (let file of readdirSync(dist)) {
  for (let [from, to] of Object.entries(archMap)) {
    if (file.includes(`-${from}.`)) {
      let renamed = file.replace(`-${from}.`, `-${to}.`)
      renameSync(join(dist, file), join(dist, renamed))
      console.log(`${file} -> ${renamed}`)
    }
  }
}
