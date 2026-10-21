const table = Uint32Array.from({ length: 256 }, (_, n) => {
  for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) crc = table[(crc ^ bytes[i]) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
export const crcHex = (n: number) => n.toString(16).padStart(8, '0');
export async function digest(bytes: Uint8Array, algorithm: 'SHA-1' | 'SHA-256'): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error('Se necesita HTTPS o localhost para verificar los hashes.');
  const hash = await crypto.subtle.digest(algorithm, bytes as Uint8Array<ArrayBuffer>);
  return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
}
export async function fingerprint(bytes: Uint8Array) {
  // Sequential digests avoid simultaneous WebCrypto input copies on mobile.
  return { size: bytes.length, crc32: crcHex(crc32(bytes)), sha1: await digest(bytes, 'SHA-1'), sha256: await digest(bytes, 'SHA-256') };
}
