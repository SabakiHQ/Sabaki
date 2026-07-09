// Pure main-process helpers. Lives at the src root, not src/modules: main.js
// loads it unbundled, and src/modules ships only inside the renderer bundle.

// Returns the file to open from process.argv, or null, skipping flags, the dev
// "." entry, and the packaged app path.
exports.getOpenFileFromArgv = function (argv) {
  let files = argv
    .slice(1)
    .filter(
      (arg) =>
        !arg.startsWith('-') &&
        arg !== '.' &&
        !arg.endsWith('.asar') &&
        !arg.endsWith('.asar/'),
    )

  return files.length > 0 ? files[0] : null
}
