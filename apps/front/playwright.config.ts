import { defineConfig, devices } from '@playwright/test';

// Tests de bout en bout (cadrage.md § 2.8) : pnpm test:e2e
// Lance le mock Prism et le serveur de dev s'ils ne tournent pas déjà.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'pnpm mock',
      cwd: '../..',
      url: 'http://localhost:4010/rooms',
      reuseExistingServer: true,
    },
    {
      command: 'pnpm dev',
      // Les tests de bout en bout tournent contre le mock (données fixes), pas contre le back
      env: { API_BASE_URL: 'http://localhost:4010' },
      url: 'http://localhost:4321',
      // Astro n'accepte qu'un serveur de dev par projet : on réutilise celui qui tourne
      reuseExistingServer: !process.env.CI,
    },
  ],
});
