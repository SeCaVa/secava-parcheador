import { test, expect } from '@playwright/test';
test('desarrollo Vite conserva estilos y Worker con CSP nonce',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4175/');
  await expect(page.locator('.device')).toHaveCSS('background-color','rgb(169, 56, 50)');
  await page.getByRole('button',{name:/Abrir laboratorio/}).click();
  await expect(page.getByRole('button',{name:/Aplicar traducción/})).toBeEnabled();
  await page.getByRole('button',{name:/Aplicar traducción/}).click();
  await expect(page.getByRole('status')).toContainText('Resultado verificado');
  expect(errors).toEqual([]);
});
