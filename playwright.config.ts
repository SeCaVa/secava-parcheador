import { defineConfig, devices } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const browserRegistry = JSON.parse(readFileSync(resolve('node_modules/playwright-core/browsers.json'), 'utf8'));
const firefoxRevision = browserRegistry.browsers.find((browser: { name: string }) => browser.name === 'firefox').revision;
const localFirefox = resolve('.cache/playwright', `firefox-${firefoxRevision}`, 'firefox', 'firefox.exe');
const firefoxLaunchOptions = process.platform === 'win32' && existsSync(localFirefox) ? { executablePath: localFirefox } : undefined;
export default defineConfig({
  testDir: './tests/browser', fullyParallel: true, workers: 2, retries: 0,
  timeout: 45000, use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure' },
  webServer: [
    { command: 'npm run preview -- --port 4173 --strictPort', url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI },
    { command: 'npm run dev -- --port 4175 --strictPort', url: 'http://127.0.0.1:4175', reuseExistingServer: !process.env.CI }
  ],
  projects: [
    { name: 'chrome-desktop', use: { ...devices['Desktop Chrome'], channel: process.env.CI ? undefined : 'chrome' } },
    { name: 'firefox-desktop', use: { ...devices['Desktop Firefox'], launchOptions: firefoxLaunchOptions } },
    { name: 'webkit-desktop', use: { ...devices['Desktop Safari'] } },
    { name: 'chrome-mobile', use: { ...devices['Pixel 7'], channel: process.env.CI ? undefined : 'chrome' } },
    { name: 'webkit-mobile', use: { ...devices['iPhone 13'] } }
  ]
});
