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

### Unit Tests

Make sure you have the master branch checked out since there are no test in the
web branch. To run the unit tests, use:

```
$ npm test
```

### E2E Tests

Sabaki includes Playwright-based end-to-end tests that launch the full Electron
application. The test files live in the `e2e/` directory:

```
e2e/
├── fixtures/
│   └── electron-app.js   # Shared Playwright fixture (launches Sabaki)
├── helpers.js             # Shared helper functions
├── smoke.spec.js          # App launch & basic rendering
├── renderer.spec.js       # UI interactions, SGF loading, navigation
└── engine.spec.js         # GTP engine attach/detach & gameplay
```

**Running E2E tests:**

```
$ npm run test:e2e              # Build webpack bundle + run all suites
$ npm run test:e2e:smoke        # Build + run smoke suite only
$ npm run test:e2e:headed       # Build + run with visible window (Linux only)
$ npx playwright test --project=renderer   # Run one suite (skip rebuild)
```

**Platform notes:**

- **Linux:** Tests run in a virtual framebuffer (`xvfb-run`) by default. Use
  `npm run test:e2e:headed` to bypass xvfb and see the actual Electron window
  for debugging.
- **macOS / Windows:** There is no virtual framebuffer — the Electron window
  will briefly flash on screen during test runs. The `:headed` flag has no
  effect on these platforms.

**Writing new tests:**

- Create a `*.spec.js` file in `e2e/` and add a matching project entry in
  `playwright.config.js`.
- Import the `test` object from `e2e/fixtures/electron-app.js` — this provides
  `electronApp` and `page` fixtures with isolated settings and dialog stubs.
- Use helpers from `e2e/helpers.js` (`loadSgfAndWait`, `getTreeDepth`,
  `attachAndWaitForEngines`, etc.) for common operations.
- Access app state via `window.__sabaki` in `page.evaluate()` calls.
