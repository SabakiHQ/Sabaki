const helper = require('./helper')
const alpha = 'ABCDEFGHJKLMNOPQRSTUVWXYZ'

class Board {
    constructor(width = 19, height = 19, arrangement = [], captures = null) {
        this.width = width
        this.height = height
        this.captures = captures ? captures.slice() : [0, 0]
        this.arrangement = []
        this.markups = {}
        this.ghosts = {}
        this.lines = []

        // Initialize arrangement

        for (let y = 0; y < this.height; y++) {
            this.arrangement[y] = y in arrangement ? [...arrangement[y]] : Array(this.width).fill(0)
        }
    }

    get([x, y]) {
        return this.arrangement[y] ? this.arrangement[y][x] : undefined
    }

    set([x, y], sign) {
        this.arrangement[y][x] = sign
        return this
    }

    clone() {
        return new Board(this.width, this.height, this.arrangement, this.captures)
    }

    diff(board) {
        let result = []

        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                let sign = board.get([x, y])
                if (this.get([x, y]) === sign) continue

                result.push([x, y])
            }
        }

        return result
    }

    hasVertex([x, y]) {
        return 0 <= x && x < this.width && 0 <= y && y < this.height
    }

    clear() {
        this.arrangement = this.arrangement.map(_ => Array(this.width).fill(0))
    }

    isSquare() {
        return this.width === this.height
    }

    getDistance(v, w) {
        return Math.abs(v[0] - w[0]) + Math.abs(v[1] - w[1])
    }

    getDistanceToGround(vertex) {
        return this.getCanonicalVertex(vertex)[0]
    }

    getCanonicalVertex(vertex) {
        if (!this.hasVertex(vertex)) return [-1, -1]

        let boardSize = [this.width, this.height]

        return vertex.map((x, i) => Math.min(x, boardSize[i] - x - 1))
            .sort((x, y) => x - y)
    }

    getNeighbors(vertex, ignoreBoard = false) {
        if (!ignoreBoard && !this.hasVertex(vertex)) return []

        let [x, y] = vertex
        let allNeighbors = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]

        return ignoreBoard ? allNeighbors : allNeighbors.filter(v => this.hasVertex(v))
    }

    getConnectedComponent(vertex, func, result = null) {
        if (func instanceof Array) {
            let signs = func
            func = v => signs.includes(this.get(v))
        } else if (typeof func === 'number') {
            let sign = func
            func = v => this.get(v) === sign
        }

        if (!this.hasVertex(vertex)) return []
        if (!result) result = [vertex]

        // Recursive depth-first search

        for (let v of this.getNeighbors(vertex)) {
            if (!func(v)) continue
            if (result.some(w => helper.vertexEquals(v, w))) continue

            result.push(v)
            this.getConnectedComponent(v, func, result)
        }

        return result
    }

    getChain(vertex) {
        return this.getConnectedComponent(vertex, this.get(vertex))
    }

    hasLiberties(vertex, visited = {}) {
        let sign = this.get(vertex)
        if (!this.hasVertex(vertex) || sign === 0) return false

        if (vertex in visited) return false
        let neighbors = this.getNeighbors(vertex)

        if (neighbors.some(n => this.get(n) === 0))
            return true

        visited[vertex] = true

        return neighbors.filter(n => this.get(n) === sign)
        .some(n => this.hasLiberties(n, visited))
    }

    getLiberties(vertex) {
        if (!this.hasVertex(vertex) || this.get(vertex) === 0) return []

        let chain = this.getChain(vertex)
        let liberties = []
        let added = {}

        for (let c of chain) {
            let freeNeighbors = this.getNeighbors(c).filter(n => this.get(n) === 0)

            liberties.push(...freeNeighbors.filter(n => !(n in added)))
            freeNeighbors.forEach(n => added[n] = true)
        }

        return liberties
    }

    getRelatedChains(vertex) {
        if (!this.hasVertex(vertex) || this.get(vertex) === 0) return []

        let area = this.getConnectedComponent(vertex, [this.get(vertex), 0])
        return area.filter(v => this.get(v) === this.get(vertex))
    }

    getAreaMap() {
        let map = [...Array(this.height)].map(_ => Array(this.width).fill(null))

        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                let vertex = [x, y]

                if (map[y][x] != null) continue
                if (this.get(vertex) !== 0) {
                    map[y][x] = this.get(vertex)
                    continue
                }

                let chain = this.getChain(vertex)
                let sign = 0
                let indicator = 1

                for (let c of chain) {
                    if (indicator === 0) break

                    for (let n of this.getNeighbors(c)) {
                        if (indicator === 0) break
                        if (this.get(n) === 0) continue

                        let [i, j] = n
                        if (sign === 0) sign = map[j][i] = this.get(n)
                        else if (sign !== this.get(n)) indicator = 0
                    }
                }

                for (let [i, j] of chain) {
                    map[j][i] = sign * indicator
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
                if (map[y][x] !== 0) continue

                let s = Math.sign(nnnmap[y][x] - pnnmap[y][x])
                if (s > 0 && pnnmap[y][x] > 6 || s < 0 && nnnmap[y][x] > 6
                || s > 0 && Math.round(pimap[y][x]) < 2 || s < 0 && Math.round(nimap[y][x]) < 2)
                    s = 0

                map[y][x] = s
            }
        }

        // Fix holes and prevent single point areas

        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                let neighbors = this.getNeighbors([x, y])
                if (neighbors.length === 0) continue

                let [i, j] = neighbors[0]
                let s = map[y][x] === 0 ? map[j][i] : 0

                if (neighbors.every(([i, j]) => map[j][i] === s))
                    map[y][x] = s
            }
        }

        return map
    }

    getNearestNeighborMap(sign) {
        let map = [...Array(this.height)].map(_ => Array(this.width).fill(Infinity))
        let min = Infinity

        let f = (x, y) => {
            let v = [x, y]
            if (this.get(v) === sign) min = 0
            else if (this.get(v) === 0) min++
            else min = Infinity

            map[y][x] = min = Math.min(min, map[y][x])
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
        let map = [...Array(this.height)].map(_ => Array(this.width).fill(0))
        let size = [this.width, this.height]
        let done = []

        // Cast influence

        let getVertex = v => {
            if (this.hasVertex(v)) return v
            return v.map((z, i) => z < 0 ? -z - 1 : z >= size[i] ? 2 * size[i] - z - 1 : z)
        }

        let castInfluence = (chain, distance) => {
            let queue = chain.map(x => [x, 0])
            let visited = []

            while (queue.length > 0) {
                let [v, d] = queue.shift()
                let [x, y] = getVertex(v)

                map[y][x] += !this.hasVertex(v) ? 2 : 1.5 / (d / distance * 6 + 1)

                for (let n of this.getNeighbors(v, true)) {
                    if (d + 1 > distance
                    || this.get(n) === -sign
                    || visited.some(w => helper.vertexEquals(n, w))) continue

                    visited.push(n)
                    queue.push([n, d + 1])
                }
            }
        }

        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                let v = [x, y]
                if (this.get(v) !== sign || done.some(w => helper.vertexEquals(v, w))) continue

                let chain = this.getChain(v)
                chain.forEach(w => done.push(w))

                castInfluence(chain, 6)
            }
        }

        return map
    }

    getScore(areaMap) {
        let score = {
            area: [0, 0],
            territory: [0, 0],
            captures: this.captures
        }

        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                let sign = areaMap[y][x]
                if (sign === 0) continue

                let index = sign > 0 ? 0 : 1

                score.area[index]++
                if (this.get([x, y]) === 0) score.territory[index]++
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
                if (this.get(vertex) === 0 || vertex in liberties) continue
                if (!this.hasLiberties(vertex)) return false

                this.getChain(vertex).forEach(v => liberties[v] = true)
            }
        }

        return true
    }

    makeMove(sign, vertex) {
        let move = this.clone()

        if (sign === 0 || !this.hasVertex(vertex)) return move

        sign = sign > 0 ? 1 : -1
        move.set(vertex, sign)

        // Remove captured stones

        let deadNeighbors = move.getNeighbors(vertex)
            .filter(n => move.get(n) === -sign && !move.hasLiberties(n))

        for (let n of deadNeighbors) {
            if (move.get(n) === 0) continue

            for (let c of move.getChain(n)) {
                move.set(c, 0)
                move.captures[(-sign + 1) / 2]++
            }
        }

        move.set(vertex, sign)

        // Detect suicide

        if (deadNeighbors.length === 0 && !move.hasLiberties(vertex)) {
            for (let c of move.getChain(vertex)) {
                move.set(c, 0)
                move.captures[(sign + 1) / 2]++
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

        if (this.width % 2 !== 0 && this.height % 2 !== 0) {
            if (count === 5) result.push([middleX, middleY])
            result.push([nearX, middleY], [farX, middleY])

            if (count === 7) result.push([middleX, middleY])
            result.push([middleX, nearY], [middleX, farY], [middleX, middleY])
        } else if (this.width % 2 !== 0) {
            result.push([middleX, nearY], [middleX, farY])
        } else if (this.height % 2 !== 0) {
            result.push([nearX, middleY], [farX, middleY])
        }

        return result.slice(0, count)
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
                    if (s !== 0) result[i] = data.plain[s + 1]
                } else {
                    let [type, label] = this.markups[v]

                    if (type !== 'label') {
                        result[i] = data[type][s + 1]
                    } else if (s === 0 && label.length === 1 && isNaN(parseFloat(label))) {
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

    getPositionHash() {
        return helper.hash(JSON.stringify(this.arrangement))
    }

    getHash() {
        return helper.hash(JSON.stringify([
            this.getPositionHash(),
            this.captures,
            this.markups,
            this.ghosts,
            this.lines
        ]))
    }
}

module.exports = Board
