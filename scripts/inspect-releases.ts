import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { inspectPatch } from '../src/core/patch';
const research = JSON.parse(await readFile('catalog/research.json', 'utf8'));
await mkdir('.cache', { recursive: true });
const result = [];
for (const project of research.sources) {
  for (const r of project.releases.slice(0, 2)) for (const a of r.assets) {
    if (!/\.(bps|ups)$/.test(a.name)) continue;
    const path = `.cache/${a.sha256}`;
    let bytes: Uint8Array;
    try { bytes = new Uint8Array(await readFile(path)); }
    catch { const response = await fetch(a.url); if (!response.ok) throw new Error(`HTTP ${response.status}`); bytes = new Uint8Array(await response.arrayBuffer()); }
    if (createHash('sha256').update(bytes).digest('hex') !== a.sha256) throw new Error('SHA-256 incorrecto');
    await writeFile(path, bytes);
    const h = inspectPatch(bytes);
    result.push({ repository: project.repository, version: r.tag, date: r.date.slice(0, 10), releaseUrl: r.url, patch: a,
      format: h.format, sourceSize: h.sourceSize, targetSize: h.targetSize, sourceCrc: h.sourceCrc.toString(16).padStart(8, '0'), targetCrc: h.targetCrc.toString(16).padStart(8, '0') });
  }
}
await writeFile('.cache/headers.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
