import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { describe, it, expect } from 'vitest';
import { applyPatch } from '../../src/core/patch';
import { bps, ups, demoSource, demoTarget, number } from '../../scripts/fixtures';
// Unmodified MIT oracle runs in a separate context with no network, process or require.
const context = vm.createContext({ Uint8Array, Uint32Array, Int16Array, ArrayBuffer, DataView });
for (const name of ['HashCalculator.js','BinFile.js','RomPatcher.format.bps.js','RomPatcher.format.ups.js']) {
  vm.runInContext(await readFile(`tests/vendor/rompatcher/${name}`,'utf8'), context, {filename:name});
}
const { BinFile, BPS, UPS } = vm.runInContext('({BinFile, BPS, UPS})',context);
describe('interoperabilidad con RomPatcher.js MIT fijado por commit',()=>{
  it.each([false,true])('aplica BPS creados por el motor independiente (delta=%s)',delta=>{
    for(let i=1;i<=25;i++) {
      const source=Uint8Array.from({length:350+i},(_,n)=>(n*17)%251);
      const target=new Uint8Array(source.length+120);target.set(source);target.set(source.subarray(30,80),15);target.fill(65,100,180);target.fill(i,350);
      const reference=BPS.buildFromRoms(new BinFile(source),new BinFile(target),delta).export('sample')._u8array;
      expect(applyPatch(source,new Uint8Array(reference))).toEqual(target);
    }
  });
  it('el motor independiente aplica nuestros BPS y UPS',()=>{
    for(const [Reference,make] of [[BPS,bps],[UPS,ups]] as const){
      const patch=make(demoSource,demoTarget), decoded=Reference.fromFile(new BinFile(patch));
      expect(new Uint8Array(decoded.apply(new BinFile(demoSource),true)._u8array)).toEqual(demoTarget);
    }
  });
  it('aplica UPS generados por el motor independiente',()=>{
    for(let i=1;i<=25;i++) {
      const source=new Uint8Array(150+i),target=Uint8Array.from({length:300+i},(_,n)=>(n+i)%256);
      const reference=UPS.buildFromRoms(new BinFile(source),new BinFile(target)).export('sample')._u8array;
      expect(applyPatch(source,new Uint8Array(reference))).toEqual(target);
    }
  });
  it('ambos motores resuelven igual TargetCopy solapado y negativo',()=>{
    const s=Uint8Array.of(0),t=new TextEncoder().encode('ABABABABAB');
    const actions=[...number(5),65,66,...number(19),...number(0),...number(11),...number(5)];
    const patch=bps(s,t,actions);
    expect(applyPatch(s,patch)).toEqual(new Uint8Array(BPS.fromFile(new BinFile(patch)).apply(new BinFile(s),true)._u8array));
  });
});
