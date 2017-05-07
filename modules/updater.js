const {app, net} = require('electron')
const {lexicalCompare} = require('./helper')

exports.check = function(repo, callback) {
    let address = `https://github.com/${repo}/releases/latest`
    let request = net.request(address)

    request.on('response', response => {
        let content = ''

        response.on('data', chunk => {
            content += chunk
        }).on('end', () => {
            let match = content.match(/\/tag\/v(\d+.\d+.\d+)/)
            if (match == null) return callback(new Error('No version information found.'))

            let latestVersion = match[1].split('.').map(x => +x)
            let currentVersion = app.getVersion().split('.').map(x => +x)

            callback(null, {
                url: address,
                hasUpdates: lexicalCompare(latestVersion, currentVersion) > 0
            })
        })
    }).on('error', err => {
        callback(err)
    })

    request.end()
}
