var assert = require('assert')
var Board = require('../modules/board')

describe('Board', function() {
    describe('hasVertex', function() {
        it('should return true when vertex is on board')
        it('should return false when vertex is not on board')
    })

    describe('clear', function() {
        it('should clear the stones on the board')
        it('should not clear markups or lines')
    })

    describe('getDistance', function() {
        it('should return the Manhattan distance between two vertices')
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
