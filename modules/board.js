const helper = require('./helper')
const alpha = 'ABCDEFGHJKLMNOPQRSTUVWXYZ'

class Board {
    constructor(width = 19, height = 19, arrangement = [], captures = {'-1': 0, '1': 0}) {
        this.width = width
        this.height = height
        this.captures = {'-1': captures['-1'], '1': captures['1']}
        this.arrangement = []
        this.markups = {}
        this.ghosts = []
        this.lines = []

        // Initialize arrangement
        for (let i = 0; i < Math.max(arrangement.length, width * height); i++) {
            this.arrangement[i] = arrangement[i] || 0
        }
    }

    vertex2index([x, y]) {
        return y * this.width + x
    }

    get(vertex) {
        return this.arrangement[this.vertex2index(vertex)]
    }

    set(vertex, sign) {
        this.arrangement[this.vertex2index(vertex)] = sign
        return this
    }

    clone() {
        return this.makeMove(0)
    }

    hasVertex([x, y]) {
        return 0 <= x && x < this.width && 0 <= y && y < this.height
    }

    clear() {
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                this.set([x, y], 0)
            }
        }
    }

    isSquare() {
        return this.width == this.height
    }

    getDistance(v, w) {
        return Math.abs(v[0] - w[0]) + Math.abs(v[1] - w[1])
    }

    getDistanceToGround(vertex) {
        return this.getCanonicalVertex(vertex)[0]
    }

    getCanonicalVertex(vertex) {
        if (!this.hasVertex(vertex)) return [-1, -1]

        let v = [
            Math.min(vertex[0], this.width - vertex[0] - 1),
            Math.min(vertex[1], this.height - vertex[1] - 1)
        ]

        return v.sort((x, y) => x - y)
    }

    getSymmetries(vertex) {
        if (!this.hasVertex(vertex)) return []

        let [mx, my] = [this.width - 1, this.height - 1]
        let mod = (x, m) => (x % m + m) % m

        return helper.getSymmetries(vertex).map(([x, y]) => [mod(x, mx), mod(y, my)])
    }

    getNeighbors(vertex, ignoreBoard = false) {
        if (!ignoreBoard && !this.hasVertex(vertex)) return []
        let [x, y] = vertex

        return [
            [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]
        ].filter(v => ignoreBoard || this.hasVertex(v))
    }

    getConnectedComponent(vertex, func, result) {
        if (func instanceof Array) {
            let signs = func
            func = v => signs.includes(this.get(v))
        }

        if (!this.hasVertex(vertex)) return []
        if (!result) result = [vertex]

        // Recursive depth-first search
        for (let v of this.getNeighbors(vertex)) {
            if (!func(v)) continue
            if (result.some(w => w[0] == v[0] && w[1] == v[1])) continue

            result.push(v)
            this.getConnectedComponent(v, func, result)
        }

        return result
    }

    getChain(vertex) {
        return this.getConnectedComponent(vertex, [this.get(vertex)])
    }

    getLiberties(vertex) {
        if (!this.hasVertex(vertex) || this.get(vertex) == 0) return []

        let chain = this.getChain(vertex)
        let liberties = []

        for (let c of chain) {
            liberties.push(...this.getNeighbors(c).filter(n => {
                return this.get(n) == 0
                && !liberties.some(v => v[0] == n[0] && v[1] == n[1])
            }))
        }

        return liberties
    }

    getRelatedChains(vertex) {
        if (!this.hasVertex(vertex) || this.get(vertex) == 0) return []

        let area = this.getConnectedComponent(vertex, [this.get(vertex), 0])
        return area.filter(v => this.get(v) == this.get(vertex))
    }

    getAreaMap() {
        let map = {}

        for (let i = 0; i < this.width; i++) {
            for (let j = 0; j < this.height; j++) {
                let vertex = [i, j]

                if (vertex in map) continue
                if (this.get(vertex) != 0) {
                    map[vertex] = this.get(vertex)
                    continue
                }

                let chain = this.getChain(vertex)
                let sign = 0
                let indicator = 1

                for (let c of chain) {
                    if (indicator == 0) continue

                    for (let n of this.getNeighbors(c)) {
                        if (this.get(n) == 0 || indicator == 0) continue

                        if (sign == 0) sign = map[n] = this.get(n)
                        else if (sign != this.get(n)) indicator = 0
                    }
                }

                for (let c of chain) {
                    map[c] = sign * indicator
                }
            }
        }

        return map
    }

    getAreaEstimateMap() {
        let map = this.getAreaMap()

        let pnnmap = this.getNearestNeighborMap(1)
        let nnnmap = this.getNearestNeighborMap(-1)
        let pimap = this.getInfluenceMap(1)
        let nimap = this.getInfluenceMap(-1)

        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                let v = [x, y]
                if (map[v] != 0) continue

                let s = Math.sign(nnnmap[v] - pnnmap[v])
                if (s > 0 && pnnmap[v] > 6 || s < 0 && nnnmap[v] > 6
                || s > 0 && Math.round(pimap[v]) < 2 || s < 0 && Math.round(nimap[v]) < 2)
                    s = 0

                map[v] = s
            }
        }

        // Fix holes and prevent single point areas

        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                let v = [x, y]
                let neighbors = this.getNeighbors(v)
                if (neighbors.length == 0) continue

                let s = map[v] == 0 ? map[neighbors[0]] : 0
                if (neighbors.every(x => map[x] == s))
                    map[v] = s
            }
        }

        return map
    }

    getNearestNeighborMap(sign) {
        let map = {}
        let min = Infinity

        let f = (x, y) => {
            let v = [x, y]
            if (this.get(v) == sign) min = 0
            else if (this.get(v) == 0) min++
            else min = Infinity

            map[v] = min = v in map ? Math.min(min, map[v]) : min
        }

        for (let y = 0; y < this.height; y++) {
            min = Infinity

            for (let x = 0; x < this.width; x++) {
                let old = Infinity

                f(x, y)
                old = min

                for (let ny = y + 1; ny < this.height; ny++) f(x, ny)
                min = old

                for (let ny = y - 1; ny >= 0; ny--) f(x, ny)
                min = old
            }
        }

        for (let y = this.height - 1; y >= 0; y--) {
            min = Infinity

            for (let x = this.width - 1; x >= 0; x--) {
                let old = Infinity

                f(x, y)
                old = min

                for (let ny = y + 1; ny < this.height; ny++) f(x, ny)
                min = old

                for (let ny = y - 1; ny >= 0; ny--) f(x, ny)
                min = old
            }
        }

        return map
    }

    getInfluenceMap(sign) {
        let map = {}
        let done = {}

        // Initialize

        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                map[[x, y]] = 0
            }
        }

        // Cast influence

        let getVertex = v => {
            if (this.hasVertex(v)) return v

            let [x, y] = v

            if (x < 0)
                x = -x - 1
            else if (x >= this.width)
                x = 2 * this.width - x - 1

            if (y < 0)
                y = -y - 1
            else if (y >= this.height)
                y = 2 * this.height - y - 1

            return [x, y]
        }

        let castInfluence = (chain, distance) => {
            let stack = chain.map(x => [x, 0])
            let visited = {}

            while (stack.length > 0) {
                let tuple = stack.shift()
                let v = tuple[0], d = tuple[1]

                if (v in visited) continue
                visited[v] = true
                map[getVertex(v)] += !this.hasVertex(v) ? 2 : 1.5 / (d / distance * 6 + 1)

                stack.push(...this.getNeighbors(v, true).filter(x => {
                    return d + 1 <= distance
                    && this.get(x) != -sign
                    && !(x in visited)
                }).map(x => [x, d + 1]))
            }
        }

        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                let v = [x, y]
                if (v in done || this.get(v) != sign) continue
                let chain = this.getChain(v)

                chain.forEach(x => done[x] = true)
                castInfluence(chain, 6)
            }
        }

        return map
    }

    getScore(areaMap) {
        let score = {}

        score['area_1'] = 0
        score['area_-1'] = 0
        score['territory_1'] = 0
        score['territory_-1'] = 0
        score['captures_1'] = this.captures['1']
        score['captures_-1'] = this.captures['-1']

        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                let vertex = [x, y]
                let sign = areaMap[vertex]
                if (sign == 0) continue

                score['area_' + sign]++
                if (this.get(vertex) == 0) score['territory_' + sign]++
            }
        }

        return score
    }

    vertex2coord(vertex) {
        if (!this.hasVertex(vertex)) return null
        return alpha[vertex[0]] + (this.height - vertex[1])
    }

    coord2vertex(coord) {
        let x = alpha.indexOf(coord[0].toUpperCase())
        let y = this.height - +coord.substr(1)
        return [x, y]
    }

    isValid() {
        let liberties = {}

        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                let vertex = [x, y]
                if (this.get(vertex) == 0 || vertex in liberties) continue

                let l = this.getLiberties(vertex).length
                if (l == 0) return false

                this.getChain(vertex).forEach(v => liberties[v] = l)
            }
        }

        return true
    }

    makeMove(sign, vertex) {
        let move = new Board(this.width, this.height, this.arrangement, this.captures)

        if (sign == 0 || !this.hasVertex(vertex)) return move
        if (this.get(vertex) != 0) return null

        sign = sign > 0 ? 1 : -1
        let suicide = true

        // Remove captured stones
        for (let n of this.getNeighbors(vertex)) {
            if (move.get(n) != -sign) continue

            let ll = this.getLiberties(n)
            if (ll.length != 1) continue

            let l = ll[0]
            if (l[0] != vertex[0] || l[1] != vertex[1]) continue

            for (let c of this.getChain(n)) {
                move.set(c, 0)
                move.captures[sign.toString()]++
            }

            suicide = false;
        }

        move.set(vertex, sign)

        // Detect suicide
        if (suicide) {
            let chain = move.getChain(vertex)

            if (move.getLiberties(vertex).length == 0) {
                for (let c of chain) {
                    move.set(c, 0)
                    move.captures[(-sign).toString()]++
                }
            }
        }

        return move
    }

    getHandicapPlacement(count) {
        if (Math.min(this.width, this.height) < 6 || count < 2) return []

        let nearX = this.width >= 13 ? 3 : 2
        let nearY = this.height >= 13 ? 3 : 2
        let farX = this.width - nearX - 1
        let farY = this.height - nearY - 1

        let result = [[nearX, farY], [farX, nearY], [nearX, nearY], [farX, farY]]
        let middleX = (this.width - 1) / 2
        let middleY = (this.height - 1) / 2

        if (this.width % 2 != 0 && this.height % 2 != 0) {
            if (count == 5) result.push([middleX, middleY])
            result.push([nearX, middleY], [farX, middleY])

            if (count == 7) result.push([middleX, middleY])
            result.push([middleX, nearY], [middleX, farY], [middleX, middleY])
        } else if (this.width % 2 != 0) {
            result.push([middleX, nearY], [middleX, farY])
        } else if (this.height % 2 != 0) {
            result.push([nearX, middleY], [farX, middleY])
        }

        return result.slice(0, count)
    }

    guessDeadStones() {
        let map = this.getAreaEstimateMap()
        let done = {}
        let result = []
        let list = []

        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                let vertex = [x, y]
                let sign = this.get(vertex)
                if (sign == 0 || vertex in done) continue

                let area = this.getConnectedComponent(vertex, v => map[v] == sign)

                area.forEach(v => done[v] = true)
                list.push([vertex, area.length])
            }
        }

        list.sort((a, b) => a[1] - b[1])

        for (let i = 0; i < list.length; i++) {
            let vertex = list[i][0]
            let sign = this.get(vertex)
            let area = this.getConnectedComponent(vertex, v => map[v] == sign)

            if (area.length >= 8) continue

            area.forEach(v => map[v] = -sign)
            result.push(...area.filter(v => this.get(v) != 0))
        }

        return result
    }

    determineDeadStones() {
        let map = this.getAreaMap()
        let done = {}
        let result = []

        for (let i = 0; i < this.width; i++) {
            for (let j = 0; j < this.height; j++) {
                let vertex = [i, j]
                if (map[vertex] != 0 || vertex in done) continue

                let posArea = this.getConnectedComponent(vertex, [0, -1])
                let negArea = this.getConnectedComponent(vertex, [0, 1])
                let posDead = posArea.filter(v => this.get(v) == -1)
                let negDead = negArea.filter(v => this.get(v) == 1)

                let sign = 0
                let actualArea, actualDead

                let negDiff = negArea.filter(y => {
                    return !negDead.some(x => x[0] == y[0] && x[1] == y[1])
                        && !posArea.some(x => x[0] == y[0] && x[1] == y[1])
                })

                let posDiff = posArea.filter(y => {
                    return !posDead.some(x => x[0] == y[0] && x[1] == y[1])
                        && !negArea.some(x => x[0] == y[0] && x[1] == y[1])
                })

                if (negDiff.length <= 1 && negDead.length <= posDead.length) {
                    sign--
                    actualArea = negArea
                    actualDead = negDead
                }

                if (posDiff.length <= 1 && posDead.length <= negDead.length) {
                    sign++
                    actualArea = posArea
                    actualDead = posDead
                }

                if (sign == 0) {
                    actualArea = this.getChain(vertex)
                    actualDead = []
                }

                actualArea.forEach(v => done[v] = 1)
                result.push(...actualDead)
            }
        }

        return result
    }

    getSvg(pixelsize) {
        if (!document) return null

        let ns = 'http://www.w3.org/2000/svg'
        let svg = document.createElementNS(ns, 'svg')
        let tileSize = (pixelsize - 1) / Math.max(this.width, this.height)
        let radius = tileSize / 2
        svg.setAttribute('width', tileSize * this.width + 1)
        svg.setAttribute('height', tileSize * this.height + 1)

        // Draw hoshi

        for (let [x, y] of this.getHandicapPlacement(9)) {
            let circle = document.createElementNS(ns, 'circle')
            circle.setAttribute('cx', x * tileSize + radius + 1)
            circle.setAttribute('cy', y * tileSize + radius + 1)
            circle.setAttribute('r', 2)
            circle.setAttribute('fill', '#5E2E0C')

            svg.appendChild(circle)
        }

        // Draw shadows

        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                if (this.get([x, y]) == 0) continue

                let circle = document.createElementNS(ns, 'circle')
                circle.setAttribute('cx', x * tileSize + radius + 1)
                circle.setAttribute('cy', y * tileSize + radius + 2)
                circle.setAttribute('r', radius)
                circle.setAttribute('fill', 'rgba(0, 0, 0, .5)')

                svg.appendChild(circle)
            }
        }

        // Draw stones

        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                if (this.get([x, y]) == 0) continue

                let circle = document.createElementNS(ns, 'circle')
                circle.setAttribute('cx', x * tileSize + radius + 1)
                circle.setAttribute('cy', y * tileSize + radius + 1)
                circle.setAttribute('r', radius)

                if (this.get([x, y]) == -1)
                    circle.setAttribute('fill', 'white')

                svg.appendChild(circle)
            }
        }

        return svg
    }

    generateAscii() {
        let result = []
        let lb = helper.linebreak

        let getIndexFromVertex = ([x, y]) => {
            let rowLength = 4 + this.width * 2
            return rowLength + rowLength * y + 1 + x * 2 + 1
        }

        // Make empty board

        result.push('+')
        for (let x = 0; x < this.width; x++) result.push('-', '-')
        result.push('-', '+', lb)

        for (let y = 0; y < this.height; y++) {
            result.push('|')
            for (let x = 0; x < this.width; x++) result.push(' ', '.')
            result.push(' ', '|', lb)
        }

        result.push('+')
        for (let x = 0; x < this.width; x++) result.push('-', '-')
        result.push('-', '+', lb)

        this.getHandicapPlacement(9).forEach(v => result[getIndexFromVertex(v)] = ',')

        // Place markers & stones

        let data = {
            plain: ['O', null, 'X'],
            circle: ['W', 'C', 'B'],
            square: ['@', 'S', '#'],
            triangle: ['Q', 'T', 'Y'],
            cross: ['P', 'M', 'Z'],
            label: null
        }

        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                let v = [x, y]
                let i = getIndexFromVertex(v)
                let s = this.get(v)

                if (!this.markups[v] || !(this.markups[v][0] in data)) {
                    if (s != 0) result[i] = data.plain[s + 1]
                } else {
                    let [type, label] = this.markups[v]

                    if (type != 'label') {
                        result[i] = data[type][s + 1]
                    } else if (s == 0 && label.length == 1 && isNaN(parseFloat(label))) {
                        result[i] = label.toLowerCase()
                    }
                }
            }
        }

        result = result.join('')

        // Add lines & arrows

        for (let [start, end, arrow] of this.lines) {
            result += `{${arrow ? 'AR' : 'LN'} ${this.vertex2coord(start)} ${this.vertex2coord(end)}}${lb}`
        }

        return (lb + result.trim()).split(lb).map(l => `$$ ${l}`).join(lb)
    }

    getHash() {
        return helper.hash(JSON.stringify(this.arrangement))
    }
}

module.exports = Board
