import { fingerprint } from './core/hash';
import { MAX_ROM } from './core/patch';
import { translate } from './core/pipeline';
import type { Release } from './core/catalog';
let source: Uint8Array | undefined;
const ctx = self as unknown as { postMessage: (data: unknown, transfer?: Transferable[]) => void; onmessage: ((e: MessageEvent) => void) | null };
ctx.onmessage = async ({ data }: MessageEvent<{ type: 'identify'; file: File } | { type: 'apply'; patch: ArrayBuffer; release: Release }>) => {
  try {
    if (data.type === 'identify') {
      source = undefined;
      if (!data.file.size || data.file.size > MAX_ROM) throw new Error('Selecciona un archivo de entre 1 byte y 64 MiB.');
      source = new Uint8Array(await data.file.arrayBuffer());
      if (source[0] === 0x50 && source[1] === 0x4b && source[2] === 3 && source[3] === 4) { source = undefined; throw new Error('Descomprime el ZIP y selecciona el archivo ROM que contiene.'); }
      ctx.postMessage({ type: 'identified', hashes: await fingerprint(source) });
    } else {
      if (!source) throw new Error('Carga tu ROM antes de aplicar la traducción.');
      const { result, hashes } = await translate(source, new Uint8Array(data.patch), data.release, n => ctx.postMessage({ type: 'progress', value: n }));
      ctx.postMessage({ type: 'done', result: result.buffer, hashes }, [result.buffer]);
    }
  } catch (error) { ctx.postMessage({ type: 'error', message: error instanceof Error ? error.message : 'No se pudo completar la operación.' }); }
};
