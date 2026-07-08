const {defineConfig} = require('@playwright/test')

module.exports = defineConfig({
  testDir: './e2e',
  timeout: 60000,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Electron tests must run serially
  reporter: process.env.CI ? 'github' : 'list',
  projects: [
    {name: 'smoke', testMatch: /smoke\.spec\.js/},
    {
      name: 'renderer',
      testMatch: /renderer\.spec\.js/,
      dependencies: ['smoke'],
    },
    {name: 'engine', testMatch: /engine\.spec\.js/, dependencies: ['smoke']},
    {
      name: 'engine-analysis',
      testMatch: /engine-analysis\.spec\.js/,
      dependencies: ['smoke'],
    },
    {
      name: 'move-numbers',
      testMatch: /move-numbers\.spec\.js/,
      dependencies: ['smoke'],
    },
    {
      name: 'analysis-graph',
      testMatch: /analysis-graph\.spec\.js/,
      dependencies: ['smoke'],
    },
    {
      name: 'node-menu',
      testMatch: /node-menu\.spec\.js/,
      dependencies: ['smoke'],
    },
    {
      name: 'settings',
      testMatch: /setting-controls\.spec\.js/,
      dependencies: ['smoke'],
    },
    {
      name: 'settings-cache',
      testMatch: /settings-cache\.spec\.js/,
      dependencies: ['smoke'],
    },
    {
      name: 'scoring-overrides',
      testMatch: /scoring-overrides\.spec\.js/,
      dependencies: ['smoke'],
    },
    {
      name: 'annotation-toggle',
      testMatch: /annotation-toggle\.spec\.js/,
      dependencies: ['smoke'],
    },
    {
      name: 'analysis-value-display',
      testMatch: /analysis-value-display\.spec\.js/,
      dependencies: ['smoke'],
    },
    {
      name: 'edit-compressed-points',
      testMatch: /edit-compressed-points\.spec\.js/,
      dependencies: ['smoke'],
    },
    {
      name: 'comment-coordinate',
      testMatch: /comment-coordinate\.spec\.js/,
      dependencies: ['smoke'],
    },
    {
      name: 'resign',
      testMatch: /resign\.spec\.js/,
      dependencies: ['smoke'],
    },
    {
      name: 'last-move-indicator',
      testMatch: /last-move-indicator\.spec\.js/,
      dependencies: ['smoke'],
    },
    {
      name: 'heatmap-label-font',
      testMatch: /heatmap-label-font\.spec\.js/,
      dependencies: ['smoke'],
    },
  ],
})
