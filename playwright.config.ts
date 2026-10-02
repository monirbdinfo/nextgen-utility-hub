import { defineConfig, devices } from '@playwright/test';

// Minimal typing for the env reads below; avoids adding @types/node just for this file.
declare const process: { env: Record<string, string | undefined> };

const PORT = 4173;
export const SUBPATH_PORT = 4174;
export const SUBPATH = '/nextgen-utility-hub/';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}/`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Test the production build, served exactly as GitHub Pages would serve static files.
  // The second server mounts the same build under the GitHub Pages project sub-path.
  // Playwright starts web servers one after another, so the build finishes first.
  webServer: [
    {
      command: `npm run build && npx vite preview --host 127.0.0.1 --port ${PORT} --strictPort`,
      url: `http://127.0.0.1:${PORT}/`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: `npx vite preview --host 127.0.0.1 --port ${SUBPATH_PORT} --strictPort --base ${SUBPATH}`,
      url: `http://127.0.0.1:${SUBPATH_PORT}${SUBPATH}`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
