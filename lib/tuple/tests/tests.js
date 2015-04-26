(function () {
	/*global mocha,chai,Tuple*/
	'use strict';

	mocha.setup('tdd');
	var assert = chai.assert;

	suite('Tuple', function () {
		test('the class is defined within the global scope', function () {
			assert.isFunction(Tuple);
		});

		test('can create an instance of the class without arguments', function () {
			var t = new Tuple();
			assert.instanceOf(t, Tuple);
		});

		test('can create an instance of the class with arguments', function () {
			var t = new Tuple('foo', 'bar', 'baz');
			assert.instanceOf(t, Tuple);
		});
	});

	suite('Tuple#unpack()', function () {
		test('can unpack an empty tuple', function () {
			var t = new Tuple();
			var args;
			t.unpack(function () {
				args = arguments;
			});
			assert.deepEqual(args, []);
		});

		test('can unpack one value', function () {
			var value = 'foo';
			var t = new Tuple(value);
			var args;
			t.unpack(function () {
				args = arguments;
			});
			assert.deepEqual(args, [value]);
		});

		test('can unpack multiple values', function () {
			var first = 'foo';
			var second = 'bar';
			var t = new Tuple(first, second);
			var args;
			t.unpack(function () {
				args = arguments;
			});
			assert.deepEqual(args, [first, second]);
		});

		test('returns the returned value from the unpacker', function () {
			var value = 'foo';
			var t = new Tuple();
			var result = t.unpack(function () {
				return value;
			});
			assert.strictEqual(result, value);
		});

		test('called with the scope of the tuple', function () {
			var t = new Tuple();
			var scope;
			t.unpack(function () {
				scope = this;
			});
			assert.strictEqual(scope, t);
		});
	});

	suite('Tuple#toString()', function () {
		test('returns a string of an empty tuple', function () {
			var t = new Tuple();
			assert.strictEqual(t.toString(), '()');
		});

		test('returns a string of single value tuple', function () {
			var t = new Tuple('foo');
			assert.strictEqual(t.toString(), '(foo)');
		});

		test('returns a string of multiple value tuple', function () {
			var t = new Tuple('foo', 'bar', 123);
			assert.strictEqual(t.toString(), '(foo, bar, 123)');
		});
	});

	suite('Tuple#toArray()', function () {
		test('returns an empty array for an empty tuple', function () {
			var t = new Tuple();
			var value = t.toArray();
			assert.deepEqual(value, []);
		});

		test('returns an array that matches a tuples values', function () {
			var first = 'foo';
			var second = 'bar';
			var t = new Tuple(first, second);
			var value = t.toArray();
			assert.deepEqual(value, [first, second]);
		});
	});

	suite('Tuple#forEach()', function () {
		test('will not do anything with an empty tuple', function () {
			var values = [];
			var t = new Tuple();
			t.forEach(function (value) {
				values.push(value);
			});
			assert.lengthOf(values, 0);
			assert.deepEqual(values, []);
		});

		test('will iterate over every value in a tuple', function () {
			var values = [];
			var first = 'foo';
			var second = 'bar';
			var t = new Tuple(first, second);
			t.forEach(function (value) {
				values.push(value);
			});
			assert.lengthOf(values, 2);
			assert.deepEqual(values, [first, second]);
		});

		test('the current index is passed', function () {
			var indexes = [];
			var t = new Tuple('foo', 'bar', 'baz');
			t.forEach(function (value, index) {
				indexes.push(index);
			});
			assert.deepEqual(indexes, [0, 1, 2]);
		});

		test('the current "this" scope is passed', function () {
			var passedScope;
			var t = new Tuple('foo');
			t.forEach(function (value, index, scope) {
				passedScope = scope;
			});
			assert.strictEqual(passedScope, t);
		});
	});

	suite('Tuple#equals()', function () {
		test('comparing two empty tuples passes', function () {
			var t1 = new Tuple();
			var t2 = new Tuple();
			var result = t1.equals(t2);
			assert.isTrue(result);
		});

		test('comparing an empty and populated tuple does not pass', function () {
			var t1 = new Tuple();
			var t2 = new Tuple('foo');
			var result = t1.equals(t2);
			assert.isFalse(result);
		});

		test('comparing two identical populated tuples passes', function () {
			var t1 = new Tuple('foo', 'bar');
			var t2 = new Tuple('foo', 'bar');
			var result = t1.equals(t2);
			assert.isTrue(result);
		});

		test('comparing two different populated tuples does not pass', function () {
			var t1 = new Tuple('foo', 'baz', 'bar');
			var t2 = new Tuple('foo', 'bar');
			var result = t1.equals(t2);
			assert.isFalse(result);
		});

		test('comparing array like objects works as expected', function () {
			var t1 = new Tuple('foo', 'bar');
			assert.isTrue(t1.equals(['foo', 'bar']));
			assert.isFalse(t1.equals(['foo', 'bar', 'baz']));
		});
	});

	suite('Tuple#valueOf()', function () {
		test('returns undefined for empty tuples', function () {
			var t = new Tuple();
			var value = t.valueOf();
			assert.isUndefined(value);
		});

		test('returns the first value of a tuple if it is the only value', function () {
			var t1 = new Tuple(10);
			var t2 = new Tuple('foo');
			var t3 = new Tuple('foo', 'bar');
			var value1 = t1.valueOf();
			var value2 = t2.valueOf();
			var value3 = t3.valueOf();
			assert.strictEqual(value1, 10);
			assert.strictEqual(value2, 'foo');
			assert.notStrictEqual(value3, 'foo');
		});

		test('returns tuple of strings concatinated', function () {
			var t = new Tuple('foo', 'bar');
			var value = t.valueOf();
			assert.strictEqual(value, 'foobar');
		});

		test('returns the sum of a tuple of numbers', function () {
			var t = new Tuple(10, 20, 30);
			var value = t.valueOf();
			assert.strictEqual(value, 60);
		});

		test('can use greater and less than comparisons on numerical tuples', function () {
			var t1 = new Tuple(10, 20);
			var t2 = new Tuple(5, 10, 20);
			var result = t1 > t2;
			assert.isFalse(result);
		});
	});

	suite('Tuple#[n]', function () {
		test('with no values it will return undefined for every index', function () {
			var t = new Tuple();
			assert.isUndefined(t[0]);
			assert.isUndefined(t[1]);
			assert.isUndefined(t[2]);
		});

		test('requesting -1 is undefined', function () {
			var t = new Tuple();
			assert.isUndefined(t[-1]);
		});

		test('with one value it will return that value when the first is requested', function () {
			var value = 'foo';
			var t = new Tuple(value);
			assert.strictEqual(t[0], value);
			assert.isUndefined(t[1]);
			assert.isUndefined(t[2]);
		});

		test('with multiple values it will return the correct values at the specified indexes', function () {
			var first = 'foo';
			var second = 'bar';
			var t = new Tuple(first, second);
			assert.isUndefined(t[-1]);
			assert.strictEqual(t[0], first);
			assert.strictEqual(t[1], second);
			assert.isUndefined(t[2]);
			assert.isUndefined(t[3]);
		});
	});

	suite('Tuple#length', function () {
		test('is equal to 0 when there are no elements', function () {
			var t = new Tuple();
			assert.lengthOf(t, 0);
		});

		test('is equal to 1 when there is one element', function () {
			var t = new Tuple('foo');
			assert.lengthOf(t, 1);
		});

		test('is equal to 3 when there are two elements', function () {
			var t = new Tuple('foo', 'bar', 'baz');
			assert.lengthOf(t, 3);
		});
	});

	mocha.run();
}());
