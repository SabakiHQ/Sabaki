const os = require('os')
const {app, net} = require('electron')

function lexicalCompare(a, b) {
    if (!a.length || !b.length) return a.length - b.length
    return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : lexicalCompare(a.slice(1), b.slice(1))
}

exports.check = async function(repo) {
    let address = `https://api.github.com/repos/${repo}/releases/latest`

    let response = await new Promise((resolve, reject) => {
        let request = net.request(address)

        request.on('response', response => {
            let content = ''

            response.on('data', chunk => {
                content += chunk
            }).on('end', () => {
                resolve(content)
            })
        }).on('error', reject)

        request.end()
    })

    let data = JSON.parse(response)
    if (!('tag_name' in data)) throw new Error('No version information found.')

    let latestVersion = data.tag_name.slice(1).split('.').map(x => +x)
    let currentVersion = app.getVersion().split('.').map(x => +x)

    return {
        url: `https://github.com/${repo}/releases/latest`,
        latestVersion: latestVersion.join('.'),
        hasUpdates: lexicalCompare(latestVersion, currentVersion) > 0
    }
}
