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

    describe('clone', function() {
        it('should clone board arrangement', function() {
            var board = new Board()
            ;[[0, 1], [1, 0], [1, 2], [2, 0], [2, 2]].forEach(x => board.arrangement[x] = 1)
            ;[[1, 1], [2, 1]].forEach(x => board.arrangement[x] = -1)
            var clone = board.clone()

            assert.deepEqual(board.arrangement, clone.arrangement)

            board.arrangement[[5, 5]] = 1
            assert.notDeepEqual(board.arrangement, clone.arrangement)
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
        it('should return the minimum distance to the board borders', function() {
            var board = new Board()
            assert.equal(board.getDistanceToGround([3, 4]), 3)
            assert.equal(board.getDistanceToGround([4, 3]), 3)
            assert.equal(board.getDistanceToGround([18, 3]), 0)
            assert.equal(board.getDistanceToGround([15, 5]), 3)
        })
    })

    describe('getNeighbors', function() {
        it('should return neighbors for vertices in the middle', function() {
            var board = new Board()
            assert.deepEqual(board.getNeighbors([1, 1]), [[0, 1], [2, 1], [1, 0], [1, 2]])
        })
        it('should return neighbors for vertices on the side', function() {
            var board = new Board()
            assert.deepEqual(board.getNeighbors([1, 0]), [[0, 0], [2, 0], [1, 1]])
        })
        it('should return neighbors for vertices in the corner', function() {
            var board = new Board()
            assert.deepEqual(board.getNeighbors([0, 0]), [[1, 0], [0, 1]])
        })
        it('should return empty list for vertices not on board', function() {
            var board = new Board()
            assert.deepEqual(board.getNeighbors([-1, -1]), [])
        })
    })

    describe('getConnectedComponent', function() {
        it('should be able to return the chain of a vertex', function() {
            var board = new Board()
            ;[[0, 1], [1, 0], [1, 2], [2, 0], [2, 2]].forEach(x => board.arrangement[x] = 1)
            ;[[1, 1], [2, 1]].forEach(x => board.arrangement[x] = -1)

            assert.deepEqual(board.getConnectedComponent([1, 1], [-1]), [[1, 1], [2, 1]])
        })
        it('should be able to return the stone connected component of a vertex', function() {
            var board = new Board()
            ;[[0, 1], [1, 0], [1, 2], [2, 0], [2, 2]].forEach(x => board.arrangement[x] = 1)
            ;[[1, 1], [2, 1]].forEach(x => board.arrangement[x] = -1)

            assert.deepEqual(
                board.getConnectedComponent([1, 1], [-1, 1]), 
                [[1, 1], [0, 1], [2, 1], [2, 0], [1, 0], [2, 2], [1, 2]]
            )
        })
    })

    describe('getLiberties', function() {
        it('should return the liberties of the chain of the given vertex', function() {
            var board = new Board()
            ;[[1, 1], [2, 1]].forEach(x => board.arrangement[x] = -1)
            assert.deepEqual(board.getLiberties([1, 1]), [[0, 1], [1, 0], [1, 2], [3, 1], [2, 0], [2, 2]])
            assert.deepEqual(board.getLiberties([1, 2]), [])
        })
        it('should return empty list for a vertex not on the board', function() {
            var board = new Board()
            assert.deepEqual(board.getLiberties([-1, -1]), [])
        })
    })

    describe('isValid', function() {
        it('should return true for valid board arrangements', function() {
            var board = new Board()
            assert(board.isValid())

            board.arrangement[[1, 1]] = 1
            board.arrangement[[1, 2]] = -1
            assert(board.isValid())
        })
        it('should return false for non-valid board arrangements', function() {
            var board = new Board()
            ;[[1, 0], [0, 1]].forEach(x => board.arrangement[x] = 1)
            ;[[0, 0]].forEach(x => board.arrangement[x] = -1)
            assert(!board.isValid())

            board = new Board()
            ;[[0, 1], [1, 0], [1, 2], [2, 0], [2, 2], [3, 1]].forEach(x => board.arrangement[x] = 1)
            ;[[1, 1], [2, 1]].forEach(x => board.arrangement[x] = -1)
            assert(!board.isValid())
        })
    })

    describe('makeMove', function() {
        it('should not mutate board', function() {
            var board = new Board()
            board.makeMove(1, [5, 5])
            assert.deepEqual(board.arrangement, new Board().arrangement)
        })
        it('should make a move', function() {
            var board = new Board()
            var move = board.makeMove(1, [5, 5])
            board.arrangement[[5, 5]] = 1
            assert.deepEqual(board.arrangement, move.arrangement)
        })
        it('should remove captured stones', function() {
            var board = new Board()
            ;[[0, 1], [1, 0], [1, 2], [2, 0], [2, 2]].forEach(x => board.arrangement[x] = 1)
            ;[[1, 1], [2, 1]].forEach(x => board.arrangement[x] = -1)
            var move = board.makeMove(1, [3, 1])
            assert.equal(move.arrangement[[1, 1]], 0)
            assert.equal(move.arrangement[[2, 1]], 0)
            assert.equal(move.arrangement[[3, 1]], 1)
            assert.equal(move.arrangement[[1, 2]], 1)

            board = new Board()
            ;[[0, 1]].forEach(x => board.arrangement[x] = 1)
            ;[[0, 0]].forEach(x => board.arrangement[x] = -1)
            move = board.makeMove(1, [1, 0])
            assert.equal(move.arrangement[[0, 0]], 0)
            assert.equal(move.arrangement[[1, 0]], 1)
        })
        it('should handle suicide correctly', function() {
            var board = new Board()
            ;[[0, 1], [1, 0], [1, 2], [2, 0], [2, 2], [3, 1]].forEach(x => board.arrangement[x] = 1)
            ;[[1, 1]].forEach(x => board.arrangement[x] = -1)
            var move = board.makeMove(-1, [2, 1])
            assert.equal(move.arrangement[[1, 1]], 0)
            assert.equal(move.arrangement[[2, 1]], 0)
            assert.equal(move.arrangement[[3, 1]], 1)
            assert.equal(move.arrangement[[1, 2]], 1)
        })
        it('should make a pass', function() {
            var board = new Board()
            assert.deepEqual(board.makeMove(1, [-1, -1]).arrangement, board.arrangement)
            board.arrangement[[1, 1]] = -1
            assert.deepEqual(board.makeMove(1, [-1, -1]).arrangement, board.arrangement)
        })
    })
})
