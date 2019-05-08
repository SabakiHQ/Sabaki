const helper = require('./helper')
const alpha = 'ABCDEFGHJKLMNOPQRSTUVWXYZ'

class Board {
    constructor(width = 19, height = 19, arrangement = [], captures = null) {
        this.width = width
        this.height = height
        this.captures = captures ? captures.slice() : [0, 0]
        this.arrangement = []
        this.markers = null
        this.lines = []
        this.childrenInfo = {}
        this.siblingsInfo = {}

        // Initialize maps

        for (let y = 0; y < this.height; y++) {
            this.arrangement[y] = y in arrangement ? [...arrangement[y]] : Array(this.width).fill(0)
        }

        this.markers = this.arrangement.map(row => row.map(_ => null))
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
        if (board.width !== this.width || board.height !== this.height) {
            return null
        }

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
        this.arrangement = this.arrangement.map(row => row.map(_ => 0))
    }

    isSquare() {
        return this.width === this.height
    }

    isEmpty() {
        return this.arrangement.every(row => row.every(x => x === 0))
    }

    getDistance(v, w) {
        return Math.abs(v[0] - w[0]) + Math.abs(v[1] - w[1])
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

    getScore(areaMap, {komi = 0, handicap = 0} = {}) {
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

        score.areaScore = score.area[0] - score.area[1] - komi - handicap
        score.territoryScore = score.territory[0] - score.territory[1]
            + score.captures[0] - score.captures[1] - komi

        return score
    }

    vertex2coord(vertex) {
        if (!this.hasVertex(vertex)) return null
        return alpha[vertex[0]] + (this.height - vertex[1])
    }

    coord2vertex(coord) {
        let x = alpha.indexOf(coord[0].toUpperCase())
        let y = this.height - +coord.slice(1)
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

    getHandicapPlacement(count, tygemflag = false) {
        if (Math.min(this.width, this.height) <= 6 || count < 2) return []

        let [nearX, nearY] = [this.width, this.height].map(x => x >= 13 ? 3 : 2)
        let [farX, farY] = [this.width - nearX - 1, this.height - nearY - 1]
        let [middleX, middleY] = [this.width, this.height].map(x => (x - 1) / 2)

        let result = !tygemflag
            ? [[nearX, farY], [farX, nearY], [farX, farY], [nearX, nearY]]
            : [[nearX, farY], [farX, nearY], [nearX, nearY], [farX, farY]]

        if (this.width % 2 !== 0 && this.height % 2 !== 0 && this.width !== 7 && this.height !== 7) {
            if (count === 5) result.push([middleX, middleY])
            result.push([nearX, middleY], [farX, middleY])

            if (count === 7) result.push([middleX, middleY])
            result.push([middleX, nearY], [middleX, farY], [middleX, middleY])
        } else if (this.width % 2 !== 0 && this.width !== 7) {
            result.push([middleX, nearY], [middleX, farY])
        } else if (this.height % 2 !== 0 && this.height !== 7) {
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
            label: ['O', null, 'X']
        }

        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                let v = [x, y]
                let i = getIndexFromVertex(v)
                let s = this.get(v)

                if (!this.markers[y][x] || !(this.markers[y][x].type in data)) {
                    if (s !== 0) result[i] = data.plain[s + 1]
                } else {
                    let {type, label} = this.markers[y][x]

                    if (type !== 'label' || s !== 0) {
                        result[i] = data[type][s + 1]
                    } else if (s === 0 && label.length === 1 && isNaN(parseFloat(label))) {
                        result[i] = label.toLowerCase()
                    }
                }
            }
        }

        result = result.join('')

        // Add lines & arrows

        for (let {v1, v2, type} of this.lines) {
            result += `{${type === 'arrow' ? 'AR' : 'LN'} ${this.vertex2coord(v1)} ${this.vertex2coord(v2)}}${lb}`
        }

        return (lb + result.trim()).split(lb).map(l => `$$ ${l}`).join(lb)
    }

    getPositionHash() {
        return helper.hash(JSON.stringify(this.arrangement))
    }

    getHash() {
        return helper.hash(JSON.stringify([
            this.arrangement,
            this.captures,
            this.markers,
            this.lines
        ]))
    }
}

module.exports = Board
