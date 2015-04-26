var Tuple = require('../lib/tuple')

var Board = new Class({
    initialize: function(size, arrangement, captures) {
        this.size = arguments.length >= 1 ? size : 19
        this.captures = arguments.length >= 3 ? { '-1': captures['-1'], '1': captures['1'] } : { '-1': 0, '1': 0 }
        this.arrangement = {}

        // Initialize arrangement
        for (var x = 0; x < this.size; x++) {
            for (var y = 0; y < this.size; y++) {
                this.arrangement[new Tuple(x, y)] = arguments.length >= 2 ? arrangement[new Tuple(x, y)] : 0
            }
        }
    },

    hasVertex: function(v) {
        return v.unpack(function(x, y) {
            return 0 <= Math.min(x, y) && Math.max(x, y) < this.size
        }.bind(this))
    },

    clear: function() {
        for (var x = 0; x < this.size; x++) {
            for (var y = 0; y < this.size; y++) {
                this.arrangement[new Tuple(x, y)] = 0
            }
        }
    },

    getNeighborhood: function(v) {
        if (!this.hasVertex(v)) return []
        x = v[0]; y = v[1]

        return [
            new Tuple(x - 1, y), new Tuple(x + 1, y), new Tuple(x, y - 1), new Tuple(x, y + 1)
        ].filter(function(item) {
            return this.hasVertex(item)
        }.bind(this))
    },

    getChain: function(vertex, result) {
        if (!this.hasVertex(vertex)) return [];

        if (arguments.length < 2) result = [vertex]

        // Recursive depth-first search
        this.getNeighborhood(vertex).each(function(v) {
            if (this.arrangement[v] != this.arrangement[vertex]) return
            if (result.some(function(w) { return w.equals(v) })) return

            result.push(v)
            this.getChain(v, result)
        }.bind(this))

        return result
    },

    getLiberties: function(vertex) {
        if (this.arrangement[vertex] == 0) return []

        var chain = this.getChain(vertex)
        var liberties = []

        chain.each(function(c) {
            liberties.append(this.getNeighborhood(c).filter(function(n) {
                return this.arrangement[n] == 0 && !liberties.some(function(v) { return v.equals(n) })
            }.bind(this)))
        }.bind(this))

        return liberties
    },

    makeMove: function(sign, vertex) {
        var move = new Board(this.size, this.arrangement, this.captures)

        if (!this.hasVertex(vertex)) return move
        if (sign == 0 || this.arrangement[vertex] != 0) return null

        sign = sign > 0 ? 1 : -1
        var suicide = true

        // Remove captured stones
        this.getNeighborhood(vertex).each(function(n) {
            if (this.arrangement[n] != -sign) return;

            var ll = this.getLiberties(n)
            if (ll.length != 1) return;
            if (!ll[0].equals(vertex)) return;

            this.getChain(n).each(function(c) {
                move.arrangement[c] = 0
                move.captures[sign.toString()]++
            })

            suicide = false;
        }.bind(this))
        
        move.arrangement[vertex] = sign

        // Detect suicide
        if (suicide) {
            var chain = move.getChain(vertex)
            suicide = move.getLiberties(vertex).length == 0

            if (suicide) {
                chain.each(function(c) {
                    move.arrangement[c] = 0
                })
            }
        }

        return move
    },

    getHandicapPlacement: function(count) {
        if (this.size < 6 || count < 2) return []

        var near = this.size >= 13 ? 3 : 2
        var far = this.size - near

        var result = [ new Tuple(near, near), new Tuple(far, far), new Tuple(near, far), new Tuple(far, near) ]

        if (this.size % 2 != 0) {
            var middle = (this.size - 1) / 2
            if (count == 5) result.push(new Tuple(middle, middle))
            result.append([ new Tuple(near, middle), new Tuple(far, middle) ])
            if (count == 7) result.push(new Tuple(middle, middle))
            result.append([ new Tuple(middle, near), new Tuple(middle, far), new Tuple(middle, middle) ])
        }

        return result.slice(0, count)
    },

    build: function() {
        var ol = new Element('ol')
        var hoshi = this.getHandicapPlacement(9)

        for (var x = 0; x < this.size; x++) {
            for (var y = 0; y < this.size; y++) {
                var li = new Element('li', {
                    class: 'pos_' + x + '-' + y + ' sign_' + this.arrangement[new Tuple(x, y)],
                    text: x + ',' + y
                })

                if (hoshi.some(function(v) { return v.equals(new Tuple(x, y)) }))
                    li.addClass('hoshi')
                
                ol.adopt(li)
            }
        }

        return ol
    }
})

module.exports = Board