import { readFile, writeFile, mkdir, readdir, unlink, stat } from 'node:fs/promises';
import { catalogSchema } from '../src/core/catalog';
import { digest, crcHex } from '../src/core/hash';
import { inspectPatch } from '../src/core/patch';
const catalog = catalogSchema.parse(JSON.parse(await readFile('catalog/projects.json', 'utf8')));
// Un SHA de salida repetido con distinto CRC32 delata una entrada copiada sin actualizar.
const seen = new Map<string, { id: string; crc: string }>();
for (const project of catalog.projects) for (const release of project.releases) for (const k of ['sha1', 'sha256'] as const) {
  const v = release.output.hashes[k]?.toLowerCase(); if (!v) continue;
  const prev = seen.get(`${k}:${v}`);
  if (prev && prev.crc !== release.output.hashes.crc32) throw new Error(`${k} de salida repetido con distinto CRC32: ${prev.id} y ${release.id}`);
  seen.set(`${k}:${v}`, { id: release.id, crc: release.output.hashes.crc32 });
}
// GitHub Pages admite como máximo 1 GB por sitio y los assets de las releases no permiten CORS:
// la web solo aloja las últimas versiones de cada juego; las anteriores enlazan a su release.
const VERSIONES_EN_WEB = 3;
const LIMITE_WEB = 900 * 1024 * 1024;
const enWeb = new Set<string>();
for (const project of catalog.projects) {
  const versiones: string[] = [];
  for (const release of project.releases) {
    const v = release.version.replace(/\s*\(.*\)$/, '');
    if (!versiones.includes(v)) versiones.push(v);
    if (versiones.indexOf(v) < VERSIONES_EN_WEB) enWeb.add(release.id);
  }
}
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
  await writeFile(cache, bytes);
  if (!enWeb.has(release.id)) { delete release.patch.path; continue; }
  release.patch.path = `patches/${release.patch.sha256}.${release.format}`;
  await writeFile(`public/${release.patch.path}`, bytes);
}
await writeFile('public/catalog.json', JSON.stringify(catalog, null, 2));
const retained = new Set(catalog.projects.flatMap(p=>p.releases.map(r=>r.patch.path?.split('/').at(-1))));
for (const entry of await readdir('public/patches',{withFileTypes:true})) {
  if (entry.isFile() && /^[a-f0-9]{64}\.(bps|ups)$/.test(entry.name) && !retained.has(entry.name)) await unlink(`public/patches/${entry.name}`);
}
let ocupado = 0;
for (const entry of await readdir('public/patches',{withFileTypes:true})) if (entry.isFile()) ocupado += (await stat(`public/patches/${entry.name}`)).size;
if (ocupado > LIMITE_WEB) throw new Error(`public/patches ocupa ${Math.round(ocupado / 1048576)} MiB: supera el límite de ${LIMITE_WEB / 1048576} MiB para GitHub Pages. Baja VERSIONES_EN_WEB.`);
console.log(`Parches alojados en la web: ${enWeb.size} (${Math.round(ocupado / 1048576)} MiB).`);
console.log(`Catálogo validado: ${catalog.projects.length} proyectos, ${catalog.projects.reduce((n, p) => n + p.releases.length, 0)} versiones habilitadas.`);
