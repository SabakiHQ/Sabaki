// Note that these functions are only valid for square boards.

const simple = ['AB', 'AW', 'AE', 'B', 'CR', 'DD', 'MA', 'SL', 'SQ', 'TB', 'TR', 'TW', 'VW', 'W']
const pointWithText = ['LB']
const arrowish = ['AR', 'LN']

const alpha = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
const alphaRev = 'ZYXWVUTSRQPONMLKJIHGFEDCBAzyxwvutsrqponmlkjihgfedcba'

exports.rotatePointClockwise = function(point, height) {

	// returns null on failure ; point is something like "aa"

	if (typeof height !== 'number') return null
	if (height < 1 || height > 52) return null
	if (typeof point !== 'string') return null
	if (point.length !== 2) return null

	let index0 = alpha.indexOf(point[0])
	let index1 = alpha.indexOf(point[1])

	if (index0 === -1 || index1 === -1) return null

	let rev = alphaRev.slice(52 - height)
	return rev[index1] + point[0]
}

exports.rotateTwoPointsClockwise = function(twopoints, height, isRect) {

	// returns null on failure ; twopoints is something like "aa:cc"

	if (typeof height !== 'number') return null
	if (typeof twopoints !== 'string') return null
	if (height < 1 || height > 52) return null
	if (twopoints.length !== 5) return null
	if (twopoints[2] !== ':') return null

	let first = twopoints.slice(0, 2)
	let second = twopoints.slice(3, 5)

	first = exports.rotatePointClockwise(first, height)
	second = exports.rotatePointClockwise(second, height)

	if (first === null || second === null) {
		return null
	}

	// For a rectangle (e.g. anything except line / arrow) we
	// need to make the format topleft : bottomright

	if (isRect) {
		return second[0] + first[1] + ":" + first[0] + second[1]
	}

	return first + ":" + second
}

exports.rotateRectClockwise = function(twopoints, height) {
	return exports.rotateTwoPointsClockwise(twopoints, height, true)
}

exports.rotateArrowClockwise = function(twopoints, height) {
	return exports.rotateTwoPointsClockwise(twopoints, height, false)
}

exports.rotateNodeClockwise = function(node, height) {

	// Given a node and a board height, rotates all relevant properties in the node.
	// Does NOT do anything about the board though.

	if (typeof height !== 'number') {
		return
	}

	// 'simple' cases are either a single point (e.g. "aa") or a rect (e.g. "aa:cc")

	for (let k = 0; k < simple.length; k++) {

		let key = simple[k]

		if (node[key] !== undefined) {

			let values = node[key]

			for (let v = 0; v < values.length; v++) {

				let value = values[v]

				if (value.length === 2) {

					let result = exports.rotatePointClockwise(value, height)
					if (result) {
						values[v] = result
					}

				} else if (value.length === 5 && value[2] === ":") {

					let result = exports.rotateRectClockwise(value, height)
					if (result) {
						values[v] = result
					}
				}
			}
		}
	}

	// 'pointWithText' means something like "aa:hi there"

	for (let k = 0; k < pointWithText.length; k++) {

		let key = pointWithText[k]

		if (node[key] !== undefined) {

			let values = node[key]

			for (let v = 0; v < values.length; v++) {

				let value = values[v]

				if (value[2] === ':') {

					let point = value.slice(0, 2)

					point = exports.rotatePointClockwise(point, height)
					if (point) {
						values[v] = point + value.slice(2)
					}

				}
			}
		}
	}

	// 'arrowish' things are formatted like rects, but with no requirement of topleft:bottomright

	for (let k = 0; k < arrowish.length; k++) {

		let key = arrowish[k]

		if (node[key] !== undefined) {

			let values = node[key]

			for (let v = 0; v < values.length; v++) {

				let value = values[v]

				if (value[2] === ':') {

					let result = exports.rotateArrowClockwise(value, height)
					if (result) {
						values[v] = result
					}

				}
			}
		}
	}
}

