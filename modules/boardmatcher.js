const {sgf} = require('./fileformats')

let _shapes = null
let equals = v => w => w[0] === v[0] && w[1] === v[1]

exports.getSymmetries = function([x, y]) {
    let f = ([x, y]) => [[x, y], [-x, y], [x, -y], [-x, -y]]
    return [...f([x, y]), ...f([y, x])]
}

exports.getBoardSymmetries = function(board, vertex) {
    let [mx, my] = [board.width - 1, board.height - 1]
    let mod = (x, m) => (x % m + m) % m

    return exports.getSymmetries(vertex).map(([x, y]) => [mod(x, mx), mod(y, my)])
}

exports.readShapes = function(filename) {
    let tree = sgf.parse(`
        (;GM[1]AP[Sabaki:0.30.0]CA[UTF-8]SZ[19]
        (;AB[dd][kc][qd]N[Low Chinese opening]C[size: 19, type: corner]CR[aa][ba][ca][da][ea][fa][ga][ha][ia][ja][ka][la][ma][na][oa][pa][qa][ra][sa][ab][bb][cb][db][eb][fb][gb][hb][ib][jb][kb][lb][mb][nb][ob][pb][qb][rb][sb][ac][bc][cc][dc][ec][fc][gc][hc][ic][jc][lc][mc][nc][oc][pc][qc][rc][sc][ad][bd][cd][ed][fd][gd][hd][id][jd][kd][ld][md][nd][od][pd][rd][sd][ae][be][ce][de][ee][fe][ge][he][ie][je][ke][le][me][ne][oe][pe][qe][re][se]MA[kc][dd][qd]
        )(;AB[dd][kd][qd]N[High Chinese opening]AE[so]C[size: 19, type: corner]CR[aa][ba][ca][da][ea][fa][ga][ha][ia][ja][ka][la][ma][na][oa][pa][qa][ra][sa][ab][bb][cb][db][eb][fb][gb][hb][ib][jb][kb][lb][mb][nb][ob][pb][qb][rb][sb][ac][bc][cc][dc][ec][fc][gc][hc][ic][jc][kc][lc][mc][nc][oc][pc][qc][rc][sc][ad][bd][cd][ed][fd][gd][hd][id][jd][ld][md][nd][od][pd][rd][sd][ae][be][ce][de][ee][fe][ge][he][ie][je][ke][le][me][ne][oe][pe][qe][re][se]MA[dd][kd][qd]
        )(;AB[dd][pc][qe]N[Orthodox opening]C[size: 19, type: corner]CR[aa][ba][ca][da][ea][fa][ga][ha][ia][ja][ka][la][ma][na][oa][pa][qa][ra][sa][ab][bb][cb][db][eb][fb][gb][hb][ib][jb][kb][lb][mb][nb][ob][pb][qb][rb][sb][ac][bc][cc][dc][ec][fc][gc][hc][ic][jc][kc][lc][mc][nc][oc][qc][rc][sc][ad][bd][cd][ed][fd][gd][hd][id][jd][kd][ld][md][nd][od][pd][qd][rd][sd][ae][be][ce][de][ee][fe][ge][he][ie][je][ke][le][me][ne][oe][pe][re][se][af][bf][cf][df][ef][ff][gf][hf][if][jf][kf][lf][mf][nf][of][pf][qf][rf][sf]MA[pc][dd][qe]
        )(;AB[cd][pc][qe]N[Orthodox opening]C[size: 19, type: corner]CR[aa][ba][ca][da][ea][fa][ga][ha][ia][ja][ka][la][ma][na][oa][pa][qa][ra][sa][ab][bb][cb][db][eb][fb][gb][hb][ib][jb][kb][lb][mb][nb][ob][pb][qb][rb][sb][ac][bc][cc][dc][ec][fc][gc][hc][ic][jc][kc][lc][mc][nc][oc][qc][rc][sc][ad][bd][dd][ed][fd][gd][hd][id][jd][kd][ld][md][nd][od][pd][qd][rd][sd][ae][be][ce][de][ee][fe][ge][he][ie][je][ke][le][me][ne][oe][pe][re][se][af][bf][cf][df][ef][ff][gf][hf][if][jf][kf][lf][mf][nf][of][pf][qf][rf][sf]MA[pc][cd][qe]
        )(;AB[dc][nc][jd]AW[pd]N[Kobayashi opening]C[size: 19, type: corner]CR[aa][ba][ca][da][ea][fa][ga][ha][ia][ja][ka][la][ma][na][oa][pa][qa][ra][sa][ab][bb][cb][db][eb][fb][gb][hb][ib][jb][kb][lb][mb][nb][ob][pb][qb][rb][sb][ac][bc][cc][ec][fc][gc][hc][ic][jc][kc][lc][mc][oc][pc][qc][rc][sc][ad][bd][cd][dd][ed][fd][gd][hd][id][kd][ld][md][nd][od][qd][rd][sd][ae][be][ce][de][ee][fe][ge][he][ie][je][ke][le][me][ne][oe][pe][qe][re][se]MA[dc][nc][jd][pd]
        )(;AB[cd][nc][ic]AW[pd]N[Small Chinese opening]C[size: 19, type: corner]CR[aa][ba][ca][da][ea][fa][ga][ha][ia][ja][ka][la][ma][na][oa][pa][qa][ra][sa][ab][bb][cb][db][eb][fb][gb][hb][ib][jb][kb][lb][mb][nb][ob][pb][qb][rb][sb][ac][bc][cc][dc][ec][fc][gc][hc][jc][kc][lc][mc][oc][pc][qc][rc][sc][ad][bd][dd][ed][fd][gd][hd][id][jd][kd][ld][md][nd][od][qd][rd][sd][ae][be][ce][de][ee][fe][ge][he][ie][je][ke][le][me][ne][oe][pe][qe][re][se]MA[ic][nc][cd][pd]
        )(;AB[cd][hc][nc]AW[pd]N[Micro Chinese opening]C[size: 19, type: corner]CR[aa][ba][ca][da][ea][fa][ga][ha][ia][ja][ka][la][ma][na][oa][pa][qa][ra][sa][ab][bb][cb][db][eb][fb][gb][hb][ib][jb][kb][lb][mb][nb][ob][pb][qb][rb][sb][ac][bc][cc][dc][ec][fc][gc][ic][jc][kc][lc][mc][oc][pc][qc][rc][sc][ad][bd][dd][ed][fd][gd][hd][id][jd][kd][ld][md][nd][od][qd][rd][sd][ae][be][ce][de][ee][fe][ge][he][ie][je][ke][le][me][ne][oe][pe][qe][re][se]MA[hc][nc][cd][pd]
        )(;AB[pd][jd][dd]N[Sanrensei opening]C[size: 19, type: corner]CR[aa][ba][ca][da][ea][fa][ga][ha][ia][ja][ka][la][ma][na][oa][pa][qa][ra][sa][ab][bb][cb][db][eb][fb][gb][hb][ib][jb][kb][lb][mb][nb][ob][pb][qb][rb][sb][ac][bc][cc][dc][ec][fc][gc][hc][ic][jc][kc][lc][mc][nc][oc][pc][qc][rc][sc][ad][bd][cd][ed][fd][gd][hd][id][kd][ld][md][nd][od][qd][rd][sd][ae][be][ce][de][ee][fe][ge][he][ie][je][ke][le][me][ne][oe][pe][qe][re][se]MA[dd][jd][pd]
        )(;AB[dd][pd]N[Nirensei opening]C[size: 19, type: corner]CR[aa][ba][ca][da][ea][fa][ga][ha][ia][ja][ka][la][ma][na][oa][pa][qa][ra][sa][ab][bb][cb][db][eb][fb][gb][hb][ib][jb][kb][lb][mb][nb][ob][pb][qb][rb][sb][ac][bc][cc][dc][ec][fc][gc][hc][ic][jc][kc][lc][mc][nc][oc][pc][qc][rc][sc][ad][bd][cd][ed][fd][gd][hd][id][jd][kd][ld][md][nd][od][qd][rd][sd][ae][be][ce][de][ee][fe][ge][he][ie][je][ke][le][me][ne][oe][pe][qe][re][se]MA[dd][pd]
        )(;AB[qd][pq][cp][pe]AW[dc][oc][qo]N[Shūsaku opening]C[size: 19, type: corner]CR[aa][ba][ca][da][ea][fa][ga][ha][ia][ja][ka][la][ma][na][oa][pa][qa][ra][sa][ab][bb][cb][db][eb][fb][gb][hb][ib][jb][kb][lb][mb][nb][ob][pb][qb][rb][sb][ac][bc][cc][ec][fc][gc][hc][ic][jc][kc][lc][mc][nc][pc][qc][rc][sc][ad][bd][cd][dd][ed][fd][gd][hd][id][jd][kd][ld][md][nd][od][pd][rd][sd][ae][be][ce][de][ee][fe][ge][he][ie][je][ke][le][me][ne][oe][qe][re][se][af][bf][cf][df][ef][ff][gf][hf][if][jf][kf][lf][mf][nf][of][pf][qf][rf][sf][ag][bg][cg][dg][eg][fg][gg][hg][ig][jg][kg][lg][mg][ng][og][pg][qg][rg][sg][ah][bh][ch][dh][eh][fh][gh][hh][ih][jh][kh][lh][mh][nh][oh][ph][qh][rh][sh][ai][bi][ci][di][ei][fi][gi][hi][ii][ji][ki][li][mi][ni][oi][pi][qi][ri][si][aj][bj][cj][dj][ej][fj][gj][hj][ij][jj][kj][lj][mj][nj][oj][pj][qj][rj][sj][ak][bk][ck][dk][ek][fk][gk][hk][ik][jk][kk][lk][mk][nk][ok][pk][qk][rk][sk][al][bl][cl][dl][el][fl][gl][hl][il][jl][kl][ll][ml][nl][ol][pl][ql][rl][sl][am][bm][cm][dm][em][fm][gm][hm][im][jm][km][lm][mm][nm][om][pm][qm][rm][sm][an][bn][cn][dn][en][fn][gn][hn][in][jn][kn][ln][mn][nn][on][pn][qn][rn][sn][ao][bo][co][do][eo][fo][go][ho][io][jo][ko][lo][mo][no][oo][po][ro][so][ap][bp][dp][ep][fp][gp][hp][ip][jp][kp][lp][mp][np][op][pp][qp][rp][sp][aq][bq][cq][dq][eq][fq][gq][hq][iq][jq][kq][lq][mq][nq][oq][qq][rq][sq][ar][br][cr][dr][er][fr][gr][hr][ir][jr][kr][lr][mr][nr][or][pr][qr][rr][sr][as][bs][cs][ds][es][fs][gs][hs][is][js][ks][ls][ms][ns][os][ps][qs][rs][ss]MA[dc][oc][qd][pe][qo][cp][pq]
        )(;AE[oc][qd]AB[qc]N[3-3 point]C[type: corner]CR[qa][ra][sa][qb][rb][sb][rc][sc]MA[qc]
        )(;AW[qd]AB[oc]N[Low approach]C[type: corner]CR[na][nb][nc][nd][ne][oa][ob][od][oe][pa][pb][pc][pd][pe][qa][qb][qc][qe][ra][rb][rc][rd][re][sa][sb][sc][sd][se]MA[oc]
        )(;AW[pd]AB[nc]N[Low approach]C[type: corner]CR[ma][mb][mc][md][me][na][nb][nd][ne][oa][ob][oc][od][oe][pa][pb][pc][pe][qa][qb][qc][qd][qe][ra][rb][rc][rd][re][sa][sb][sc][sd][se]MA[nc]
        )(;AW[qd]AB[od]N[High approach]C[type: corner]CR[na][nb][nc][nd][ne][oa][ob][oc][oe][pa][pb][pc][pd][pe][qa][qb][qc][qe][ra][rb][rc][rd][re][sa][sb][sc][sd][se]MA[od]
        )(;AW[pd]AB[nd]N[High approach]C[type: corner]CR[ma][mb][mc][md][me][na][nb][nc][ne][oa][ob][oc][od][oe][pa][pb][pc][pe][qa][qb][qc][qd][qe][ra][rb][rc][rd][re][sa][sb][sc][sd][se]MA[nd]
        )(;AB[oc][qd]N[Low enclosure]C[type: corner]CR[na][oa][pa][qa][ra][sa][nb][ob][pb][qb][rb][sb][nc][pc][qc][rc][sc][nd][od][pd][rd][sd][ne][oe][pe][qe][re][se]MA[oc][qd]
        )(;AB[nc][pd]N[Low enclosure]C[type: corner]CR[ma][na][oa][pa][qa][ra][sa][mb][nb][ob][pb][qb][rb][sb][mc][oc][pc][qc][rc][sc][md][nd][od][qd][rd][sd][me][ne][oe][pe][qe][re][se]MA[nc][pd]
        )(;AB[od][qd]N[High enclosure]C[type: corner]CR[na][oa][pa][qa][ra][sa][nb][ob][pb][qb][rb][sb][nc][oc][pc][qc][rc][sc][nd][pd][rd][sd][ne][oe][pe][qe][re][se]MA[od][qd]
        )(;AB[nd][pd]N[High enclosure]C[type: corner]CR[ma][na][oa][pa][qa][ra][sa][mb][nb][ob][pb][qb][rb][sb][mc][nc][oc][pc][qc][rc][sc][md][od][qd][rd][sd][me][ne][oe][pe][qe][re][se]MA[nd][pd]
        )(;AB[nc][qd]N[Low enclosure]C[type: corner]CR[ma][na][oa][pa][qa][ra][sa][mb][nb][ob][pb][qb][rb][sb][mc][oc][pc][qc][rc][sc][md][nd][od][pd][rd][sd][me][ne][oe][pe][qe][re][se]MA[nc][qd]
        )(;AB[mc][pd]N[Low enclosure]C[type: corner]CR[la][ma][na][oa][pa][qa][ra][sa][lb][mb][nb][ob][pb][qb][rb][sb][lc][nc][oc][pc][qc][rc][sc][ld][md][nd][od][qd][rd][sd][le][me][ne][oe][pe][qe][re][se]MA[mc][pd]
        )(;AB[nd][qd]N[High enclosure]C[type: corner]CR[ma][na][oa][pa][qa][ra][sa][mb][nb][ob][pb][qb][rb][sb][mc][nc][oc][pc][qc][rc][sc][md][od][pd][rd][sd][me][ne][oe][pe][qe][re][se]MA[nd][qd]
        )(;AB[md][pd]N[High enclosure]C[type: corner]CR[la][ma][na][oa][pa][qa][ra][sa][lb][mb][nb][ob][pb][qb][rb][sb][lc][mc][nc][oc][pc][qc][rc][sc][ld][nd][od][qd][rd][sd][le][me][ne][oe][pe][qe][re][se]MA[md][pd]
        )(;AB[dd][de][ef][ff][fd]N[Mouth shape]CR[ec][ed][fe][ge]MA[dd][fd][de][ef][ff]
        )(;AB[dd][de][fd][ff]N[Table shape]MA[dd][fd][de][ff]CR[ed][ee][fe][ge]
        )(;AB[dd][ed][df][fg]N[Tippy table]CR[de][ee][ef][ff]MA[fg]
        )(;AB[dd][ed][df][ef]N[Bamboo joint]MA[dd][ed][df][ef]CR[de][ee]
        )(;AB[dd][de][fd][ge]N[Trapezium]CR[ed][gd][ee][fe][ff]MA[fd][ge]
        )(;AB[dd][ce][ee][df]N[Diamond]MA[dd][ce][ee][df]CR[de]
        )(;AB[dd][ee][fd]N[Tiger’s mouth]CR[ec][ed]MA[dd][fd][ee]
        )(;AB[dd][de][ed]N[Empty triangle]MA[dd][ed][de]CR[ee]
        )(;AB[dd][ed][ee]AW[de]N[Turn]MA[dd][ee]
        )(;AB[dd][de]N[Stretch]MA[dd][de]
        )(;AB[dd][ee]N[Diagonal]MA[dd][ee]CR[ed][de]
        )(;AB[dd]AW[ed][cd]N[Wedge]CR[dc][de]MA[dd]
        )(;AB[dd][ee]AW[ed]N[Hane]MA[dd][ee]CR[de]
        )(;AB[dd][ee]AW[ed][de]N[Cut]MA[dd][ee]
        )(;AB[dd][fd][ff][df]N[Square]MA[dd][fd][df][ff]CR[ee]
        )(;AB[dd][fe][df][fg]N[Parallelogram]MA[dd][fe][df][fg]CR[ee][ef]
        )(;AB[dd][df][fe]N[Dog’s head]MA[dd][fe][df]CR[ed][de][ee][ef]
        )(;AB[dd][df][ge]N[Horse’s head]MA[dd][ge][df]CR[ed][de][ee][fe][ef]
        )(;AB[dd]AW[ed]N[Attachment]CR[dc][ec][de][ee]MA[dd]
        )(;AB[dd][fd]N[One-point jump]MA[dd][fd]CR[ed]
        )(;AB[dd][fe][eg]N[Big bulge]MA[dd][fe][eg]CR[ee][ef]
        )(;AB[dd][fe]N[Small knight]MA[dd][fe]CR[ed][ee]
        )(;AB[dd][gd]N[Two-point jump]MA[dd][gd]CR[ed][fd]
        )(;AB[dd][ge]N[Large knight]MA[dd][ge]CR[ed][fd][ee][fe]
        )(;AB[dd]AW[ee]N[Shoulder hit]CR[cc][dc][ec][cd][ed][ce][de]MA[dd]
        )(;AB[dd][ff]N[Diagonal jump]MA[dd][ff]CR[ed][de][ee][fe][ef]
        ))
    `)[0]
    let result = []

    for (let i = 0; i < tree.subtrees.length; i++) {
        let node = tree.subtrees[i].nodes[0]
        let anchors = node.MA.map(x => [...sgf.point2vertex(x), node.AB.includes(x) ? 1 : -1])
        let vertices = ['AW', 'CR', 'AB']
            .map((x, i) => (node[x] || []).map(y => [...sgf.point2vertex(y), i - 1]))
            .reduce((acc, x) => [...acc, ...x], [])

        let data = {}

        if ('C' in node) {
            for (let [key, value] of node.C[0].trim().split(', ').map(x => x.split(': '))) {
                data[key] = value
            }
        }

        result.push(Object.assign({
            name: node.N[0],
            anchors,
            vertices
        }, data))
    }

    return result
}

