const {app, net} = require('electron')

function lexicalCompare(a, b) {
    if (!a.length || !b.length) return a.length - b.length
    return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : lexicalCompare(a.slice(1), b.slice(1))
}

exports.check = function(repo, callback) {
    let address = `https://api.github.com/repos/${repo}/releases/latest`
    let request = net.request(address)

    request.on('response', response => {
        let content = ''

        response.on('data', chunk => {
            content += chunk
        }).on('end', () => {
            let data = JSON.parse(content)
            if (!('tag_name' in data)) return callback(new Error('No version information found.'))

            let latestVersion = data.tag_name.slice(1).split('.').map(x => +x)
            let currentVersion = app.getVersion().split('.').map(x => +x)

            callback(null, {
                url: address,
                latestVersion: latestVersion.join('.'),
                hasUpdates: lexicalCompare(latestVersion, currentVersion) > 0
            })
        })
    }).on('error', err => {
        callback(err)
    })

    request.end()
}
