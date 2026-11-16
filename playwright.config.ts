import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './qa',
  fullyParallel: false,
  reporter: 'list',
  timeout: 90_000,
  use: {
    baseURL: 'http://127.0.0.1:3100',
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm --prefix frontend run dev -- --port 3100',
    url: 'http://127.0.0.1:3100/madrid',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
