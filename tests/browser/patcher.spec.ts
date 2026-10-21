import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { demoSource, demoTarget } from '../../scripts/fixtures';
import AxeBuilder from '@axe-core/playwright';
const official = JSON.parse(await readFile('public/catalog.json', 'utf8'));
const demo = JSON.parse(await readFile('public/demo/catalog.json', 'utf8'));
// A controlled blocked fixture keeps tests independent of future catalog corrections.
const blocked = { ...demo.projects[0], id:'blocked-test', number:98, name:'Prueba pendiente', releases:[],
  pendingReason:'Prueba: CRC32 interno 776014AC difiere del documentado.',
  pendingReleases:[{...demo.projects[0].releases[0],blockedReason:'Prueba: CRC32 interno 776014AC difiere del documentado.'}] };
test.beforeEach(async ({ page }) => {
  await page.route('**/catalog.json', async route => {
    if (new URL(route.request().url()).pathname.endsWith('/demo/catalog.json')) return route.continue();
    await route.fulfill({ json: { schemaVersion: 1, projects: [...official.projects, ...demo.projects, blocked] } });
  });
  await page.goto('/');
  await expect(page.getByText(/proyectos habilitados/)).toBeVisible();
});
test('pantalla adaptable, marca y sonido desactivado', async ({ page }, info) => {
  await expect(page.getByRole('heading', { name: /Tus aventuras/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Sonido: no/ })).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/inicio-${info.project.name}.png`, fullPage: true });
});
test('accesibilidad de la pantalla principal y ficha de traducción', async ({ page }) => {
  const initial = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
  expect(initial.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);
  await page.getByRole('button',{name:/N.º 099/}).click();
  const selection = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
  expect(selection.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);
});
for (const format of ['bps','ups']) test(`identificación automática y descarga real ${format.toUpperCase()}`, async ({ page }, info) => {
  const requests: { url: string; method: string; data: string | null }[] = [];
  page.on('request', r => requests.push({url:r.url(),method:r.method(),data:r.postData()}));
  await page.locator('#rom-file').setInputFiles({ name: 'nombre-irrelevante.bin', mimeType: 'application/octet-stream', buffer: Buffer.from(demoSource) });
  await expect(page.getByRole('status')).toContainText('compatible');
  await expect(page.locator('#selection')).toContainText('Laboratorio SeCaVa');
  await page.locator('#version').selectOption(`demo-${format}`);
  await page.getByRole('button', { name: /Aplicar traducción/ }).click();
  await expect(page.getByRole('status')).toContainText('Resultado verificado');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('link', {name:/Descargar resultado/}).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('secava-prueba.bin');
  const path = info.outputPath('resultado.bin'); await download.saveAs(path);
  expect(new Uint8Array(await readFile(path))).toEqual(demoTarget);
  expect(requests.every(r => new URL(r.url).origin === 'http://127.0.0.1:4173' && r.method === 'GET' && r.data === null)).toBe(true);
  await page.screenshot({path: info.outputPath('resultado.png'),fullPage:true});
});
test('selección manual usa la misma verificación', async ({ page }) => {
  await page.getByRole('button', {name:/N.º 099/}).click();
  await expect(page.getByRole('button',{name:/Aplicar traducción/})).toBeDisabled();
  await page.locator('#rom-file').setInputFiles({name:'prueba.bin',mimeType:'application/octet-stream',buffer:Buffer.from(demoSource)});
  await expect(page.getByRole('button',{name:/Aplicar traducción/})).toBeEnabled();
  await page.getByRole('button',{name:/Aplicar traducción/}).click();
  await expect(page.getByRole('status')).toContainText('Resultado verificado');
});
test('arrastrar un archivo identifica la ROM sin elegir proyecto', async ({page})=>{
  await page.locator('#drop-zone').evaluate((zone, data)=>{
    const transfer = new DataTransfer(); transfer.items.add(new File([Uint8Array.from(data)],'arrastrada.bin'));
    zone.dispatchEvent(new DragEvent('drop',{dataTransfer:transfer,bubbles:true,cancelable:true}));
  },Array.from(demoSource));
  await expect(page.getByRole('status')).toContainText('compatible');
  await expect(page.locator('#selection')).toContainText('Laboratorio SeCaVa');
});
test('laboratorio público carga un fichero sintético y permite traducirlo',async({page})=>{
  // Remove the injected demo fixture before exercising the actual public button.
  await page.route('**/catalog.json', async route=>{
    if(new URL(route.request().url()).pathname.endsWith('/demo/catalog.json')) return route.continue();
    await route.fulfill({json:official});
  });
  await page.reload();
  await page.getByRole('button',{name:/Abrir laboratorio/}).click();
  await expect(page.locator('#selection')).toContainText('DEMOSTRACIÓN');
  await expect(page.getByRole('button',{name:/Aplicar traducción/})).toBeEnabled();
  await page.getByRole('button',{name:/Aplicar traducción/}).click();
  await expect(page.getByRole('status')).toContainText('Resultado verificado');
});
test('ROM desconocida e incompatible nunca habilita parche', async ({ page }) => {
  await page.getByRole('button',{name:/N.º 002/}).click();
  await page.locator('#rom-file').setInputFiles({name:'PokemonFireRed.gba',mimeType:'application/octet-stream',buffer:Buffer.from([1,2,3])});
  await expect(page.getByRole('status')).toContainText('no está registrada');
  await expect(page.getByRole('button',{name:/Aplicar traducción/})).toBeDisabled();
  await expect(page.locator('#selection')).toContainText('no coincide');
});
test('descarga HTTP fallida permite reintentar', async ({ page }) => {
  await page.locator('#rom-file').setInputFiles({name:'demo.bin',mimeType:'application/octet-stream',buffer:Buffer.from(demoSource)});
  await expect(page.getByRole('status')).toContainText('compatible');
  await page.route('**/demo/sample.bps', route => route.fulfill({status:503,body:'Unavailable'}));
  await page.getByRole('button',{name:/Aplicar traducción/}).click();
  await expect(page.getByRole('status')).toContainText('HTTP 503');
  await expect(page.getByRole('button',{name:/Aplicar traducción/})).toBeEnabled();
  await page.unroute('**/demo/sample.bps');
  await page.getByRole('button',{name:/Aplicar traducción/}).click();
  await expect(page.getByRole('status')).toContainText('Resultado verificado');
});
test('parche corrupto no produce descarga', async ({ page }) => {
  await page.locator('#rom-file').setInputFiles({name:'demo.bin',mimeType:'application/octet-stream',buffer:Buffer.from(demoSource)});
  await expect(page.getByRole('status')).toContainText('compatible');
  const corrupt = await readFile('public/demo/sample.bps'); corrupt[20] ^= 1;
  await page.route('**/demo/sample.bps', route => route.fulfill({body:corrupt,contentType:'application/octet-stream'}));
  await page.getByRole('button',{name:/Aplicar traducción/}).click();
  await expect(page.getByRole('status')).toContainText('SHA-256 del parche incorrecto');
  await expect(page.getByRole('link',{name:/Descargar resultado/})).toHaveCount(0);
});
test('cancelación y reinicio liberan el resultado anterior', async ({ page }) => {
  await page.locator('#rom-file').setInputFiles({name:'demo.bin',mimeType:'application/octet-stream',buffer:Buffer.from(demoSource)});
  await expect(page.getByRole('status')).toContainText('compatible');
  await page.route('**/demo/sample.bps', route => new Promise<void>(resolve => setTimeout(() => { void route.abort().catch(()=>{}); resolve(); },1500)));
  await page.getByRole('button',{name:/Aplicar traducción/}).click();
  await page.getByRole('button',{name:'Cancelar operación'}).click();
  await expect(page.getByRole('status')).toContainText('cancelada');
  await expect(page.locator('#file-info')).toBeHidden();
  await expect(page.getByRole('link',{name:/Descargar resultado/})).toHaveCount(0);
  await expect(page.getByRole('button',{name:/Seleccionar ROM/})).toBeEnabled();
});
test('detecta ZIP y recupera la interfaz', async ({ page }) => {
  await page.locator('#rom-file').setInputFiles({name:'archivo.zip',mimeType:'application/zip',buffer:Buffer.from([80,75,3,4,0,0])});
  await expect(page.getByRole('status')).toContainText('Descomprime');
  await expect(page.getByRole('button',{name:/Seleccionar ROM/})).toBeEnabled();
});
test('versión con discrepancia queda pendiente sin simular compatibilidad', async ({ page }) => {
  await page.getByRole('button',{name:/N.º 098/}).click();
  await expect(page.locator('#selection')).toContainText('776014AC');
  await expect(page.getByRole('button',{name:/Aplicar traducción/})).toBeDisabled();
});
test('búsqueda accesible y reinicio', async ({ page }) => {
  await page.getByRole('searchbox').fill('lazarus');
  await expect(page.locator('.project')).toHaveCount(1);
  await page.getByRole('button',{name:/Lazarus/}).click();
  await expect(page.locator('#selection')).toContainText('Pokémon Lazarus');
  await page.getByRole('button',{name:'Reiniciar parcheador'}).click();
  await expect(page.locator('#selection')).toBeHidden();
});
test('32 MiB sintéticos en un Worker sin bloquear controles', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e=>errors.push(e.message));
  await page.locator('#rom-file').setInputFiles({name:'grande.bin',mimeType:'application/octet-stream',buffer:Buffer.alloc(32*1024*1024,7)});
  await expect(page.getByRole('status')).toContainText('no está registrada', {timeout:30000});
  await page.getByRole('button',{name:'Reiniciar parcheador'}).click();
  await expect(page.getByRole('status')).toContainText('reconocerá');
  expect(errors).toEqual([]);
});
