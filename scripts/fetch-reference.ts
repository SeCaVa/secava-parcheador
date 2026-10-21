// Maintainer utility: pinned MIT reference implementation, only for differential tests.
import { mkdir, writeFile } from 'node:fs/promises';
const commit = '4f17297cd1dc0835a0b0747497fa15f5f63f1623';
await mkdir('tests/vendor/rompatcher', {recursive:true});
for (const name of ['BinFile.js','HashCalculator.js','RomPatcher.format.bps.js','RomPatcher.format.ups.js','LICENSE']) {
  const path = name === 'LICENSE' ? name : `rom-patcher-js/modules/${name}`;
  const response = await fetch(`https://raw.githubusercontent.com/marcrobledo/RomPatcher.js/${commit}/${path}`);
  if (!response.ok) throw new Error(`Reference download HTTP ${response.status}`);
  await writeFile(`tests/vendor/rompatcher/${name}`, await response.text());
}
await writeFile('tests/vendor/rompatcher/ORIGIN.md',`RomPatcher.js, Marc Robledo, MIT.\nPinned source: https://github.com/marcrobledo/RomPatcher.js/tree/${commit}\nUnmodified reference code; used only by unit tests, excluded from dist.\n`);
console.log('Pinned MIT reference downloaded for review.');
