// Note that these functions are only valid for square boards.

const simple = ['AB', 'AW', 'AE', 'B', 'CR', 'DD', 'MA', 'SL', 'SQ', 'TB', 'TR', 'TW', 'VW', 'W'];
const pointWithText = ['LB'];
const arrowish = ['AR', 'LN'];

const alpha = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const alphaRev = 'ZYXWVUTSRQPONMLKJIHGFEDCBAzyxwvutsrqponmlkjihgfedcba';

exports.rotatePointClockwise = function(point, size) {

	// returns null on failure ; point is something like "aa"

	if (typeof point !== 'string') return null;
	if (typeof size !== 'number') return null;
	if (size < 1 || size > 52) return null;
	if (point.length !== 2) return null;

	let index0 = alpha.indexOf(point[0]);
	let index1 = alpha.indexOf(point[1]);

	if (index0 === -1 || index1 === -1) return null;

	let rev = alphaRev.slice(52 - size);
	return rev[index1] + point[0];
};

exports.rotateRectClockwise = function(rect, size) {

	// returns null on failure ; rect is something like "aa:cc"

	if (typeof size !== 'number') return null;
	if (typeof rect !== 'string') return null;
	if (size < 1 || size > 52) return null;
	if (rect.length !== 5) return null;
	if (rect[2] !== ':') return null;

	let first = rect.slice(0, 2);
	let second = rect.slice(3, 5);

	first = exports.rotatePointClockwise(first, size);
	second = exports.rotatePointClockwise(second, size);

	if (first === null || second === null) {
		return null;
	}

	return second[0] + first[1] + ":" + first[0] + second[1];
};

exports.rotateArrowClockwise = function(arrow, size) {

	// returns null on failure ; arrow is something like "aa:cc"

	if (typeof size !== 'number') return null;
	if (typeof arrow !== 'string') return null;
	if (size < 1 || size > 52) return null;
	if (arrow.length !== 5) return null;
	if (arrow[2] !== ':') return null;

	let first = arrow.slice(0, 2);
	let second = arrow.slice(3, 5);

	first = exports.rotatePointClockwise(first, size);
	second = exports.rotatePointClockwise(second, size);

	if (first === null || second === null) {
		return null;
	}

	return first + ":" + second;
};

exports.rotateNodeClockwise = function(node, size) {

	// Given a node and a board size, rotates all relevant properties in the node.
	// Does NOT do anything about the board though.

	if (typeof size !== 'number') {
		return;
	}

	// 'simple' cases are either a single point (e.g. "aa") or a rect (e.g. "aa:cc")

	for (let k = 0; k < simple.length; k++) {

		let key = simple[k];

		if (node[key] !== undefined) {

			let values = node[key];

			for (let v = 0; v < values.length; v++) {

				let value = values[v];

				if (value.length === 2) {

					let result = exports.rotatePointClockwise(value, size);
					if (result) {
						values[v] = result;
					}

				} else if (value.length === 5 && value[2] === ":") {

					let result = exports.rotateRectClockwise(value, size);
					if (result) {
						values[v] = result;
					}
				}
			}
		}
	}

	// 'pointWithText' means something like "aa:hi there"

	for (let k = 0; k < pointWithText.length; k++) {

		let key = pointWithText[k];

		if (node[key] !== undefined) {

			let values = node[key];

			for (let v = 0; v < values.length; v++) {

				let value = values[v];

				if (value[2] === ':') {

					let point = value.slice(0, 2);

					point = exports.rotatePointClockwise(point, size);
					if (point) {
						values[v] = point + value.slice(2);
					}

				}
			}
		}
	}

	// 'arrowish' things are formatted like rects, but with no requirement of topleft:bottomright

	for (let k = 0; k < arrowish.length; k++) {

		let key = arrowish[k];

		if (node[key] !== undefined) {

			let values = node[key];

			for (let v = 0; v < values.length; v++) {

				let value = values[v];

				if (value[2] === ':') {

					let result = exports.rotateArrowClockwise(value, size);
					if (result) {
						values[v] = result;
					}

				}
			}
		}
	}
};

