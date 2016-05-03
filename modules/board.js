(function(root) {

var helper = root.helper

if (typeof require != 'undefined') {
    helper = require('./helper')
}

var alpha = 'ABCDEFGHJKLMNOPQRSTUVWXYZ'

var Board = function(width, height, arrangement, captures) {
    this.width = width ? width : 19
    this.height = height ? height : 19
    this.captures = captures ? { '-1': captures['-1'], '1': captures['1'] } : { '-1': 0, '1': 0 }
    this.arrangement = {}
    this.markups = {}
    this.lines = []

    // Initialize arrangement
    for (var x = 0; x < this.width; x++) {
        for (var y = 0; y < this.height; y++) {
            this.arrangement[[x, y]] = arrangement ? arrangement[[x, y]] : 0
        }
    }
}

Board.prototype = {
    clone: function() {
        return this.makeMove(0)
    },

    hasVertex: function(vertex) {
        var x = vertex[0], y = vertex[1]
        return 0 <= x && x < this.width && 0 <= y && y < this.height
    },

    clear: function() {
        for (var x = 0; x < this.width; x++) {
            for (var y = 0; y < this.height; y++) {
                this.arrangement[[x, y]] = 0
            }
        }
    },

    isSquare: function() {
        return this.width == this.height
    },

    getDistance: function(v, w) {
        return Math.abs(v[0] - w[0]) + Math.abs(v[1] - w[1])
    },

    getDistanceToGround: function(vertex) {
        return this.getCanonicalVertex(vertex)[0]
    },

    getCanonicalVertex: function(vertex) {
        if (!this.hasVertex(vertex)) return [-1, -1]

        var v = [
            Math.min(vertex[0], this.width - vertex[0] - 1),
            Math.min(vertex[1], this.height - vertex[1] - 1)
        ]

        v.sort(function(x, y) { return x - y })

        return v
    },

    getSymmetries: function(vertex) {
        var self = this
        var mx = self.width - 1
        var my = self.height - 1
        if (!self.hasVertex(vertex)) return []

        return helper.getSymmetries(vertex).map(function(v) {
            var x = v[0], y = v[1]
            return [(x % mx + mx) % mx, (y % my + my) % my]
        })
    },

    getNeighbors: function(vertex) {
        var self = this
        if (!self.hasVertex(vertex)) return []
        var x = vertex[0], y = vertex[1]

        return [
            [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]
        ].filter(self.hasVertex.bind(self))
    },

    getConnectedComponent: function(vertex, colors, result) {
        if (!this.hasVertex(vertex)) return []
        if (!result) result = [vertex]

        // Recursive depth-first search
        this.getNeighbors(vertex).forEach(function(v) {
            if (colors.indexOf(this.arrangement[v]) == -1) return
            if (result.some(function(w) { return w[0] == v[0] && w[1] == v[1] })) return

            result.push(v)
            this.getConnectedComponent(v, colors, result)
        }.bind(this))

        return result
    },

    getChain: function(vertex) {
        return this.getConnectedComponent(vertex, [this.arrangement[vertex]])
    },

    getLiberties: function(vertex) {
        if (!this.hasVertex(vertex) || this.arrangement[vertex] == 0) return []

        var self = this
        var chain = self.getChain(vertex)
        var liberties = []

        chain.forEach(function(c) {
            liberties.push.apply(liberties, self.getNeighbors(c).filter(function(n) {
                return self.arrangement[n] == 0
                && !liberties.some(function(v) { return v[0] == n[0] && v[1] == n[1] })
            }))
        })

        return liberties
    },

    getRelatedChains: function(vertex) {
        if (!this.hasVertex(vertex) || this.arrangement[vertex] == 0) return []

        var area = this.getConnectedComponent(vertex, [this.arrangement[vertex], 0])
        return area.filter(function(v) {
            return this.arrangement[v] == this.arrangement[vertex]
        }, this)
    },

    getAreaMap: function() {
        var self = this
        var map = {}

        for (var i = 0; i < self.width; i++) {
            for (var j = 0; j < self.height; j++) {
                var vertex = [i, j]

                if (vertex in map) continue
                if (self.arrangement[vertex] != 0) {
                    map[vertex] = self.arrangement[vertex]
                    continue
                }

                var chain = self.getChain(vertex)
                var sign = 0
                var indicator = 1

                chain.forEach(function(c) {
                    if (indicator == 0) return

                    self.getNeighbors(c).forEach(function(n) {
                        if (self.arrangement[n] == 0 || indicator == 0) return

                        if (sign == 0) sign = map[n] = self.arrangement[n]
                        else if (sign != self.arrangement[n]) indicator = 0
                    })
                })

                chain.forEach(function(c) {
                    map[c] = sign * indicator
                })
            }
        }

        return map
    },

    getScore: function(areaMap) {
        var score = {}

        score['area_1'] = 0
        score['area_-1'] = 0
        score['territory_1'] = 0
        score['territory_-1'] = 0
        score['captures_1'] = this.captures['1']
        score['captures_-1'] = this.captures['-1']

        for (var vertex in areaMap) {
            var sign = areaMap[vertex]
            if (sign == 0) continue

            score['area_' + sign]++
            if (this.arrangement[vertex] == 0) score['territory_' + sign]++
        }

        return score
    },

    vertex2coord: function(vertex) {
        if (!this.hasVertex(vertex)) return null
        return alpha[vertex[0]] + (this.height - vertex[1])
    },

    coord2vertex: function(coord) {
        var x = alpha.indexOf(coord[0].toUpperCase())
        var y = size - +coord.substr(1)
        return [x, y]
    },

    isValid: function() {
        var liberties = {}

        for (var x = 0; x < this.width; x++) {
            for (var y = 0; y < this.height; y++) {
                var vertex = [x, y]
                if (this.arrangement[vertex] == 0 || vertex in liberties) continue

                var l = this.getLiberties(vertex).length
                if (l == 0) return false

                this.getChain(vertex).forEach(function(v) {
                    liberties[v] = l
                })
            }
        }

        return true
    },

    makeMove: function(sign, vertex) {
        var move = new Board(this.width, this.height, this.arrangement, this.captures)

        if (sign == 0 || !this.hasVertex(vertex)) return move
        if (this.arrangement[vertex] != 0) return null

        sign = sign > 0 ? 1 : -1
        var suicide = true

        // Remove captured stones
        this.getNeighbors(vertex).forEach(function(n) {
            if (move.arrangement[n] != -sign) return

            var ll = this.getLiberties(n)
            if (ll.length != 1) return

            var l = ll[0]
            if (l[0] != vertex[0] || l[1] != vertex[1]) return

            this.getChain(n).forEach(function(c) {
                move.arrangement[c] = 0
                move.captures[sign.toString()]++
            })

            suicide = false;
        }.bind(this))

        move.arrangement[vertex] = sign

        // Detect suicide
        if (suicide) {
            var chain = move.getChain(vertex)

            if (move.getLiberties(vertex).length == 0) {
                chain.forEach(function(c) {
                    move.arrangement[c] = 0
                    move.captures[(-sign).toString()]++
                })
            }
        }

        return move
    },

    getHandicapPlacement: function(count) {
        if (Math.min(this.width, this.height) < 6 || count < 2) return []

        var nearX = this.width >= 13 ? 3 : 2
        var nearY = this.height >= 13 ? 3 : 2
        var farX = this.width - nearX - 1
        var farY = this.height - nearY - 1

        var result = [[nearX, nearY], [farX, farY], [nearX, farY], [farX, nearY]]

        if (this.width % 2 != 0 && this.height % 2 != 0) {
            var middleX = (this.width - 1) / 2
            var middleY = (this.height - 1) / 2

            if (count == 5) result.push([middleX, middleY])
            result.push([nearX, middleY], [farX, middleY])

            if (count == 7) result.push([middleX, middleY])
            result.push([middleX, nearY], [middleX, farY], [middleX, middleY])
        }

        return result.slice(0, count)
    },

    guessDeadStones: function() {
        var self = this
        var map = self.getAreaMap()
        var done = {}
        var result = []

        for (var i = 0; i < this.width; i++) {
            for (var j = 0; j < this.height; j++) {
                var vertex = [i, j]
                if (map[vertex] != 0 || vertex in done) continue

                var posArea = self.getConnectedComponent(vertex, [0, -1])
                var negArea = self.getConnectedComponent(vertex, [0, 1])
                var posDead = posArea.filter(function(v) { return self.arrangement[v] == -1 })
                var negDead = negArea.filter(function(v) { return self.arrangement[v] == 1 })

                var sign = 0
                var actualArea, actualDead

                var negDiff = negArea.filter(function(y) {
                    return !negDead.some(function(x) { return x[0] == y[0] && x[1] == y[1] })
                        && !posArea.some(function(x) { return x[0] == y[0] && x[1] == y[1] })
                })

                var posDiff = posArea.filter(function(y) {
                    return !posDead.some(function(x) { return x[0] == y[0] && x[1] == y[1] })
                        && !negArea.some(function(x) { return x[0] == y[0] && x[1] == y[1] })
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
                    actualArea = self.getChain(vertex)
                    actualDead = []
                }

                actualArea.forEach(function(v) {
                    done[v] = 1
                })

                result.push.apply(result, actualDead)
            }
        }

        return result
    },

    getSvg: function(pixelsize) {
        if (!document) return null

        var ns = 'http://www.w3.org/2000/svg'
        var svg = document.createElementNS(ns, 'svg')
        var tileSize = (pixelsize - 1) / Math.max(this.width, this.height)
        var radius = tileSize / 2
        svg.setAttribute('width', tileSize * this.width + 1)
        svg.setAttribute('height', tileSize * this.height + 1)

        // Draw hoshi

        this.getHandicapPlacement(9).forEach(function(v) {
            var circle = document.createElementNS(ns, 'circle')
            circle.setAttribute('cx', v[0] * tileSize + radius + 1)
            circle.setAttribute('cy', v[1] * tileSize + radius + 1)
            circle.setAttribute('r', 2)
            circle.setAttribute('fill', '#5E2E0C')

            svg.appendChild(circle)
        })

        // Draw shadows

        for (var x = 0; x < this.width; x++) {
            for (var y = 0; y < this.height; y++) {
                if (this.arrangement[[x, y]] == 0) continue

                var circle = document.createElementNS(ns, 'circle')
                circle.setAttribute('cx', x * tileSize + radius + 1)
                circle.setAttribute('cy', y * tileSize + radius + 2)
                circle.setAttribute('r', radius)
                circle.setAttribute('fill', 'rgba(0, 0, 0, .5)')

                svg.appendChild(circle)
            }
        }

        // Draw stones

        for (var x = 0; x < this.width; x++) {
            for (var y = 0; y < this.height; y++) {
                if (this.arrangement[[x, y]] == 0) continue

                var circle = document.createElementNS(ns, 'circle')
                circle.setAttribute('cx', x * tileSize + radius + 1)
                circle.setAttribute('cy', y * tileSize + radius + 1)
                circle.setAttribute('r', radius)

                if (this.arrangement[[x, y]] == -1)
                    circle.setAttribute('fill', 'white')

                svg.appendChild(circle)
            }
        }

        return svg
    },

    getHash: function() {
        return helper.hash(JSON.stringify(this.arrangement))
    }
}

if (typeof module != 'undefined') module.exports = Board
else window.Board = Board

}).call(null, typeof module != 'undefined' ? module : window)
