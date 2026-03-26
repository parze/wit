import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  timeout: 90000,
  use: {
    baseURL: 'http://49.12.195.247:5200',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'teacher',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
      testMatch: ['**/auth.spec.js', '**/teacher.spec.js', '**/dashboard.spec.js'],
    },
    {
      name: 'student',
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } },
      testMatch: ['**/student.spec.js'],
    },
  ],
});
