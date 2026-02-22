// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 60000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    navigationTimeout: 15000,
    actionTimeout: 10000,
  },
  projects: [
    {
      name: 'Desktop Chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: 'Tablet',
      use: {
        ...devices['iPad Mini'],
        viewport: { width: 768, height: 1024 },
      },
    },
  ],
});
