import { crc32 } from './hash';
export const MAX_ROM = 64 * 1024 * 1024;
export const MAX_PATCH = 40 * 1024 * 1024;
export type Format = 'bps' | 'ups';
class Reader {
  pos = 4;
  end: number;
  constructor(readonly bytes: Uint8Array) { this.end = bytes.length - 12; }
  byte() {
    if (this.pos >= this.end) throw new Error('Parche truncado: faltan datos.');
    return this.bytes[this.pos++];
  }
  number() {
    let value = 0, shift = 1;
    for (let i = 0; i < 8; i++) {
      const b = this.byte(); value += (b & 127) * shift;
      if (!Number.isSafeInteger(value)) throw new Error('Entero fuera de rango en el parche.');
      if (b & 128) return value;
      shift *= 128; value += shift;
    }
    throw new Error('Entero demasiado largo en el parche.');
  }
}
function u32(p: Uint8Array, offset: number) {
  return new DataView(p.buffer, p.byteOffset, p.byteLength).getUint32(offset, true);
}
export function inspectPatch(patch: Uint8Array) {
  if (patch.length < 18 || patch.length > MAX_PATCH) throw new Error('Tamaño de parche no permitido.');
  const magic = String.fromCharCode(...patch.subarray(0, 4));
  if (magic !== 'BPS1' && magic !== 'UPS1') throw new Error('El archivo no es un parche BPS o UPS.');
  if (crc32(patch.subarray(0, -4)) !== u32(patch, patch.length - 4)) throw new Error('CRC32 del parche incorrecto: archivo dañado.');
  const reader = new Reader(patch), sourceSize = reader.number(), targetSize = reader.number();
  if (sourceSize > MAX_ROM || targetSize > MAX_ROM) throw new Error('Esta versión admite ROMs de hasta 64 MiB.');
  return { format: magic === 'BPS1' ? 'bps' as const : 'ups' as const, sourceSize, targetSize,
    sourceCrc: u32(patch, patch.length - 12), targetCrc: u32(patch, patch.length - 8), reader };
}
export function applyPatch(source: Uint8Array, patch: Uint8Array, expectedFormat?: Format, progress: (n: number) => void = () => {}) {
  const h = inspectPatch(patch), r = h.reader;
  if (expectedFormat && h.format !== expectedFormat) throw new Error('El formato no coincide con el catálogo.');
  if (source.length !== h.sourceSize) throw new Error('Tamaño de ROM incompatible.');
  if (crc32(source) !== h.sourceCrc) throw new Error('CRC32 de la ROM incompatible.');
  const target = new Uint8Array(h.targetSize);
  let pos = 0, last = -1;
  const report = () => { const n = Math.floor(r.pos / r.end * 100); if (n !== last) { last = n; progress(n); } };
  if (h.format === 'bps') {
    const metadataSize = r.number();
    if (metadataSize > r.end - r.pos) throw new Error('Metadatos BPS truncados.');
    r.pos += metadataSize;
    let sourceRelative = 0, targetRelative = 0;
    while (r.pos < r.end) {
      const command = r.number(), action = command % 4, length = Math.floor(command / 4) + 1;
      if (length > target.length - pos) throw new Error('Acción BPS fuera del resultado.');
      if (action === 0) {
        if (length > source.length - pos) throw new Error('Lectura BPS fuera del original.');
        target.set(source.subarray(pos, pos + length), pos); pos += length;
      } else if (action === 1) {
        if (length > r.end - r.pos) throw new Error('Datos BPS truncados.');
        target.set(patch.subarray(r.pos, r.pos + length), pos); pos += length; r.pos += length;
      } else {
        const offset = r.number(), delta = Math.floor(offset / 2) * (offset % 2 ? -1 : 1);
        if (action === 2) {
          sourceRelative += delta;
          if (sourceRelative < 0 || length > source.length - sourceRelative) throw new Error('SourceCopy BPS fuera de rango.');
          target.set(source.subarray(sourceRelative, sourceRelative + length), pos);
          sourceRelative += length; pos += length;
        } else {
          targetRelative += delta;
          if (targetRelative < 0 || targetRelative >= pos) throw new Error('TargetCopy BPS lee datos no escritos.');
          // Byte-wise copy is required: BPS allows overlapping repetition.
          for (let i = 0; i < length; i++) target[pos++] = target[targetRelative++];
        }
      }
      report();
    }
    if (pos !== target.length) throw new Error('Resultado BPS incompleto.');
  } else {
    target.set(source.subarray(0, target.length));
    const virtualSize = Math.max(source.length, target.length);
    while (r.pos < r.end) {
      pos += r.number();
      if (pos >= virtualSize) throw new Error('Desplazamiento UPS fuera de rango.');
      let xor: number;
      while ((xor = r.byte()) !== 0) {
        if (pos >= virtualSize) throw new Error('Datos UPS fuera de rango.');
        const value = (source[pos] ?? 0) ^ xor;
        if (pos < target.length) target[pos] = value;
        else if (value !== 0) throw new Error('Cola virtual UPS no nula.');
        pos++;
      }
      pos++; report();
    }
  }
  if (crc32(target) !== h.targetCrc) throw new Error('CRC32 del resultado incorrecto.');
  progress(100);
  return target;
}
