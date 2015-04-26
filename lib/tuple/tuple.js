/**
 * Tuple v1.1.1 - https://github.com/Wolfy87/tuple
 * Oliver Caldwell - http://oli.me.uk
 * MIT licence
 */

(function () {
	/*global module*/
	'use strict';

	/**
	 * Simple tuple implementation. This constructor will create new instances
	 * and store immutable values within them.
	 *
	 * @class Tuple A tiny tuple implementation.
	 * @param {...*} List of values to store within the tuple.
	 */
	function Tuple() {
		/**
		 * Contains the number of elements held within the tuple.
		 *
		 * @type {Number} The amount of elements within the tuple.
		 */
		var i = this.length = arguments.length;

		while (i--) {
			this[i] = arguments[i];
		}
	}

	/**
	 * Passes the values as arguments, in the same order they were set, to the
	 * provided unpacker function. It will return the value that the unpacker
	 * returns.
	 *
	 * @param {Function} unpacker Is passed all of the tuples values in order, it's return value will be returned.
	 * @return {*} The value that the unpacker function returns.
	 */
	Tuple.prototype.unpack = function unpack(unpacker) {
		return unpacker.apply(this, this);
	};

	/**
	 * Flattens the tuples values into a string.
	 *
	 * @return {String} A textual representation of the tuples contents.
	 */
	Tuple.prototype.toString = function toString() {
		var values = this.toArray().join(', ');
		return ['(', values, ')'].join('');
	};

	/**
	 * Coerces the tuple into an array. This runs through
	 * `Array.prototype.slice.call` because tuples are array-like objects.
	 *
	 * @return {*[]} All of the tuples values contained within an array.
	 */
	Tuple.prototype.toArray = function toArray() {
		return Array.prototype.slice.call(this);
	};

	/**
	 * Iterates over every value within the tuple and pass the said values to
	 * the provided callback individually.
	 *
	 * The callback is also passed the current index and tuple instance in that
	 * order. This matches the normal `forEach` API found in most libraries and
	 * modern JavaScript.
	 *
	 * @param {Function} callback Is passed every value in the tuple, one at a time.
	 */
	Tuple.prototype.forEach = function forEach(callback) {
		var length = this.length;
		var i;

		for (i = 0; i < length; i += 1) {
			callback(this[i], i, this);
		}
	};

	/**
	 * Compares each value in both tuples, one value at a time in order. Both
	 * tuples have to be of the same length and need to contain the exact same
	 * values for this to return true. This can be used to compare against any
	 * array-like object.
	 *
	 * @param {Object} target A tuple instance or any other array-like object you wish to compare to.
	 * @return {Boolean} True if the tuples length and values match, false if not.
	 */
	Tuple.prototype.equals = function equals(target) {
		var i = this.length;

		if (i !== target.length) {
			return false;
		}

		while (i--) {
			if (this[i] !== target[i]) {
				return false;
			}
		}

		return true;
	};

	/**
	 * Returns the product of adding all contained values together. If you only
	 * have numbers within your tuple you will get back all of those numbers
	 * added together. If you have strings too then you will get a string
	 * containing all of the values.
	 *
	 * This function is called automatically when using greater or less than
	 * comparisons on tuples. So `tuple1 > tuple2` will add all of the
	 * containing values together and then compare them.
	 *
	 * @return {*} The product of all values contained within the tuple.
	 */
	Tuple.prototype.valueOf = function valueOf() {
		var value = this[0];
		var length = this.length;
		var i;

		for (i = 1; i < length; i += 1) {
			value = value + this[i];
		}

		return value;
	};

	// Expose the class via AMD, CommonJS or the global object.
	if (typeof define === 'function' && define.amd) {
		define(function () {
			return Tuple;
		});
	}
	else if (typeof module === 'object' && module.exports) {
		module.exports = Tuple;
	}
	else {
		this.Tuple = Tuple;
	}
}.call(this));
