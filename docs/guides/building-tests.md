# Building & Tests

## Building

Building Sabaki requires [Node.js 6.2.x or later](https://nodejs.org/en/download/) and npm. First, clone Sabaki:

~~~
$ git clone https://github.com/yishn/Sabaki
$ cd Sabaki
~~~

### Desktop version

Install the dependencies of Sabaki using npm:

~~~
$ npm install
~~~

You can build Sabaki by using:

~~~
$ npm run pack
~~~

To create installers/archives you can use one of the following instructions depending on the target OS:

* `$ npm run dist:win32` for Windows 32-bit
* `$ npm run dist:win64` for Windows 64-bit
* `$ npm run dist:linux` for Linux 32-bit and 64-bit
* `$ npm run dist:macos` for macOS 64-bit

The binaries will be created in `Sabaki/dist/`.

### Web version

Checkout the `web` branch and install the dependencies for the web version:

```
$ git checkout web
$ npm install
```

To build Sabaki, use one of the following build instructions:

* `$ npm run watch` creates a human-readable build and watches code for changes
* `$ npm run build` creates a minified version

This creates a `bundle.js` file. To run Sabaki, simply open `Sabaki/index.html` in a modern web browser, preferably Chrome.

## Tests

Make sure you have the master branch checked out since there are no test in the web branch. To run the (currently very limited) unit tests, use:

~~~
$ npm test
~~~
