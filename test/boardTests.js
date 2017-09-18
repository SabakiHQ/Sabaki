const assert = require('assert')
const helper = require('../src/modules/helper')
const Board = require('../src/modules/board')

describe('Board', () => {
    describe('constructor', () => {
        it('should create an empty board', () => {
            let board = new Board()

            for (let x = 0; x < board.width; x++) {
                for (let y = 0; y < board.height; y++) {
                    assert.equal(board.get([x, y]), 0)
                }
            }
        })
        it('should have no capture information', () => {
            let board = new Board()
            assert.deepEqual(board.captures, [0, 0])
        })
        it('should have no markups and lines', () => {
            let board = new Board()
            assert.deepEqual(board.lines, [])
            assert.deepEqual(board.markups, {})
        })
    })

    describe('clone', () => {
        it('should clone board arrangement', () => {
            let board = new Board()
            ;[[0, 1], [1, 0], [1, 2], [2, 0], [2, 2]].forEach(x => board.set(x, 1))
            ;[[1, 1], [2, 1]].forEach(x => board.set(x, -1))
            let clone = board.clone()

            assert.deepEqual(board.arrangement, clone.arrangement)

            board.set([5, 5], 1)
            assert.notDeepEqual(board.arrangement, clone.arrangement)
        })
    })

    describe('hasVertex', () => {
        it('should return true when vertex is on board', () => {
            let board = new Board()
            assert(board.hasVertex([0, 0]))
            assert(board.hasVertex([13, 18]))
            assert(board.hasVertex([5, 4]))
        })
        it('should return false when vertex is not on board', () => {
            let board = new Board()
            assert(!board.hasVertex([-1, -1]))
            assert(!board.hasVertex([5, -1]))
            assert(!board.hasVertex([board.width, 0]))
            assert(!board.hasVertex([board.width, board.height]))
        })
    })

    describe('clear', () => {
        it('should clear the stones on the board', () => {
            let board = new Board(9, 9)
            board.set([0, 0], 1).set([1, 1], -1).set([3, 5], 1)
            board.clear()
            assert.deepEqual(board.arrangement, new Board(9, 9).arrangement)
        })
        it('should not clear markups or lines', () => {
            let board = new Board(9, 9)
            let lines = [
                [[0, 0], [8, 8], false],
                [[8, 8], [0, 0], true]
            ]
            board.lines = lines
            board.markups[[5, 5]] = ['label', 'A']

            board.clear()
            assert.deepEqual(board.lines, lines)
            assert.notDeepEqual(board.markups, new Board(9, 9).markups)
        })
    })

    describe('getDistance', () => {
        it('should return the Manhattan distance between two vertices', () => {
            let board = new Board()
            assert.equal(board.getDistance([1, 2], [8, 4]), 9)
            assert.equal(board.getDistance([-1, -2], [8, 4]), 15)
        })
    })

    describe('getCanonicalVertex', () => {
        it('should work', () => {
            let board = new Board()
            assert.deepEqual(board.getCanonicalVertex([3, 4]), [3, 4])
            assert.deepEqual(board.getCanonicalVertex([4, 3]), [3, 4])
            assert.deepEqual(board.getCanonicalVertex([18, 3]), [0, 3])
            assert.deepEqual(board.getCanonicalVertex([15, 5]), [3, 5])
        })
    })

    describe('getNeighbors', () => {
        it('should return neighbors for vertices in the middle', () => {
            let board = new Board()
            assert.deepEqual(board.getNeighbors([1, 1]), [[0, 1], [2, 1], [1, 0], [1, 2]])
        })
        it('should return neighbors for vertices on the side', () => {
            let board = new Board()
            assert.deepEqual(board.getNeighbors([1, 0]), [[0, 0], [2, 0], [1, 1]])
        })
        it('should return neighbors for vertices in the corner', () => {
            let board = new Board()
            assert.deepEqual(board.getNeighbors([0, 0]), [[1, 0], [0, 1]])
        })
        it('should return empty list for vertices not on board', () => {
            let board = new Board()
            assert.deepEqual(board.getNeighbors([-1, -1]), [])
        })
    })

    describe('getConnectedComponent', () => {
        it('should be able to return the chain of a vertex', () => {
            let board = new Board()
            ;[[0, 1], [1, 0], [1, 2], [2, 0], [2, 2]].forEach(x => board.set(x, 1))
            ;[[1, 1], [2, 1]].forEach(x => board.set(x, -1))

            assert.deepEqual(
                board.getConnectedComponent([1, 1], [-1]).sort(helper.lexicalCompare),
                [[1, 1], [2, 1]]
            )
        })
        it('should be able to return the stone connected component of a vertex', () => {
            let board = new Board()
            ;[[0, 1], [1, 0], [1, 2], [2, 0], [2, 2]].forEach(x => board.set(x, 1))
            ;[[1, 1], [2, 1]].forEach(x => board.set(x, -1))

            assert.deepEqual(
                board.getConnectedComponent([1, 1], [-1, 1]).sort(helper.lexicalCompare),
                [[0, 1], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]]
            )
        })
    })

    describe('getLiberties', () => {
        it('should return the liberties of the chain of the given vertex', () => {
            let board = new Board()
            ;[[1, 1], [2, 1]].forEach(x => board.set(x, -1))

            assert.deepEqual(
                board.getLiberties([1, 1]).sort(helper.lexicalCompare),
                [[0, 1], [1, 0], [1, 2], [2, 0], [2, 2], [3, 1]]
            )
            assert.deepEqual(board.getLiberties([1, 2]), [])
        })
        it('should return empty list for a vertex not on the board', () => {
            let board = new Board()
            assert.deepEqual(board.getLiberties([-1, -1]), [])
        })
    })

    describe('isValid', () => {
        it('should return true for valid board arrangements', () => {
            let board = new Board()
            assert(board.isValid())

            board.set([1, 1], 1).set([1, 2], -1)
            assert(board.isValid())
        })
        it('should return false for non-valid board arrangements', () => {
            let board = new Board()
            ;[[1, 0], [0, 1]].forEach(x => board.set(x, 1))
            ;[[0, 0]].forEach(x => board.set(x, -1))
            assert(!board.isValid())

            board = new Board()
            ;[[0, 1], [1, 0], [1, 2], [2, 0], [2, 2], [3, 1]].forEach(x => board.set(x, 1))
            ;[[1, 1], [2, 1]].forEach(x => board.set(x, -1))
            assert(!board.isValid())
        })
    })

    describe('makeMove', () => {
        it('should not mutate board', () => {
            let board = new Board()
            board.makeMove(1, [5, 5])
            assert.deepEqual(board.arrangement, new Board().arrangement)
        })
        it('should make a move', () => {
            let board = new Board()
            let move = board.makeMove(1, [5, 5])
            board.set([5, 5], 1)
            assert.deepEqual(board.arrangement, move.arrangement)
        })
        it('should remove captured stones', () => {
            let board = new Board()
            let black = [[0, 1], [1, 0], [1, 2], [2, 0], [2, 2]]
            let white = [[1, 1], [2, 1]]

            black.forEach(x => board.set(x, 1))
            white.forEach(x => board.set(x, -1))

            let move = board.makeMove(1, [3, 1])

            assert.equal(move.get([3, 1]), 1)
            black.forEach(x => assert.equal(move.get(x), 1))
            white.forEach(x => assert.equal(move.get(x), 0))

            // Edge capture

            board = new Board()

            board.set([0, 1], 1).set([0, 0], -1)

            move = board.makeMove(1, [1, 0])

            assert.equal(move.get([0, 0]), 0)
            assert.equal(move.get([1, 0]), 1)
            assert.equal(move.get([0, 1]), 1)
        })
        it('should count captures correctly', () => {
            let board = new Board()
            let black = [[0, 1], [1, 0], [1, 2], [2, 0], [2, 2]]
            let white = [[1, 1], [2, 1]]

            black.forEach(x => board.set(x, 1))
            white.forEach(x => board.set(x, -1))

            let move = board.makeMove(1, [3, 1])
            assert.equal(move.captures[1], 0)
            assert.equal(move.captures[0], white.length)

            board = new Board()

            board.set([0, 1], 1).set([0, 0], -1)

            move = board.makeMove(1, [1, 0])

            assert.equal(move.captures[1], 0)
            assert.equal(move.captures[0], 1)
        })
        it('should handle suicide correctly', () => {
            let board = new Board()
            ;[[0, 1], [1, 0], [1, 2], [2, 0], [2, 2], [3, 1]].forEach(x => board.set(x, 1))
            ;[[1, 1]].forEach(x => board.set(x, -1))
            let move = board.makeMove(-1, [2, 1])
            assert.equal(move.get([1, 1]), 0)
            assert.equal(move.get([2, 1]), 0)
            assert.equal(move.get([3, 1]), 1)
            assert.equal(move.get([1, 2]), 1)
        })
        it('should handle stone overwrites correctly', () => {
            let board = new Board()
            ;[[10, 9], [10, 10], [10, 11]].forEach(x => board.set(x, 1))
            ;[[10, 8], [9, 9], [11, 9]].forEach(x => board.set(x, -1))
            let move = board.makeMove(-1, [10, 10])
            assert.equal(move.get([10, 10]), -1)
            assert.equal(move.get([10, 9]), 0)
            assert.equal(move.get([10, 11]), 1)
        })
        it('should make a pass', () => {
            let board = new Board()
            assert.deepEqual(board.makeMove(1, [-1, -1]).arrangement, board.arrangement)
            board.set([1, 1], -1)
            assert.deepEqual(board.makeMove(1, [-1, -1]).arrangement, board.arrangement)
        })
    })
})
