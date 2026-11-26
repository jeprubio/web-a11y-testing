import { defineConfig, devices } from '@playwright/test';

// Override with PORT=xxxx if 5173 is busy (for example, another dev server is running).
const PORT = Number(process.env.PORT ?? 5173);

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Keyboard-only users and screen reader users often prefer reduced motion.
    contextOptions: { reducedMotion: 'reduce' },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        // On macOS, Firefox skips links on Tab unless "tab to all controls" is enabled.
        launchOptions: { firefoxUserPrefs: { 'accessibility.tabfocus': 7 } },
      },
    },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
