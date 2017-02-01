const {app} = require('electron')
const dns = require('dns')
const https = require('https')
const url = require('url')

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
                let hasUpdates = content.trim() != '' && !content.includes(`/tag/v${app.getVersion()}`)
                callback(null, hasUpdates, address)
            })
        }).on('error', err => {
            callback(err)
        })
    })
}
