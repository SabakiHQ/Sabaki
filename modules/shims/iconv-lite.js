const {StringDecoder} = require('string_decoder')
const decoder = new StringDecoder('utf8')

module.exports = {
    encodingExists: () => false,
    decode: buffer => decoder.write(buffer)
}
