const helper = require('./helper')
const alpha = 'ABCDEFGHJKLMNOPQRSTUVWXYZ'

class Board {
    constructor(width = 19, height = 19, arrangement = {}, captures = {'-1': 0, '1': 0}) {
        this.width = width
        this.height = height
        this.captures = {'-1': captures['-1'], '1': captures['1']}
        this.arrangement = {}
        this.markups = {}
        this.ghosts = []
        this.lines = []

        // Initialize arrangement
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                this.arrangement[[x, y]] = [x, y] in arrangement ? arrangement[[x, y]] : 0
            }
        }
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
                this.arrangement[[x, y]] = 0
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
        let mx = this.width - 1
        let my = this.height - 1
        if (!this.hasVertex(vertex)) return []

        return helper.getSymmetries(vertex).map(([x, y]) => [(x % mx + mx) % mx, (y % my + my) % my])
    }

    getNeighbors([x, y], ignoreBoard = false) {
        let result = []

        if (ignoreBoard || x > 0)
            result.push([x - 1, y])
        if (ignoreBoard || x < this.width - 1)
            result.push([x + 1, y])
        if (ignoreBoard || y > 0)
            result.push([x, y - 1])
        if (ignoreBoard || y < this.height - 1)
            result.push([x, y + 1])

        return result
    }

    getConnectedComponent(vertex, func, result = null) {
        if (func instanceof Array) {
            let signs = func
            func = v => signs.includes(this.arrangement[v])
        } else if (typeof func == 'number') {
            let sign = func
            func = v => this.arrangement[v] == sign
        }

        if (!this.hasVertex(vertex)) return []
        if (!result) result = [vertex]

        // Recursive depth-first search
        this.getNeighbors(vertex).forEach(v => {
            if (!func(v)) return
            if (result.some(w => w[0] == v[0] && w[1] == v[1])) return

            result.push(v)
            this.getConnectedComponent(v, func, result)
        })

        return result
    }

    getChain(vertex) {
        return this.getConnectedComponent(vertex, this.arrangement[vertex])
    }

    hasLiberties(vertex, visited = []) {
        let sign = this.arrangement[vertex]
        if (!this.hasVertex(vertex) || sign == 0) return false

        if (visited.some(v => v[0] == vertex[0] && v[1] == vertex[1]))
            return false

        let neighbors = this.getNeighbors(vertex)

        if (neighbors.some(n => this.arrangement[n] == 0))
            return true

        visited.push(vertex)

        return neighbors.filter(n => this.arrangement[n] == sign)
        .some(n => this.hasLiberties(n, visited))
    }

    getLiberties(vertex) {
        if (!this.hasVertex(vertex) || this.arrangement[vertex] == 0) return []

        let chain = this.getChain(vertex)
        let liberties = []
        let added = {}

        chain.forEach(c => {
            let freeNeighbors = this.getNeighbors(c).filter(n => this.arrangement[n] == 0)

            liberties.push(...freeNeighbors.filter(n => !(n in added)))
            freeNeighbors.forEach(n => added[n] = true)
        })

        return liberties
    }

    getRelatedChains(vertex) {
        if (!this.hasVertex(vertex) || this.arrangement[vertex] == 0) return []

        let area = this.getConnectedComponent(vertex, [this.arrangement[vertex], 0])
        return area.filter(v => this.arrangement[v] == this.arrangement[vertex])
    }

    getAreaMap() {
        let map = {}

        for (let i = 0; i < this.width; i++) {
            for (let j = 0; j < this.height; j++) {
                let vertex = [i, j]

                if (vertex in map) continue
                if (this.arrangement[vertex] != 0) {
                    map[vertex] = this.arrangement[vertex]
                    continue
                }

                let chain = this.getChain(vertex)
                let sign = 0
                let indicator = 1

                chain.forEach(c => {
                    if (indicator == 0) return

                    this.getNeighbors(c).forEach(n => {
                        if (this.arrangement[n] == 0 || indicator == 0) return

                        if (sign == 0) sign = this.arrangement[n]
                        else if (sign != this.arrangement[n]) indicator = 0
                    })
                })

                chain.forEach(c => {
                    map[c] = sign * indicator
                })
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
            if (this.arrangement[v] == sign) min = 0
            else if (this.arrangement[v] == 0) min++
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
                    && this.arrangement[x] != -sign
                    && !(x in visited)
                }).map(x => [x, d + 1]))
            }
        }

        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                let v = [x, y]
                if (v in done || this.arrangement[v] != sign) continue
                let chain = this.getChain(v)

                chain.forEach(x => { done[x] = true })
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

        for (let vertex in areaMap) {
            let sign = areaMap[vertex]
            if (sign == 0) continue

            score['area_' + sign]++
            if (this.arrangement[vertex] == 0) score['territory_' + sign]++
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
                if (this.arrangement[vertex] == 0 || vertex in liberties) continue
                if (!this.hasLiberties(vertex)) return false

                this.getChain(vertex).forEach(v => {
                    liberties[v] = true
                })
            }
        }

        return true
    }

    makeMove(sign, vertex) {
        let move = new Board(this.width, this.height, this.arrangement, this.captures)

        if (sign == 0 || !this.hasVertex(vertex)) return move
        if (this.arrangement[vertex] != 0) return null

        sign = sign > 0 ? 1 : -1
        move.arrangement[vertex] = sign

        // Remove captured stones

        let deadNeighbors = move.getNeighbors(vertex)
            .filter(n => move.arrangement[n] == -sign && !move.hasLiberties(n))

        deadNeighbors.forEach(n => {
            if (move.arrangement[n] == 0) return

            this.getChain(n).forEach(c => {
                move.arrangement[c] = 0
                move.captures[sign]++
            })
        })

        // Detect suicide

        if (deadNeighbors.length == 0 && !move.hasLiberties(vertex)) {
            move.getChain(vertex).forEach(c => {
                move.arrangement[c] = 0
                move.captures[-sign]++
            })
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

    getSvg(pixelsize) {
        if (!document) return null

        let ns = 'http://www.w3.org/2000/svg'
        let svg = document.createElementNS(ns, 'svg')
        let tileSize = (pixelsize - 1) / Math.max(this.width, this.height)
        let radius = tileSize / 2
        svg.setAttribute('width', tileSize * this.width + 1)
        svg.setAttribute('height', tileSize * this.height + 1)

        // Draw hoshi

        this.getHandicapPlacement(9).forEach(v => {
            let circle = document.createElementNS(ns, 'circle')
            circle.setAttribute('cx', v[0] * tileSize + radius + 1)
            circle.setAttribute('cy', v[1] * tileSize + radius + 1)
            circle.setAttribute('r', 2)
            circle.setAttribute('fill', '#5E2E0C')

            svg.appendChild(circle)
        })

        // Draw shadows

        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                if (this.arrangement[[x, y]] == 0) continue

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
                if (this.arrangement[[x, y]] == 0) continue

                let circle = document.createElementNS(ns, 'circle')
                circle.setAttribute('cx', x * tileSize + radius + 1)
                circle.setAttribute('cy', y * tileSize + radius + 1)
                circle.setAttribute('r', radius)

                if (this.arrangement[[x, y]] == -1)
                    circle.setAttribute('fill', 'white')

                svg.appendChild(circle)
            }
        }

        return svg
    }

    generateAscii() {
        let result = []

        let getIndexFromVertex = ([x, y]) => {
            let rowLength = 4 + this.width * 2
            return rowLength + rowLength * y + 1 + x * 2 + 1
        }

        // Make empty board

        result.push('+')
        for (let x = 0; x < this.width; x++) result.push('-', '-')
        result.push('-', '+', '\n')

        for (let y = 0; y < this.height; y++) {
            result.push('|')
            for (let x = 0; x < this.width; x++) result.push(' ', '.')
            result.push(' ', '|', '\n')
        }

        result.push('+')
        for (let x = 0; x < this.width; x++) result.push('-', '-')
        result.push('-', '+', '\n')

        this.getHandicapPlacement(9).forEach(v => {
            result[getIndexFromVertex(v)] = ','
        })

        // Place markups & stones

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
                let s = this.arrangement[v]

                if (!this.markups[v] || !(this.markups[v][0] in data)) {
                    if (s != 0) result[i] = data.plain[s + 1]
                } else {
                    let type = this.markups[v][0], label = this.markups[v][1]

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

        this.lines.forEach(line => {
            let start = line[0], end = line[1], arrow = line[2]
            let type = arrow ? 'AR' : 'LN'

            result += '{' + type + ' '
                + this.vertex2coord(start) + ' '
                + this.vertex2coord(end) + '}\n'
        })

        return ('\n' + result.trim()).split('\n').map(l => '$$ ' + l).join('\n')
    }

    getHash() {
        return helper.hash(JSON.stringify(this.arrangement))
    }
}

module.exports = Board
