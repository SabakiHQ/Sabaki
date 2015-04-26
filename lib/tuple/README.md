# Tuple

A tiny JavaScript tuple implementation. This came to fruition after [a blog post I wrote][tuple-post] got a bit of attention. I felt like refining the idea and turning it into a proper project with package management, tests and documentation.

This version is quite different to my original implementation (which received quite a bit of critique on Hacker News). I have dropped a few things that meant it was not a real tuple, so now it's closer to the mark. I have tried to follow a KISS (Keep It Simple Stupid) mentality whilst solidifying my ideas within this repository. As a result the API and source are absolutely tiny.

It can be installed through [bower][] with `bower install tuple` and [npm][] with `npm install tuple-w`. I had to add a "w" (for Wolfy87) because the name "tuple" was taken.

## Examples

Creating a `Tuple` instance containing some values.

```javascript
// No values.
var empty = new Tuple();

// A single value.
var one = new Tuple('hello');

// Loads of values!
var loads = new Tuple('foo', 'bar', 'baz');
```

Extracting those values.

```javascript
var point = new Tuple(50, 75);

// You can unpack them into any names you want.
// They're just function arguments!
point.unpack(function (x, y) {
	doStuff(x * y);
});
```

Getting a value *from* `unpack`.

```javascript
var guy = new Tuple('Oliver', 'Caldwell');

// Unpack returns the value that was returned by the function you passed to it.
var name = guy.unpack(function (firstName, lastName) {
	return [
		firstName,
		lastName
	].join(' ');
});

name; // "Oliver Caldwell"
```

You can make this unpacking cleaner by passing predefined functions.

```javascript
function add(a, b) {
	return a + b;
}

var numbers = new Tuple(10, 20);
var result = numbers.unpack(add);

result; // 30
```

Getting a string representation of a tuple.

```javascript
var t = new Tuple('foo', 'bar');

// Manual call to toString.
t.toString(); // "(foo, bar)"

// Automatic coercion too!
'Hello! ' + t; // "Hello! (foo, bar)"
```

Tuples are array-like objects, that means you can treat them like arrays and it will work just fine. You can access each value with the numerical attribute and measure it with the `length` property.

```javascript
var t = new Tuple('foo', 'bar');
var i;

for (i = 0; i < t.length; t += 1) {
	console.log(t[i]);
}

// log: 'foo'
// log: 'bar'

console.log(t.toArray().join('-')); // 'foo-bar'
```

Because it's array-like, you can even do crazy stuff like this.

```javascript
var t = new Tuple('Hello, World!');
console.log.apply(null, t);

// log: 'Hello, World!'
```

The browser has automatically converted the tuple to an array and applied it to the `log` method!

You can also iterate over the tuple using the `forEach` method if you don't want to touch the array-like properties.

```javascript
var t = new Tuple(10, 20, 30);

t.forEach(function (value, index, scope) {
	console.log(value);
});

// log: 10
// log: 20
// log: 30
```

You need not iterate over the tuple to compare values though, you can use the `equals` method for that.

```javascript
var t1 = new Tuple('foo', 'bar');
var t2 = new Tuple('foo', 'bar');
var t3 = new Tuple('foo', 'bar', 'baz');

t1.equals(t2); // true
t2.equals(t1); // true
t1.equals(t3); // false
t3.equals(t2); // false

// Or compare to any other array-like object!
t1.equals(['foo', 'bar']); // true
t1.equals([1, 2]); // false
```

You can perform greater or less than comparisons on tuples thanks to their `valueOf` method. This method returns the product of all values contained within the tuple added together.

```javascript
var t1 = new Tuple('foo', 'bar');
var t2 = new Tuple(10, 20, 30);
var t3 = new Tuple(5, 10, 20, 30);

t1.valueOf(); // 'foobar'
t2.valueOf(); // 60
t3.valueOf(); // 65

t2 > t3; // false
t3 > t2; // true

// > and < call valueOf automatically in JavaScript.
```

## API

### Tuple

Simple tuple implementation. This constructor will create new instances and store immutable values within them.

 * *Class* Tuple A tiny tuple implementation.
 * *Param* {...\*} List of values to store within the tuple.

### Tuple#unpack()

Passes the values as arguments, in the same order they were set, to the provided unpacker function. It will return the value that the unpacker returns.

 * *Param* {Function} **unpacker** Is passed all of the tuples values in order, it's return value will be returned.
 * *Return* {\*} The value that the unpacker function returns.

### Tuple#toString()

Flattens the tuples values into a string.

 * *Return* {String} A textual representation of the tuples contents.

### Tuple#toArray()

Coerces the tuple into an array. This runs through `Array.prototype.slice.call` because tuples are array-like objects.

 * *Return* {\*[]} All of the tuples values contained within an array.

### Tuple#forEach()

Iterates over every value within the tuple and pass the said values to the provided callback individually.

The callback is also passed the current index and tuple instance in that order. This matches the normal `forEach` API found in most libraries and modern JavaScript.

 * *Param* {Function} callback Is passed every value in the tuple, one at a time.

### Tuple#equals()

Compares each value in both tuples, one value at a time in order. Both tuples have to be of the same length and need to contain the exact same values for this to return true. This can be used to compare against any array-like object.

 * *Param* {Object} target A tuple instance or any other array-like object you wish to compare to.
 * *Return* {Boolean} True if the tuples length and values match, false if not.

### Tuple#valueOf()

Returns the product of adding all contained values together. If you only have numbers within your tuple you will get back all of those numbers added together. If you have strings too then you will get a string containing all of the values.

This function is called automatically when using greater or less than comparisons on tuples. So `tuple1 > tuple2` will add all of the containing values together and then compare them.

 * *Return* {\*} The product of all values contained within the tuple.

### Tuple#[n]

Fetches the value from the tuple at a specific index in the exact same was as an array. A tuple is an array-like object, so you can use the length and `[n]` accessors.

### Tuple#length

Contains the number of elements held within the tuple.

 * *Type* {Number} The amount of elements within the tuple.

## Tests

You can execute the tests by running the local Python HTTP server (`./tools/server.sh`) and navigating to [http://localhost:8000/tests/][tests].

## License (MIT)

Copyright (c) 2013 Oliver Caldwell

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

[tuple-post]: http://oli.me.uk/2013/07/12/tuples-in-javascript/
[bower]: http://bower.io/
[npm]: https://npmjs.org/
[tests]: http://localhost:8000/tests/