exports.cornerMatch = function(vertices, board) {
    let hypotheses = Array(8).fill(true)
    let hypothesesInvert = Array(8).fill(true)

    for (let [x, y, sign] of vertices) {
        let representatives = exports.getBoardSymmetries(board, [x, y])

        for (let i = 0; i < hypotheses.length; i++) {
            if (hypotheses[i] && board.get(representatives[i]) !== sign)
                hypotheses[i] = false
            if (hypothesesInvert[i] && board.get(representatives[i]) !== -sign)
                hypothesesInvert[i] = false
        }

        if (!hypotheses.includes(true) && !hypothesesInvert.includes(true))
            return null
    }

    let i = [...hypotheses, ...hypothesesInvert].indexOf(true)
    return i < 8 ? [i, false] : [i - 8, true]
}

exports.shapeMatch = function(shape, board, vertex) {
    if (!board.hasVertex(vertex)) return null

    let sign = board.get(vertex)
    if (sign === 0) return null
    let equalsVertex = equals(vertex)

    for (let anchor of shape.anchors) {
        let hypotheses = Array(8).fill(true)
        let i = 0

        if (shape.size != null && (board.width !== board.height || board.width !== +shape.size))
            continue

        if (shape.type === 'corner' && !exports.getBoardSymmetries(board, anchor.slice(0, 2)).some(equalsVertex))
            continue

        // Hypothesize vertex === anchor

        for (let [x, y, s] of shape.vertices) {
            let diff = [x - anchor[0], y - anchor[1]]
            let symm = exports.getSymmetries(diff)

            for (let k = 0; k < symm.length; k++) {
                if (!hypotheses[k]) continue
                let w = [vertex[0] + symm[k][0], vertex[1] + symm[k][1]]

                if (!board.hasVertex(w) || board.get(w) !== s * sign * anchor[2])
                    hypotheses[k] = false
            }

            i = hypotheses.indexOf(true)
            if (i < 0) break
        }

        if (i >= 0) return [i, sign !== anchor[2]]
    }

    return null
}

