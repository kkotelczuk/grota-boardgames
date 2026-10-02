import { defineConfig, devices } from '@playwright/test';

const base = process.env.BASE_PATH ?? '/grota-boardgames/';

export default defineConfig({
  testDir: 'tests/e2e',
  use: { baseURL: `http://localhost:4321${base}` },
  webServer: {
    command: 'pnpm build && pnpm preview',
    port: 4321,
    reuseExistingServer: true,
    timeout: 180_000,
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
});
