var assert = require('assert')
var Board = require('../modules/board')

describe('Board', function() {
    describe('constructor', function() {
        it('should create an empty board', function() {
            var board = new Board()
            for (var x = 0; x < board.size; x++) {
                for (var y = 0; y < board.size; y++) {
                    assert.equal(board.arrangement[[x, y]], 0)
                }
            }
        })
        it('should have no capture information', function() {
            var board = new Board()
            assert.deepEqual(board.captures, { '-1': 0, '1': 0 })
        })
        it('should have no markups and lines', function() {
            var board = new Board()
            assert.deepEqual(board.lines, [])
            assert.deepEqual(board.markups, {})
        })
    })
    describe('hasVertex', function() {
        it('should return true when vertex is on board', function() {
            var board = new Board()
            assert(board.hasVertex([0, 0]))
            assert(board.hasVertex([13, 18]))
            assert(board.hasVertex([5, 4]))
        })
        it('should return false when vertex is not on board', function() {
            var board = new Board()
            assert(!board.hasVertex([-1, -1]))
            assert(!board.hasVertex([5, -1]))
            assert(!board.hasVertex([board.size, 0]))
            assert(!board.hasVertex([board.size, board.size]))
        })
    })

    describe('clear', function() {
        it('should clear the stones on the board', function() {
            var board = new Board(9)
            board.arrangement[[0, 0]] = 1
            board.arrangement[[1, 1]] = -1
            board.arrangement[[3, 5]] = 1

            board.clear()
            assert.deepEqual(board.arrangement, new Board(9).arrangement)
        })
        it('should not clear markups or lines', function() {
            var board = new Board(9)
            var lines = [
                [[0, 0], [8, 8], false],
                [[8, 8], [0, 0], true]
            ]
            board.lines = lines
            board.markups[[5, 5]] = ['label', 1, 'A']

            board.clear()
            assert.deepEqual(board.lines, lines)
            assert.notDeepEqual(board.markups, new Board(9).markups)
        })
    })

    describe('getDistance', function() {
        it('should return the Manhattan distance between two vertices', function() {
            var board = new Board()
            assert.equal(board.getDistance([1, 2], [8, 4]), 9)
            assert.equal(board.getDistance([-1, -2], [8, 4]), 15)
        })
    })

    describe('getDistanceToGround', function() {
        it('should return the minimum distance to the board borders')
    })

    describe('getNeighbors', function() {
        it('should return neighbors for vertices in the middle')
        it('should return neighbors for vertices on the side')
        it('should return neighbors for vertices in the corner')
    })

    describe('getConnectedComponent', function() {
        it('should return the color connected component of a vertex')
    })

    describe('getLiberties', function() {
        it('should return the liberties of the chain of the given vertex')
    })

    describe('isValid', function() {
        it('should return true for valid board arrangements')
        it('should return false for non-valid board arrangements')
    })

    describe('makeMove', function() {
        it('should make a move according to the rules')
        it('should make a pass according to the rules')
    })
})
