# Building & Tests

## Building

Building Sabaki requires
[Node.js 6.2.x or later](https://nodejs.org/en/download/) and npm. First, clone
Sabaki:

```
$ git clone https://github.com/SabakiHQ/Sabaki
$ cd Sabaki
```

Install the dependencies of Sabaki using npm:

```
$ npm install
```

Sabaki uses webpack to bundle all files into one single file. For development
use the following command to create bundles automatically while you edit files:

```
$ npm run watch
```

To start Sabaki while in development, use the start command:

```
$ npm start
```

You can build Sabaki binaries with Electron by using:

```
$ npm run build
```

This will bundle everything and create a folder with the executables in
`Sabaki/dist`. To create installers/archives you can use one of the following
instructions depending on the target OS:

- `$ npm run dist:win32` for Windows 32-bit
- `$ npm run dist:win64` for Windows 64-bit
- `$ npm run dist:win32-portable` for Windows 32-bit portable
- `$ npm run dist:win64-portable` for Windows 64-bit portable
- `$ npm run dist:linux` for Linux 32-bit and 64-bit
- `$ npm run dist:macos` for macOS 64-bit

Before sending in a pull request, please run prettier to make sure your code
adheres to the coding style standards:

```
$ npm run format
```

## Tests

Make sure you have the master branch checked out since there are no test in the
web branch. To run the (currently very limited) unit tests, use:

```
$ npm test
```
