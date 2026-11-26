import { defineConfig, devices } from '@playwright/test';

/**
 * The library's own tests. They render small HTML fixtures with `page.setContent`,
 * so no web server is needed: the equivalent of unit tests for the DSL itself.
 */
export default defineConfig({
  testDir: './test',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: [['list']],
  use: { trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        launchOptions: { firefoxUserPrefs: { 'accessibility.tabfocus': 7 } },
      },
    },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
