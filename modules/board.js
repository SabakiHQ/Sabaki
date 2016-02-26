(function(root) {

var helper = root.helper

if (typeof require != 'undefined') {
    helper = require('./helper')
}

var Board = function(size, arrangement, captures) {
    this.size = !isNaN(size) ? size : 19
    this.captures = captures ? { '-1': captures['-1'], '1': captures['1'] } : { '-1': 0, '1': 0 }
    this.arrangement = {}
    this.overlays = {}

    // Initialize arrangement
    for (var x = 0; x < this.size; x++) {
        for (var y = 0; y < this.size; y++) {
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
        return 0 <= Math.min(x, y) && Math.max(x, y) < this.size
    },

    clear: function() {
        for (var x = 0; x < this.size; x++) {
            for (var y = 0; y < this.size; y++) {
                this.arrangement[[x, y]] = 0
            }
        }
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
            Math.min(vertex[0], this.size - vertex[0] - 1),
            Math.min(vertex[1], this.size - vertex[1] - 1)
        ]

        v.sort(function(x, y) { return x - y })

        return v
    },

    getSymmetries: function(vertex) {
        var self = this
        if (!self.hasVertex(vertex)) return []

        var reversed = [vertex[1], vertex[0]]
        var sym = function(v) {
            return [
                [self.size - v[0] - 1, v[1]],
                [v[0], self.size - v[1] - 1],
                [self.size - v[0] - 1, self.size - v[1] - 1]
            ]
        }

        return [vertex, reversed].concat(sym(vertex)).concat(sym(reversed))
    },

    getNeighbors: function(vertex) {
        var self = this
        if (!self.hasVertex(vertex)) return []
        var x = vertex[0], y = vertex[1]

        return [
            [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]
        ].filter(self.hasVertex.bind(self))
    },

    getNeighborhood: function(vertex) {
        var self = this
        var result = []

        if (!self.hasVertex(vertex)) return result

        for (var x = vertex[0] - 3; x <= vertex[0] + 3; x++) {
            for (var y = vertex[1] - 3; y <= vertex[1] + 3; y++) {
                if (!self.hasVertex([x, y])) continue
                var distance = Math.pow(vertex[0] - x, 2) + Math.pow(vertex[1] - y, 2)
                if (distance <= 10) result.push([x, y])
            }
        }

        return result
    },

    getSurroundings: function(vertex) {
        if (!this.hasVertex(vertex)) return []

        var self = this
        var result = self.getNeighborhood(vertex)
        var stones = [vertex]

        while (true) {
            var newstones = result.filter(function(v) {
                return self.arrangement[v] != 0
                    && !stones.some(function(w) { return w[0] == v[0] && w[1] == v[1] })
            })

            if (newstones.length == 0) return result

            newstones.forEach(function(v) {
                if (stones.some(function(w) { return w[0] == v[0] && w[1] == v[1] })) return

                self.getNeighborhood(v).forEach(function(n) {
                    if (result.some(function(w) { return w[0] == n[0] && w[1] == n[1] })) return
                    result.push(n)
                })

                stones.push(v)
            })
        }
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

        for (var i = 0; i < self.size; i++) {
            for (var j = 0; j < self.size; j++) {
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

    isValid: function() {
        var liberties = {}

        for (var x = 0; x < this.size; x++) {
            for (var y = 0; y < this.size; y++) {
                var vertex = [x, y]
                if (vertex in liberties || this.arrangement[vertex] == 0) continue

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
        var move = new Board(this.size, this.arrangement, this.captures)

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
        if (this.size < 6 || count < 2) return []

        var near = this.size >= 13 ? 3 : 2
        var far = this.size - near - 1

        var result = [[near, near], [far, far], [near, far], [far, near]]

        if (this.size % 2 != 0) {
            var middle = (this.size - 1) / 2
            if (count == 5) result.push([middle, middle])
            result.push([near, middle], [far, middle])
            if (count == 7) result.push([middle, middle])
            result.push([middle, near], [middle, far], [middle, middle])
        }

        return result.slice(0, count)
    },

    guessDeadStones: function() {
        var self = this
        var map = self.getAreaMap()
        var done = {}
        var result = []

        for (var i = 0; i < this.size; i++) {
            for (var j = 0; j < this.size; j++) {
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

    getHash: function() {
        return helper.hash(JSON.stringify(this.arrangement))
    }
}

Board.sideMatch = function(area, source, target) {
    var hypotheses = Array.apply(null, new Array(8)).map(function() { return true })
    var hypothesesInvert = Array.apply(null, new Array(8)).map(function() { return true })

    area.forEach(function(vertex) {
        var sign = source.arrangement[vertex]
        var representatives = target.getSymmetries(vertex)

        for (var i = 0; i < 8; i++) {
            if (target.arrangement[representatives[i]] != sign)
                hypotheses[i] = false
            if (target.arrangement[representatives[i]] != -sign)
                hypothesesInvert[i] = false
        }
    })

    var i = hypotheses.concat(hypothesesInvert).indexOf(true)
    return i < 8 ? [i, false] : [i - 8, true]
}

if (typeof module != 'undefined') module.exports = Board
else window.Board = Board

}).call(null, typeof module != 'undefined' ? module : window)
