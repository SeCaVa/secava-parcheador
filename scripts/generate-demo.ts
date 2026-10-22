import { mkdir, writeFile } from 'node:fs/promises';
import { bps, ups, demoSource, demoTarget } from './fixtures';
import { digest, fingerprint } from '../src/core/hash';
await mkdir('tests/fixtures/demo', { recursive: true });
const source = await fingerprint(demoSource), output = await fingerprint(demoTarget);
const releases = [];
for (const format of ['bps', 'ups'] as const) {
  const patch = format === 'bps' ? bps(demoSource, demoTarget) : ups(demoSource, demoTarget);
  await writeFile(`tests/fixtures/demo/sample.${format}`, patch);
  releases.push({ id: `demo-${format}`, version: `Prueba ${format.toUpperCase()}`, publishedAt: '2026-10-22', format,
    bases: [{ id: 'demo-source', name: 'Archivo ficticio SeCaVa', region: 'Laboratorio', revision: '256 bytes inventados', size: source.size, hashes: source, evidence: 'scripts/fixtures.ts' }],
    patch: { url: `https://github.com/SeCaVa/Laboratorio/releases/download/demo/sample.${format}`, sha256: await digest(patch, 'SHA-256'), size: patch.length, path: `demo/sample.${format}` },
    releaseUrl: 'https://github.com/SeCaVa/Laboratorio/releases/tag/demo', output: { name: 'secava-prueba.bin', size: output.size, hashes: output }, instructions: 'Archivo de prueba sin contenido de videojuegos. No es una traducción publicada.',
    redistribution: { allowed: true, evidence: 'Bytes inventados incluidos en el código MIT de este proyecto.' } });
}
await writeFile('tests/fixtures/demo/source.bin', demoSource);
await writeFile('tests/fixtures/demo/catalog.json', JSON.stringify({ schemaVersion: 1, projects: [{ id: 'demo', number: 99, name: 'Laboratorio SeCaVa', description: 'DEMOSTRACIÓN · Prueba real con 256 bytes inventados.', author: 'SeCaVa', credits: 'Datos sintéticos del parcheador', platform: 'BIN', status: 'experimental', repository: 'https://github.com/SeCaVa/Laboratorio', instructions: 'Esta ficha es una demostración local; los enlaces GitHub no se utilizan.', releases, demo: true }] }, null, 2));
console.log('Demostración sintética generada.');
