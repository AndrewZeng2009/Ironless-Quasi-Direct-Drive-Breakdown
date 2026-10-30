import { defineConfig, devices } from '@playwright/test';

/* Smoke tests run against the production build (vite preview).
   WebGL runs on SwiftShader (CPU) so the tests work on machines and CI runners without a GPU.
   That is slow for a ~400k-triangle scene (seconds per frame), hence the generous timeouts and
   the modest viewport. */
const viewport = { width: 1100, height: 900 }; // tall enough for the whole viewer card
export default defineConfig({
  testDir: './tests',
  timeout: 600_000,
  expect: { timeout: 90_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:4173',
    viewport,
    reducedMotion: 'reduce',
    actionTimeout: 120_000,
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport } }],
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
