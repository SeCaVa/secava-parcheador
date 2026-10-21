import { describe, it, expect } from 'vitest';
import { crc32 as oracleCrc32 } from 'node:zlib';
import { applyPatch, inspectPatch, MAX_ROM } from '../../src/core/patch';
import { fingerprint, crc32, digest } from '../../src/core/hash';
import { number, finish, bps, ups } from '../../scripts/fixtures';
const bytes = (s: string) => new TextEncoder().encode(s);
const text = (b: Uint8Array) => new TextDecoder().decode(b);
function recheck(p: Uint8Array) { new DataView(p.buffer).setUint32(p.length - 4, oracleCrc32(p.subarray(0, -4)), true); return p; }
describe('hashes con vectores independientes', () => {
  it('CRC32 estándar y vacío', () => { expect(crc32(bytes('123456789'))).toBe(0xcbf43926); expect(crc32(new Uint8Array())).toBe(0); });
  it('SHA-1 y SHA-256 estándar', async () => { const h = await fingerprint(bytes('abc')); expect(h.sha1).toBe('a9993e364706816aba3e25717850c26c9cd0d89d'); expect(h.sha256).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'); });
  it('CRC32 sobre vista con byteOffset', () => { const all = bytes('0123456789x'); expect(crc32(all.subarray(1, -1))).toBe(0xcbf43926); });
});
describe('BPS: las cuatro acciones', () => {
  it('SourceRead', () => { const s = bytes('ABC'); expect(applyPatch(s, bps(s, s, [0x88]))).toEqual(s); });
  it('TargetRead y metadatos arbitrarios', () => { const s = bytes('ABC'), t = bytes('¡hola!'); expect(applyPatch(s, bps(s, t, undefined, [0, 1, 2, 255]))).toEqual(t); });
  it('SourceCopy positivo y negativo, relativo al último final', () => {
    const s = bytes('ABCDEFGH'), t = bytes('EFGBC');
    const actions = [...number(10), ...number(8), ...number(6), ...number(13)];
    expect(text(applyPatch(s, bps(s, t, actions)))).toBe('EFGBC');
  });
  it('TargetCopy con repetición solapada y desplazamiento negativo', () => {
    const s = bytes('x'), t = bytes('ABABABABAB');
    const actions = [...number(5), 65, 66, ...number(19), ...number(0), ...number(11), ...number(5)];
    expect(applyPatch(s, bps(s, t, actions))).toEqual(t);
  });
  it('SourceRead después de un literal usa posición de salida', () => {
    const s = bytes('ABCDE'), t = bytes('XBCDE');
    expect(applyPatch(s, bps(s, t, [0x81, 88, 0x8c]))).toEqual(t);
  });
  it('varint de varios bytes y archivo ampliado', () => { const s = new Uint8Array(16385), t = Uint8Array.from({ length: 40000 }, (_, i) => i % 251); expect(applyPatch(s, bps(s, t))).toEqual(t); });
  it('permite salida vacía del formato', () => { const s = bytes('abc'); expect(applyPatch(s, bps(s, new Uint8Array()))).toHaveLength(0); });
  it('parche con vista desplazada', () => { const s = bytes('ABC'), t = bytes('DEF'), p = bps(s, t); const view = new Uint8Array(p.length + 4); view.set(p, 2); expect(applyPatch(s, view.subarray(2, -2))).toEqual(t); });
});
describe.each(['bps', 'ups'] as const)('%s: validación estricta', format => {
  const make = format === 'bps' ? bps : ups;
  const s = bytes('original sintético'), t = bytes('resultado traducido ficticio');
  it('aplica realmente y verifica bytes', () => expect(applyPatch(s, make(s, t), format)).toEqual(t));
  it('rechaza formato esperado distinto', () => expect(() => applyPatch(s, make(s, t), format === 'bps' ? 'ups' : 'bps')).toThrow(/formato/));
  it('rechaza tamaño base incorrecto', () => expect(() => applyPatch(bytes('x'), make(s, t))).toThrow(/Tamaño/));
  it('rechaza CRC base incorrecto con igual tamaño', () => expect(() => applyPatch(new Uint8Array(s.length), make(s, t))).toThrow(/CRC32 de la ROM/));
  it('rechaza un bit corrupto', () => { const p = make(s, t); p[8] ^= 1; expect(() => applyPatch(s, p)).toThrow(/CRC32 del parche/); });
  it('rechaza CRC de salida incorrecto incluso con CRC de parche correcto', () => { const p = make(s, t); p[p.length - 8] ^= 1; expect(() => applyPatch(s, recheck(p))).toThrow(/CRC32 del resultado/); });
  it('rechaza CRC de origen incorrecto incluso con CRC de parche correcto', () => { const p = make(s, t); p[p.length - 12] ^= 1; expect(() => applyPatch(s, recheck(p))).toThrow(/CRC32 de la ROM/); });
  it('valida CRC little endian con oracle de Node', () => { const p = make(s, t), view = new DataView(p.buffer); expect(view.getUint32(p.length - 4, true)).toBe(oracleCrc32(p.subarray(0, -4))); expect(view.getUint32(p.length - 12, true)).toBe(oracleCrc32(s)); });
  it('rechaza cada truncamiento', () => { const p = make(s, t); for (let i = 0; i < p.length; i++) expect(() => applyPatch(s, p.subarray(0, i))).toThrow(); });
  it('informa del progreso', () => { const seen: number[] = []; applyPatch(s, make(s, t), format, n => seen.push(n)); expect(seen.at(-1)).toBe(100); });
  it('comprobación generativa determinista: 60 casos de ampliación/reducción', () => {
    let seed = 19; const rand = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
    for (let i = 0; i < 60; i++) { const a = Uint8Array.from({ length: rand() % 400 }, () => rand() % 256), b = Uint8Array.from({ length: rand() % 500 }, () => rand() % 256); expect(applyPatch(a, make(a, b))).toEqual(b); }
  });
});
describe('errores estructurales sin desactivar checksums', () => {
  const s = bytes('ABC');
  it('cabecera desconocida', () => { const p = bps(s, s); p[0] = 0; expect(() => inspectPatch(p)).toThrow(/BPS o UPS/); });
  it('BPS SourceCopy negativo fuera de origen', () => expect(() => applyPatch(s, bps(s, s, [0x82, 0x83]))).toThrow(/SourceCopy/));
  it('BPS TargetCopy que lee el futuro', () => expect(() => applyPatch(s, bps(s, s, [0x83, 0x80]))).toThrow(/TargetCopy/));
  it('BPS lectura más allá del original', () => expect(() => applyPatch(s, bps(s, bytes('ABCDE'), [0x90]))).toThrow(/original/));
  it('BPS literal truncado', () => expect(() => applyPatch(s, bps(s, s, [0x89, 65]))).toThrow(/truncados/));
  it('BPS salida incompleta', () => expect(() => applyPatch(s, bps(s, s, []))).toThrow(/incompleto/));
  it('BPS acción que excede resultado', () => expect(() => applyPatch(s, bps(s, s, [0x94]))).toThrow(/fuera del resultado/));
  it('BPS metadatos truncados', () => { const p = bps(s, s); p[6] = 0xff; expect(() => applyPatch(s, recheck(p))).toThrow(/Metadatos/); });
  it('varint truncado', () => { const p = finish([66,80,83,49,0,0], s, s); expect(() => inspectPatch(p)).toThrow(/truncado/); });
  it('varint fuera del entero seguro', () => { const p = finish([66,80,83,49,...Array(8).fill(127),128], s, s); expect(() => inspectPatch(p)).toThrow(/rango|largo/); });
  it('no asigna un resultado mayor de 64 MiB', () => { const p = finish([66,80,83,49,...number(3),...number(MAX_ROM + 1),128], s, s); expect(() => applyPatch(s, p)).toThrow(/64 MiB/); });
  it('UPS respeta salto de un byte tras cero', () => { const a = bytes('ABCDE'), b = bytes('XBXDY'); expect(applyPatch(a, ups(a, b))).toEqual(b); });
  it('UPS crece con ceros virtuales y reduce el original', () => { const a = Uint8Array.of(1,2), b = Uint8Array.of(1,2,0,8,9); expect(applyPatch(a, ups(a,b))).toEqual(b); expect(applyPatch(b, ups(b,a))).toEqual(a); });
  it('UPS sin cambios ni registros', () => expect(applyPatch(s, ups(s,s))).toEqual(s));
  it('UPS XOR sin terminador', () => { const p = finish([85,80,83,49,131,131,128,1], s, s); expect(() => applyPatch(s,p)).toThrow(/truncado/); });
  it('UPS registro más allá del original y resultado', () => { const p = finish([85,80,83,49,131,131,132,1,0], s, s); expect(() => applyPatch(s,p)).toThrow(/fuera de rango/); });
  it('UPS cola virtual incorrecta', () => { const p = finish([85,80,83,49,131,129,129,1,0], s, bytes('A')); expect(() => applyPatch(s,p)).toThrow(/virtual/); });
  it('digest de parche cambia con un solo bit', async () => { const a = bps(s,s), b = new Uint8Array(a); b[5] ^= 1; expect(await digest(a,'SHA-256')).not.toBe(await digest(b,'SHA-256')); });
});
