import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PW_PORT) || 4173;
const BASE_URL = `http://localhost:${PORT}`;
const isCI = !!process.env.CI;

// Optional: point the chromium-based projects at a specific Chromium binary
// (e.g. PW_CHROMIUM_PATH=/opt/pw-browsers/chromium) when Playwright's own
// browser download is unavailable. Never applied to Firefox/WebKit.
const chromiumLaunch = process.env.PW_CHROMIUM_PATH
  ? { launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH } }
  : {};

export default defineConfig({
  testDir: './tests/browser',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  timeout: 30 * 1000,
  expect: { timeout: 7 * 1000 },
  reporter: isCI
    ? [['github'], ['html', { open: 'never' }]]
    : 'list',

  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    // The production bundle registers a service worker that reloads the page
    // when it activates. Block it by default for determinism; the offline PWA
    // spec opts back in.
    serviceWorkers: 'block',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], ...chromiumLaunch } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'], ...chromiumLaunch },
    },
    { name: 'Mobile Safari', use: { ...devices['iPhone 12'] } },
  ],

  // Serve a production build: deterministic, and the same bundle users get.
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !isCI,
    // vite.config.js sets server.open, which makes `vite preview` crash with
    // ENOENT on machines without xdg-open. BROWSER=none disables it.
    env: { BROWSER: 'none' },
    timeout: 180 * 1000,
  },
});
