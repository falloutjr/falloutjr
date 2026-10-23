import { defineConfig } from '@playwright/test';

// Playwright enables FORCE_COLOR in child processes. Preserve a NO_COLOR request
// through its equivalent flag without passing conflicting flags to Node.
if (process.env.NO_COLOR !== undefined) {
  process.env.FORCE_COLOR = '0';
  delete process.env.NO_COLOR;
}

export default defineConfig({
  testDir: './tests',
  testMatch: 'browser.spec.mjs',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90000,
  expect: { timeout: 10000 },
  reporter: [['list']],
  outputDir: 'test-results',
  use: {
    baseURL: 'http://localhost:3100',
    browserName: 'chromium',
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: process.env.BROWSER_EXECUTABLE_PATH
      ? { executablePath: process.env.BROWSER_EXECUTABLE_PATH, args: ['--no-sandbox'] }
      : {},
  },
  webServer: {
    command: 'node tests/browser-server.mjs',
    url: 'http://localhost:3100/api/public/status',
    reuseExistingServer: false,
    timeout: 30000,
    env: {
      NODE_ENV: 'test',
      PORT: '3100',
      HOST: '0.0.0.0',
      APP_ORIGIN: 'http://localhost:3100',
      DATABASE_PATH: 'work/browser-test.sqlite',
      ENABLE_DEV_ADMIN: 'false',
      DEV_MAIL_OUTBOX: 'false',
      MAIL_API_URL: '',
      MAIL_API_TOKEN: '',
      MAIL_FROM: '',
    },
  },
});
