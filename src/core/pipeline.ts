import { fingerprint, digest } from './hash';
import { matches, matchesHashes, type Release } from './catalog';
import { applyPatch, inspectPatch } from './patch';
export async function translate(source: Uint8Array, patch: Uint8Array, release: Release, progress: (n: number) => void = () => {}) {
  if (!release.bases.some(b => b.size === source.length)) throw new Error('La ROM no es compatible con esta traducción.');
  const sourceHash = await fingerprint(source);
  if (!release.bases.some(b => matches(sourceHash, b))) throw new Error('La ROM no es compatible con esta traducción.');
  if (patch.length !== release.patch.size || await digest(patch, 'SHA-256') !== release.patch.sha256) throw new Error('SHA-256 del parche incorrecto: descarga dañada o modificada.');
  const header = inspectPatch(patch);
  if (header.targetSize !== release.output.size) throw new Error('El tamaño de salida no coincide con el catálogo.');
  const result = applyPatch(source, patch, release.format, progress);
  const hashes = await fingerprint(result);
  if (!matchesHashes(hashes, release.output.hashes)) throw new Error('El hash del resultado no coincide con el catálogo.');
  return { result, hashes };
}
