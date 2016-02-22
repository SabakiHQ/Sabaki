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
        return Math.min(vertex[0] + 1, self.size - vertex[0], vertex[1] + 1, self.size - vertex[1])
    },

    getNeighborhood: function(vertex) {
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
        this.getNeighborhood(vertex).forEach(function(v) {
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
        if (this.arrangement[vertex] == 0) return []

        var self = this
        var chain = self.getChain(vertex)
        var liberties = []

        chain.forEach(function(c) {
            liberties.push.apply(liberties, self.getNeighborhood(c).filter(function(n) {
                return self.arrangement[n] == 0
                && !liberties.some(function(v) { return v[0] == n[0] && v[1] == n[1] })
            }))
        })

        return liberties
    },

    getRelatedChains: function(vertex) {
        if (this.arrangement[vertex] == 0) return []

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

                    self.getNeighborhood(c).forEach(function(n) {
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
        this.getNeighborhood(vertex).forEach(function(n) {
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

    interpretVertex: function(vertex) {
        var self = this
        var sign = self.arrangement[vertex]
        if (sign == 0) return null

        var neighbors = self.getNeighborhood(vertex)

        // Check atari

        if (neighbors.some(function(v) {
            return self.arrangement[v] == -sign && self.getLiberties(v).length == 1
        })) return 'Atari'

        // Check connection

        var friendly = neighbors.filter(function(v) { return self.arrangement[v] == sign})
        if (friendly.length == neighbors.length) return 'Fill'
        if (friendly.length >= 2) return 'Connect'
        if (friendly.length == 1) return 'Stretch'

        // Get nearest non-blocked friendly stone

        var euclidean = function(v, w) { return Math.pow(v[0] - w[0], 2) + Math.pow(v[1] - w[1], 2) }
        var compare = function(v, w) {
            if (self.getDistance(v, vertex) == self.getDistance(w, vertex))
                return euclidean(v, vertex) - euclidean(w, vertex)
            return self.getDistance(v, vertex) - self.getDistance(w, vertex)
        }

        var minvertex = null
        var result = null

        for (var x = 0; x < self.size; x++) {
            for (var y = 0; y < self.size; y++) {
                if (self.arrangement[[x, y]] != sign) continue
                if (minvertex && compare(minvertex, [x, y]) < 0) continue

                var distance = self.getDistance([x, y], vertex)
                var diff = [Math.abs(vertex[0] - x), Math.abs(vertex[1] - y)]

                if (distance == 0 || distance > 4 || distance == 4 && Math.min.apply(null, diff) == 0) continue

                var blocking = []
                for (var i = Math.min(vertex[0], x); i <= Math.max(vertex[0], x); i++)
                    for (var j = Math.min(vertex[1], y); j <= Math.max(vertex[1], y); j++)
                        blocking.push([i, j])

                var enemies = function(x) {
                    return x.map(function(v) { return self.arrangement[v] })
                        .filter(function(s) { return s == -sign }).length
                }

                if (diff[0] == 1 && diff[1] == 1) {
                    // + + o +
                    // + o + +

                    if (enemies(blocking) >= 2) result = 'Cut'
                    else if (enemies(blocking) == 1) result = 'Hane'
                    else if (enemies(blocking) == 0) result = 'Diagonal'
                } else if (Math.min.apply(null, diff) == 0 && distance == 2) {
                    // + o + o +

                    if (enemies(blocking) > 0) continue
                    else result = 'One-point jump'
                } else if (Math.min.apply(null, diff) == 0 && distance == 3) {
                    // + o + + o +

                    if (enemies(blocking) > 0) continue
                    else result = 'Two-point jump'
                } else if (diff[0] == 2 && diff[1] == 2) {
                    // + + + o +
                    // + + + + +
                    // + o + + +

                    var m = [(x + vertex[0]) / 2, (y + vertex[1]) / 2]
                    if (self.arrangement[m] == -sign) continue

                    blocking = blocking.filter(function(v) {
                        return (v[0] != x || v[1] != vertex[1])
                            && (v[0] != vertex[0] || v[1] != y)
                    })

                    if (enemies(blocking) >= 2) continue
                    else result = 'Diagonal jump'
                } else if (Math.max.apply(null, diff) >= 2 && Math.min.apply(null, diff) == 1) {
                    // + + + o +    or   + + + + o +
                    // + o + + +         + o + + + +

                    blocking = blocking.filter(function(v) {
                        return (v[0] != x || v[1] != vertex[1])
                            && (v[0] != vertex[0] || v[1] != y)
                    })

                    if (enemies(blocking) > 0) continue
                    else result = distance == 3 ? 'Small knight' : 'Large knight'
                }

                minvertex = [x, y]
            }
        }

        if (minvertex) return result

        // Get nearest enemy stone

        minvertex = null
        result = null

        for (var x = 0; x < self.size; x++) {
            for (var y = 0; y < self.size; y++) {
                if (self.arrangement[[x, y]] != -sign) continue
                if (minvertex && compare(minvertex, [x, y]) < 0) continue

                var distance = self.getDistance([x, y], vertex)
                var diff = [Math.abs(vertex[0] - x), Math.abs(vertex[1] - y)]

                if (distance > 3 || distance == 3 && Math.min.apply(null, diff) == 0) continue

                if (distance == 1) {
                    result = 'Attach'
                } else if (diff[0] == 1 && diff[1] == 1) {
                    result = 'Shoulder hit'
                } else if (self.getDistanceToGround(vertex) <= 5) {
                    result = 'Approach'
                } else {
                    continue
                }

                minvertex = [x, y]
            }
        }

        if (minvertex) return result

        // Determine position to edges

        if (vertex[0] == (self.size - 1) / 2 && vertex[1] == vertex[0])
            return 'Tengen'

        var diff = [
            Math.min(vertex[0] + 1, self.size - vertex[0]),
            Math.min(vertex[1] + 1, self.size - vertex[1])
        ]
        diff.sort(function(x, y) { return x - y })

        if ((diff[0] != 4 || diff[1] != 4) && self.getHandicapPlacement(9).some(function(v) {
            return v[0] == vertex[0] && v[1] == vertex[1]
        })) return 'Hoshi'

        if (diff[1] <= 6) return diff.join('-') + ' point'

        return null
    },

    getHash: function() {
        return helper.hash(JSON.stringify(this.arrangement))
    }
}

if (typeof module != 'undefined') module.exports = Board
else window.Board = Board

}).call(null, typeof module != 'undefined' ? module : window)
