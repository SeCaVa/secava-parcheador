import { MAX_PATCH } from './patch';
export async function downloadPatch(path: string, base: string, signal?: AbortSignal, progress: (n: number) => void = () => {}) {
  if (!/^(patches\/[a-f0-9]{64}\.(bps|ups)|demo\/sample\.(bps|ups))$/.test(path)) throw new Error('Ruta de parche no permitida.');
  const url = new URL(path, base);
  if (url.origin !== new URL(base).origin) throw new Error('Origen de parche no permitido.');
  const response = await fetch(url, { signal, credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer' });
  if (!response.ok) throw new Error(`No se pudo descargar el parche (HTTP ${response.status}). Reintenta más tarde.`);
  const size = Number(response.headers.get('Content-Length'));
  if (size > MAX_PATCH) throw new Error('El parche supera el límite de 40 MiB.');
  if (!response.body) throw new Error('Descarga vacía.');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = []; let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      total += value.length;
      if (total > MAX_PATCH) throw new Error('El parche supera el límite de 40 MiB.');
      chunks.push(value); progress(size > 0 ? Math.min(100, Math.floor(total / size * 100)) : 0);
    }
  } catch (error) { await reader.cancel().catch(() => {}); throw error; }
  const bytes = new Uint8Array(total); let pos = 0;
  for (const chunk of chunks) { bytes.set(chunk, pos); pos += chunk.length; }
  return bytes;
}
