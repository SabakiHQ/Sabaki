var Board = new Class({
    initialize: function(size, arrangement, captures) {
        this.size = arguments.length >= 1 ? size : 19
        this.captures = arguments.length >= 3 ? { '-1': captures['-1'], '1': captures['1'] } : { '-1': 0, '1': 0 }
        this.arrangement = []

        // Initialize arrangement
        for (var x = 0; x < size; x++) {
            this.arrangement[x] = []

            for (var y = 0; y < size; y++) {
                this.arrangement[x][y] = arguments.length >= 2 ? arrangement[x][y] : 0
            }
        }
    },

    hasVertex: function(x, y) {
        return 0 <= Math.min(x, y) && Math.max(x, y) < this.size
    },

    clear: function(x, y) {
        for (var x = 0; x < this.size; x++) {
            for (var y = 0; y < this.size; y++) {
                this.arrangement[x][y] = 0
            }
        }
    },

    getNeighborhood: function(x, y) {
        if (!this.hasVertex(x, y)) return []

        return [
            [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]
        ].filter(function(item) {
            return this.hasVertex(item[0], item[1])
        }.bind(this))
    },

    getChain: function(x, y, result) {
        if (!this.hasVertex(x, y)) return [];

        if (arguments.length == 2) result = [[x, y]]

        // Recursive depth-first search
        this.getNeighborhood(x, y).each(function(v) {
            if (this.arrangement[v[0]][v[1]] != this.arrangement[x][y]) return
            if (result.some(function(item) {
                return item[0] == v[0] && item[1] == v[1]
            })) return

            result.push(v)
            this.getChain(v[0], v[1], result)
        }.bind(this))

        return result
    },

    getLiberties: function(x, y) {
        if (this.arrangement[x][y] == 0) return []

        var chain = this.getChain(x, y)
        var liberties = []

        chain.each(function(c) {
            liberties.append(this.getNeighborhood(c[0], c[1]).filter(function(n) {
                return this.arrangement[n[0]][n[1]] == 0 && !liberties.some(function(v) {
                    return v[0] == n[0] && v[1] == n[1]
                })
            }.bind(this)))
        }.bind(this))

        return liberties
    },

    makeMove: function(sign, x, y) {
        if (x < 0 && y < 0) {
            // Passing
            return new Board(this.size, this.arrangement, this.captures)
        }

        if (sign == 0 || !this.hasVertex(x, y) || this.arrangement[x][y] != 0) return null
        sign = sign > 0 ? 1 : -1

        var move = new Board(this.size, this.arrangement, this.captures)
        var suicide = true

        // Remove captured stones
        this.getNeighborhood(x, y).each(function(n) {
            if (this.arrangement[n[0]][n[1]] != -sign) return;

            var ll = this.getLiberties(n[0], n[1])
            if (ll.length != 1) return;
            if (ll[0][0] != x || ll[0][1] != y) return;

            this.getChain(n[0], n[1]).each(function(c) {
                move.arrangement[c[0]][c[1]] = 0
                move.captures[sign.toString()]++
            })

            suicide = false;
        }.bind(this))
        
        move.arrangement[x][y] = sign

        // Detect suicide
        if (suicide) {
            var chain = move.getChain(x, y)
            suicide = move.getLiberties(x, y).length == 0

            if (suicide) {
                chain.each(function(c) {
                    move.arrangement[c[0]][c[1]] = 0
                })
            }
        }

        return move
    },

    getHandicapPlacement: function(count) {
        if (this.size < 6 || count < 2) return []

        var near = this.size >= 13 ? 3 : 2
        var far = this.size - near

        var result = [ [near, near], [far, far], [near, far], [far, near] ]

        if (this.size % 2 != 0) {
            var middle = (this.size - 1) / 2
            if (count == 5) result.push([middle, middle])
            result.append([ [near, middle], [far, middle] ])
            if (count == 7) result.push([middle, middle])
            result.append([ [middle, near], [middle, far], [middle, middle] ])
        }

        return result.slice(0, count)
    },

    build: function() {
        var ol = new Element('ol')

        for (var x = 0; x < size; x++) {
            for (var y = 0; y < size; y++) {
                var li = new Element('li.pos-' + x + '-' + y, { text: x + ',' + y })
                ol.adopt(li)
            }
        }

        return ol
    }
})