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
  ],
})
