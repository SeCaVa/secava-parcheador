import { test, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { serveDemo, loadDemoRom } from './demo';
test('sitio compilado bajo el subdirectorio de un repositorio Pages',async({page})=>{
  const root=resolve('dist'), prefix='/secava-parcheador/';
  const catalogPath=resolve(root,'catalog.json');
  const originalCatalog=JSON.parse(await readFile(catalogPath,'utf8'));
  let catalogOverride:string|null=null;
  const types:Record<string,string>={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'};
  const server=createServer(async(req,res)=>{
    try {
      const path=new URL(req.url!,'http://localhost').pathname;
      if(!path.startsWith(prefix)){res.writeHead(404);res.end();return;}
      const file=resolve(root,path.slice(prefix.length)||'index.html');
      if(!file.startsWith(root+sep)){res.writeHead(403);res.end();return;}
      res.setHeader('Content-Type',types[extname(file)]??'application/octet-stream');
      if(file===catalogPath){res.setHeader('Cache-Control','public, max-age=3600');res.end(catalogOverride??await readFile(file));}
      else res.end(await readFile(file));
    }catch{res.writeHead(404);res.end();}
  });
  await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
  try {
    const address=server.address() as {port:number};
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await serveDemo(page);
    await page.goto(`http://127.0.0.1:${address.port}${prefix}`);
    await expect(page.getByText(/proyectos habilitados/)).toBeVisible();
    await loadDemoRom(page);
    await expect(page.getByRole('button',{name:/Aplicar traducción/})).toBeEnabled();
    await page.locator('#version').selectOption('demo-ups');
    await page.getByRole('button',{name:/Aplicar traducción/}).click();
    await expect(page.getByRole('status')).toContainText('Resultado verificado');
    expect(errors).toEqual([]);
    // A deployment changes the catalog while the previous response is still fresh
    // in HTTP cache. Reloading must pick up the newly published compatibility.
    const latest=structuredClone(originalCatalog);
    const enabled=latest.projects.filter((p:{releases:unknown[]})=>p.releases.length>0);
    enabled[0].releases=[];
    catalogOverride=JSON.stringify(latest);
    await page.unroute('**/catalog.json');
    await page.reload();
    await expect(page.getByText(`${enabled.length-1} de ${latest.projects.length} proyectos habilitados`)).toBeVisible();
  }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
});
