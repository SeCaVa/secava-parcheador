import { readFile, writeFile, mkdir, appendFile } from 'node:fs/promises';
import { catalogSchema, releaseSchema, type Release } from '../src/core/catalog';
import { validateManifest, type GitHubRelease } from '../src/core/release-import';
import { digest } from '../src/core/hash';
const catalog = catalogSchema.parse(JSON.parse(await readFile('catalog/projects.json','utf8')));
const importing = process.argv.includes('--import');
const messages: string[] = []; let changed = false;
await mkdir('.cache/releases', {recursive:true});
let imported: Record<string, Release[]> = {};
try { imported = JSON.parse(await readFile('.cache/releases/imported.json','utf8')); } catch { /* first import */ }
if (importing) for (const p of catalog.projects) for (const item of imported[p.id] ?? []) {
  const r = releaseSchema.parse(item);
  if (!p.releases.some(known=>known.releaseUrl===r.releaseUrl)) {
    p.releases.push(r);
    p.pendingReleases = p.pendingReleases?.filter(pending=>pending.releaseUrl!==r.releaseUrl);
    delete p.pendingReason;
  }
}
catalogSchema.parse(catalog);
// Serial, conditional requests; tokens are used only with api.github.com, never asset hosts.
for (const project of catalog.projects) {
  const cachePath = `.cache/releases/${project.id}.json`;
  let cache: { etag?: string; releases: GitHubRelease[] } = {releases:[]};
  try { cache = JSON.parse(await readFile(cachePath,'utf8')); } catch { /* first check */ }
  const headers: Record<string,string> = {Accept:'application/vnd.github+json'};
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  if (cache.etag) headers['If-None-Match'] = cache.etag;
  const response = await fetch(`https://api.github.com/repos/${new URL(project.repository).pathname.slice(1)}/releases?per_page=100`, {headers, signal:AbortSignal.timeout(30000)});
  if (response.status !== 304) {
    if (!response.ok) throw new Error(`GitHub ${project.id}: HTTP ${response.status}. No se reintenta automáticamente.`);
    cache = {etag:response.headers.get('etag') ?? undefined,releases:await response.json() as GitHubRelease[]};
    await writeFile(cachePath,JSON.stringify(cache));
    if (response.headers.get('link')?.includes('rel="next"')) messages.push(`${project.name}: solo se examinan las 100 Releases más recientes; el historial sigue en el catálogo manual.`);
  }
  for (const published of cache.releases.filter(r=>!r.draft)) {
    const known = project.releases.find(r=>r.releaseUrl === published.html_url);
    if (known) {
      const asset = published.assets.find(a=>a.browser_download_url === known.patch.url);
      if (!asset || asset.size !== known.patch.size || (asset.digest && asset.digest !== `sha256:${known.patch.sha256}`)) throw new Error(`El archivo de ${project.name} ${known.version} cambió o fue retirado. Revisar hashes; no se hereda confianza.`);
      continue;
    }
    const asset = published.assets.find(a=>a.name==='secava-release.json');
    if (!asset) { messages.push(`${project.name} ${published.tag_name}: no habilitada automáticamente; falta secava-release.json.`); continue; }
    if (!asset.browser_download_url.startsWith(project.repository+'/releases/download/') || asset.size > 262144) throw new Error('Manifiesto externo o demasiado grande.');
    const res = await fetch(asset.browser_download_url,{signal:AbortSignal.timeout(30000)});
    if (!res.ok) throw new Error(`No se pudo leer manifiesto de ${project.id}: HTTP ${res.status}`);
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.length > 262144 || bytes.length !== asset.size) throw new Error('Tamaño de manifiesto incorrecto.');
    if (asset.digest && asset.digest !== `sha256:${await digest(bytes,'SHA-256')}`) throw new Error('Manifiesto con digest incorrecto.');
    const release = validateManifest(JSON.parse(new TextDecoder().decode(bytes)),project,published);
    if (importing) {
      project.releases.unshift(release); project.releases.sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt));
      project.pendingReleases = project.pendingReleases?.filter(r=>r.releaseUrl!==release.releaseUrl);
      delete project.pendingReason; changed = true;
      imported[project.id] = [...(imported[project.id] ?? []).filter(r=>r.releaseUrl!==release.releaseUrl), release];
    }
    messages.push(`${project.name} ${release.version}: manifiesto válido${importing?' importado':''}. El build aún debe comprobar el binario.`);
  }
}
catalogSchema.parse(catalog);
if (importing) {
  for (const p of catalog.projects) p.releases.sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt));
  await writeFile('catalog/projects.json',JSON.stringify(catalog,null,2)+'\n');
  await writeFile('.cache/releases/imported.json',JSON.stringify(imported));
}
const report = `# Comprobación de Releases\n\n${messages.map(m=>'- '+m).join('\n')}\n`;
await writeFile('.cache/releases-report.md',report);
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY,report);
if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT,`changed=${changed}\n`);
console.log(report);
