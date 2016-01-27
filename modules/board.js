var Tuple = require('tuple-w')
var helper = require('./helper')

var Board = function(size, arrangement, captures) {
    this.size = !isNaN(size) ? size : 19
    this.captures = captures ? { '-1': captures['-1'], '1': captures['1'] } : { '-1': 0, '1': 0 }
    this.arrangement = {}
    this.overlays = {}

    // Initialize arrangement
    for (var x = 0; x < this.size; x++) {
        for (var y = 0; y < this.size; y++) {
            this.arrangement[new Tuple(x, y)] = arrangement ? arrangement[new Tuple(x, y)] : 0
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
                this.arrangement[new Tuple(x, y)] = 0
            }
        }
    },

    getNeighborhood: function(vertex) {
        var self = this
        if (!self.hasVertex(vertex)) return []
        var x = vertex[0], y = vertex[1]

        return [
            new Tuple(x - 1, y), new Tuple(x + 1, y), new Tuple(x, y - 1), new Tuple(x, y + 1)
        ].filter(function(item) {
            return self.hasVertex(item)
        })
    },

    getConnectedComponent: function(vertex, colors, result) {
        if (!this.hasVertex(vertex)) return []
        if (!result) result = [vertex]

        // Recursive depth-first search
        this.getNeighborhood(vertex).forEach(function(v) {
            if (colors.indexOf(this.arrangement[v]) == -1) return
            if (result.some(function(w) { return w.equals(v) })) return

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

        var chain = this.getChain(vertex)
        var liberties = []

        chain.forEach(function(c) {
            liberties.append(this.getNeighborhood(c).filter(function(n) {
                return this.arrangement[n] == 0 && !liberties.some(function(v) { return v.equals(n) })
            }.bind(this)))
        }.bind(this))

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
        var map = {}

        for (var i = 0; i < this.size; i++) {
            for (var j = 0; j < this.size; j++) {
                var vertex = new Tuple(i, j)
                if (vertex in map) continue
                if (this.arrangement[vertex] != 0) {
                    map[vertex] = this.arrangement[vertex]
                    continue
                }

                var chain = this.getChain(vertex)
                var sign = 0
                var indicator = 1

                chain.forEach(function(c) {
                    if (indicator == 0) return

                    this.getNeighborhood(c).forEach(function(n) {
                        if (this.arrangement[n] == 0 || indicator == 0) return

                        if (sign == 0) sign = map[n] = this.arrangement[n]
                        else if (sign != this.arrangement[n]) indicator = 0
                    }.bind(this))
                }.bind(this))

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
                var vertex = new Tuple(x, y)
                if (vertex in liberties) continue

                var l = this.getLiberties(vertex)
                if (l == 0 && this.arrangement[vertex] != 0) return false

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
            if (move.arrangement[n] != -sign) return;

            var ll = this.getLiberties(n)
            if (ll.length != 1) return;
            if (!ll[0].equals(vertex)) return;

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

        var result = [new Tuple(near, near), new Tuple(far, far), new Tuple(near, far), new Tuple(far, near)]

        if (this.size % 2 != 0) {
            var middle = (this.size - 1) / 2
            if (count == 5) result.push(new Tuple(middle, middle))
            result.append([new Tuple(near, middle), new Tuple(far, middle)])
            if (count == 7) result.push(new Tuple(middle, middle))
            result.append([new Tuple(middle, near), new Tuple(middle, far), new Tuple(middle, middle)])
        }

        return result.slice(0, count)
    },

    guessDeadStones: function() {
        var board = this
        var map = board.getAreaMap()
        var done = {}
        var result = []

        for (var i = 0; i < this.size; i++) {
            for (var j = 0; j < this.size; j++) {
                var vertex = new Tuple(i, j)
                if (map[vertex] != 0 || vertex in done) continue

                var posArea = board.getConnectedComponent(vertex, [0, -1])
                var negArea = board.getConnectedComponent(vertex, [0, 1])
                var posDead = posArea.filter(function(v) { return board.arrangement[v] == -1 })
                var negDead = negArea.filter(function(v) { return board.arrangement[v] == 1 })

                var sign = 0
                var actualArea = []
                var actualDead = []

                var negDiff = negArea.filter(function(y) {
                    return !negDead.some(function(x) { return x.equals(y) })
                        && !posArea.some(function(x) { return x.equals(y) })
                })

                var posDiff = posArea.filter(function(y) {
                    return !posDead.some(function(x) { return x.equals(y) })
                        && !negArea.some(function(x) { return x.equals(y) })
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
                    actualArea = board.getChain(vertex)
                    actualDead = []
                }

                actualArea.forEach(function(v) {
                    done[v] = 1
                })

                result.combine(actualDead)
            }
        }

        return result
    },

    getHash: function() {
        return helper.md5(JSON.stringify(this.arrangement))
    }
}

module.exports = Board
