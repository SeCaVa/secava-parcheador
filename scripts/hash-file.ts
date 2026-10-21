import { readFile } from 'node:fs/promises';
import { fingerprint } from '../src/core/hash';
if (!process.argv[2]) throw new Error('Uso: npm run hash -- "ruta/a/archivo". Todo se calcula localmente.');
console.log(JSON.stringify(await fingerprint(new Uint8Array(await readFile(process.argv[2]))), null, 2));
