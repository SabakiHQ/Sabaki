const {app} = require('electron')
const dns = require('dns')
const https = require('https')

exports.check = function(repo, callback) {
    let url = `https://github.com/${repo}/releases/latest`

    // Check internet connection first
    dns.lookup('github.com', err => {
        if (err) return callback(err)

        https.get(url, response => {
            let content = ''

            response.on('data', chunk => {
                content += chunk
            })

            response.on('end', () => {
                let hasUpdates = !content.includes('/tag/v' + app.getVersion())
                callback(null, hasUpdates, url)
            })
        }).on('error', err => {
            callback(err)
        })
    })
}
