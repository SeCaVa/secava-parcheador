import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises';
import { catalogSchema } from '../src/core/catalog';
import { digest, crcHex } from '../src/core/hash';
import { inspectPatch } from '../src/core/patch';
const catalog = catalogSchema.parse(JSON.parse(await readFile('catalog/projects.json', 'utf8')));
await mkdir('public/patches', { recursive: true });
await mkdir('.cache', { recursive: true });
for (const project of catalog.projects) for (const release of project.releases) {
  const cache = `.cache/${release.patch.sha256}`;
  let bytes: Uint8Array;
  try { bytes = new Uint8Array(await readFile(cache)); }
  catch {
    const response = await fetch(release.patch.url, { signal: AbortSignal.timeout(120000) });
    if (!response.ok) throw new Error(`Descarga de ${project.id}/${release.version}: HTTP ${response.status}`);
    if (Number(response.headers.get('Content-Length')) > release.patch.size) throw new Error('Tamaño de descarga inesperado.');
    const reader = response.body!.getReader(); const chunks = []; let size = 0;
    while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > release.patch.size) { await reader.cancel(); throw new Error('Descarga excede el tamaño declarado.'); } chunks.push(value); }
    bytes = new Uint8Array(size); let pos = 0; for (const c of chunks) { bytes.set(c, pos); pos += c.length; }
  }
  if (bytes.length !== release.patch.size || await digest(bytes, 'SHA-256') !== release.patch.sha256) throw new Error(`Parche modificado: ${release.id}`);
  const h = inspectPatch(bytes);
  if (h.format !== release.format || h.targetSize !== release.output.size || crcHex(h.targetCrc) !== release.output.hashes.crc32 ||
    release.bases.some(b => b.size !== h.sourceSize || b.hashes.crc32 !== crcHex(h.sourceCrc))) throw new Error(`Cabecera incompatible con el catálogo: ${release.id}`);
  release.patch.path = `patches/${release.patch.sha256}.${release.format}`;
  await writeFile(`public/${release.patch.path}`, bytes);
  await writeFile(cache, bytes);
}
await writeFile('public/catalog.json', JSON.stringify(catalog, null, 2));
const retained = new Set(catalog.projects.flatMap(p=>p.releases.map(r=>r.patch.path?.split('/').at(-1))));
for (const entry of await readdir('public/patches',{withFileTypes:true})) {
  if (entry.isFile() && /^[a-f0-9]{64}\.(bps|ups)$/.test(entry.name) && !retained.has(entry.name)) await unlink(`public/patches/${entry.name}`);
}
console.log(`Catálogo validado: ${catalog.projects.length} proyectos, ${catalog.projects.reduce((n, p) => n + p.releases.length, 0)} versiones habilitadas.`);
