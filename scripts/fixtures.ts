// Test-only encoders. Data are invented bytes, never game content.
import { crc32 } from '../src/core/hash';
export function number(n: number): number[] {
  const out = [];
  while (true) { const b = n % 128; n = Math.floor(n / 128); if (n === 0) { out.push(b | 128); return out; } out.push(b); n--; }
}
function little(n: number) { return [n & 255, n >>> 8 & 255, n >>> 16 & 255, n >>> 24]; }
export function finish(body: number[], source: Uint8Array, target: Uint8Array) {
  const p = [...body, ...little(crc32(source)), ...little(crc32(target))];
  return Uint8Array.from([...p, ...little(crc32(Uint8Array.from(p)))]);
}
export function bps(source: Uint8Array, target: Uint8Array, actions?: number[], metadata: number[] = []) {
  return finish([66, 80, 83, 49, ...number(source.length), ...number(target.length), ...number(metadata.length), ...metadata,
    ...(actions ?? (target.length ? [...number((target.length - 1) * 4 + 1), ...target] : []))], source, target);
}
export function ups(source: Uint8Array, target: Uint8Array) {
  const body = [85, 80, 83, 49, ...number(source.length), ...number(target.length)];
  let pos = 0, previous = 0;
  while (pos < Math.max(source.length, target.length)) {
    if ((source[pos] ?? 0) === (target[pos] ?? 0)) { pos++; continue; }
    body.push(...number(pos - previous));
    while (pos < Math.max(source.length, target.length) && (source[pos] ?? 0) !== (target[pos] ?? 0)) { body.push((source[pos] ?? 0) ^ (target[pos] ?? 0)); pos++; }
    body.push(0); pos++; previous = pos;
  }
  return finish(body, source, target);
}
export const demoSource = Uint8Array.from({ length: 256 }, (_, i) => i);
export const demoTarget = new Uint8Array(demoSource);
demoTarget.set(new TextEncoder().encode('SECAVA: PRUEBA CORRECTA'), 32);
