import { test, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
test('sitio compilado bajo el subdirectorio de un repositorio Pages',async({page})=>{
  const root=resolve('dist'), prefix='/secava-parcheador/';
  const types:Record<string,string>={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'};
  const server=createServer(async(req,res)=>{
    try {
      const path=new URL(req.url!,'http://localhost').pathname;
      if(!path.startsWith(prefix)){res.writeHead(404);res.end();return;}
      const file=resolve(root,path.slice(prefix.length)||'index.html');
      if(!file.startsWith(root+sep)){res.writeHead(403);res.end();return;}
      res.setHeader('Content-Type',types[extname(file)]??'application/octet-stream');res.end(await readFile(file));
    }catch{res.writeHead(404);res.end();}
  });
  await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
  try {
    const address=server.address() as {port:number};
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`http://127.0.0.1:${address.port}${prefix}`);
    await page.getByRole('button',{name:/Abrir laboratorio/}).click();
    await expect(page.getByRole('button',{name:/Aplicar traducción/})).toBeEnabled();
    await page.locator('#version').selectOption('demo-ups');
    await page.getByRole('button',{name:/Aplicar traducción/}).click();
    await expect(page.getByRole('status')).toContainText('Resultado verificado');
    expect(errors).toEqual([]);
  }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
});