exports.getMoveInterpretation = function(board, vertex, {shapes = null} = {}) {
    if (!board.hasVertex(vertex)) return 'Pass'

    let sign = board.get(vertex)
    let neighbors = board.getNeighbors(vertex)

    // Check atari

    if (neighbors.some(v => board.get(v) === -sign && board.getLiberties(v).length === 1))
        return 'Atari'

    // Check connection

    let friendly = neighbors.filter(v => board.get(v) === sign)
    if (friendly.length === neighbors.length) return 'Fill'
    if (friendly.length >= 2) return 'Connect'

    // Load shape library if needed

    if (shapes == null) {
        if (_shapes == null) {
            _shapes = exports.readShapes(`${__dirname}/../data/shapes.sgf`)
        }

        shapes = _shapes
    }

    // Match shape

    for (let shape of shapes) {
        if (exports.shapeMatch(shape, board, vertex))
            return shape.name
    }

    // Determine position to edges

    let equalsVertex = equals(vertex)

    if (equalsVertex([(board.width - 1) / 2, (board.height - 1) / 2]))
        return 'Tengen'

    let diff = board.getCanonicalVertex(vertex).map(x => x + 1)

    if (!equals(diff)([4, 4]) && board.getHandicapPlacement(9).some(equalsVertex))
        return 'Hoshi'

    if (diff[1] <= 6)
        return diff.join('-') + ' point'

    return null
}
