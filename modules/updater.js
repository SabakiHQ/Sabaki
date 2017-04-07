const {app} = require('electron')
const dns = require('dns')
const https = require('https')
const url = require('url')
const helper = require('./helper')

exports.check = function(repo, callback) {
    let address = `https://github.com/${repo}/releases/latest`
    let options = url.parse(address)
    options.ciphers = 'AES128-SHA256'

    // Check internet connection first

    dns.lookup('github.com', err => {
        if (err) return callback(err)

        https.get(options, response => {
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
                    hasUpdates: helper.lexicalCompare(latestVersion, currentVersion) > 0
                })
            })
        }).on('error', err => {
            callback(err)
        })
    })
}
