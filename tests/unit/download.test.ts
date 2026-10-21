import { describe, it, expect, vi, afterEach } from 'vitest';
import { downloadPatch } from '../../src/core/download';
import { MAX_PATCH } from '../../src/core/patch';
const path = `patches/${'a'.repeat(64)}.bps`, base = 'https://example.test/patcher/';
afterEach(() => vi.unstubAllGlobals());
describe('descarga local y fallos de red', () => {
  it('solo solicita el parche y omite credenciales', async () => { const f = vi.fn().mockResolvedValue(new Response(Uint8Array.of(1,2,3))); vi.stubGlobal('fetch',f); expect(await downloadPatch(path,base)).toEqual(Uint8Array.of(1,2,3)); expect(f.mock.calls[0][0].href).toBe(base+path); expect(f.mock.calls[0][1]).toMatchObject({credentials:'omit',redirect:'error'}); });
  it.each([404,429,500])('explica HTTP %i', async code => { vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('',{status:code}))); await expect(downloadPatch(path,base)).rejects.toThrow(`HTTP ${code}`); });
  it('rechaza URL externa y traversal antes de fetch', async () => { const f = vi.fn(); vi.stubGlobal('fetch',f); await expect(downloadPatch('https://evil.test/a',base)).rejects.toThrow(/Ruta/); await expect(downloadPatch('../a.bps',base)).rejects.toThrow(/Ruta/); expect(f).not.toHaveBeenCalled(); });
  it('propaga desconexión', async () => { vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new TypeError('Network error'))); await expect(downloadPatch(path,base)).rejects.toThrow(/Network/); });
  it('rechaza Content-Length excesivo', async () => { vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('x',{headers:{'Content-Length':String(MAX_PATCH+1)}}))); await expect(downloadPatch(path,base)).rejects.toThrow(/40 MiB/); });
  it('aplica límite también sin Content-Length', async () => { vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(new ReadableStream({start(c){c.enqueue(new Uint8Array(MAX_PATCH+1));c.close();}})))); await expect(downloadPatch(path,base)).rejects.toThrow(/40 MiB/); });
  it('transmite cancelación', async () => { const controller = new AbortController(); controller.abort(); vi.stubGlobal('fetch',vi.fn().mockImplementation((_url,options)=>{ if(options.signal.aborted) throw new DOMException('cancelled','AbortError'); })); await expect(downloadPatch(path,base,controller.signal)).rejects.toThrow(/cancelled/); });
});
