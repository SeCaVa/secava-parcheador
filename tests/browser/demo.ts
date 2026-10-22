import type { Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { demoSource } from '../../scripts/fixtures';
// The synthetic fixture is not published; tests inject it into the official catalog.
export const demo = JSON.parse(await readFile('tests/fixtures/demo/catalog.json', 'utf8'));
export async function serveDemo(page: Page, extra: unknown[] = []) {
  await page.route('**/catalog.json', async route => {
    const official = await (await route.fetch()).json();
    await route.fulfill({ json: { schemaVersion: 1, projects: [...official.projects, ...demo.projects, ...extra] } });
  });
  await page.route(/\/demo\/sample\.(bps|ups)$/, async route => {
    const name = new URL(route.request().url()).pathname.split('/').pop()!;
    await route.fulfill({ body: await readFile(`tests/fixtures/demo/${name}`), contentType: 'application/octet-stream' });
  });
}
export const loadDemoRom = (page: Page) => page.locator('#rom-file').setInputFiles({ name: 'prueba.bin', mimeType: 'application/octet-stream', buffer: Buffer.from(demoSource) });
