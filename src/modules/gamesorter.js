const sgf = require('@sabaki/sgf')
const helper = require('./helper')
const gametree = require('./gametree')
const natsort = require('natsort')

exports.sort = function(gameTrees, property) {
    return gameTrees.map((x, i) => [x, i]).sort(([t1, i1], [t2, i2]) => {
        let s
        let [x1, x2] = property === '-1' ? [i2, i1]
            : [t1, t2].map(t => property in t.nodes[0] ? t.nodes[0][property][0] : '')

        if (['BR', 'WR'].includes(property)) {
            // Transform ranks

            [x1, x2] = [x1, x2]
                .map(x => (x.includes('k') ? -1 : x.includes('p') ? 10 : 1) * parseFloat(x))
                .map(x => isNaN(x) ? -Infinity : x)
        } else if (property === 'DT') {
            // Transform dates

            [x1, x2] = [x1, x2]
                .map(x => sgf.parseDates(x))
                .map(x => x ? sgf.stringifyDates(x.sort(helper.lexicalCompare)) : '')
        }

        if (['GN', 'EV'].includes(property)) {
            // Sort names

            s = natsort({insensitive: true})(x1, x2)
        } else if (property === 'moves') {
            // Sort by max game tree height - could be inaccurate given variations

            s = gametree.getHeight(t1) < gametree.getHeight(t2) ? -1 : 1
        } else {
            s = x1 < x2 ? -1 : +(x1 !== x2)
        }

        return s !== 0 ? s : i1 - i2
    }).map(x => x[0])
}
