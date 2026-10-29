'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{Model,parseHeroic}=require('../src/zones.js');
const zones=['elwynn','duskwood','wsg','ungoro','ab','feralas','arena','sm','av','brm','aq','naxx'];
const fixture=()=>['pick|8|5|1|sm|Tester|0,0,0,0,0|1','open|8|av','open|1|duskwood','beat|8|elwynn,sm','beat|1|elwynn','marks|8|445','ach|talents:1','hero|8|5|1|0,0,0,0,0','talent|8|1000000|imp_fireball:5','future|keep|this',''];
test('visiting classes does not change the save or draft fingerprint',()=>{
 const source=fixture(),m=new Model(source,zones);for(const id of ['8','1','9'])m.state(id);assert.equal(m.snapshot().fingerprint,'[]');assert.deepEqual(m.applyTo(source.slice()),source);m.verify(source);
});
test('heroic ranks use a class-specific colon-separated record and preserve other data',()=>{
 const source=fixture(),m=new Model(source,zones);m.setHeroic('8','sm',3);const out=m.applyTo(source.slice());assert.ok(out.includes('hbeat|8|sm:3'));assert.ok(out.includes('beat|1|elwynn'));assert.ok(out.includes('open|8|av'));assert.ok(out.includes('marks|8|445'));assert.equal(out.at(-1),'');m.verify(out);assert.equal(m.snapshot().changes[0].heroic,1);
});
test('a heroic clear also adds normal clearance for only that zone and class',()=>{
 const source=fixture(),m=new Model(source,zones);m.setHeroic('8','naxx',5);const out=m.applyTo(source.slice());assert.ok(out.includes('beat|8|elwynn,sm,naxx'));assert.ok(out.includes('hbeat|8|naxx:5'));assert.ok(out.includes('beat|1|elwynn'));
});
test('downgrading heroic preserves normal, while removing normal clears its heroic record',()=>{
 const source=fixture();source.splice(-1,0,'hbeat|8|elwynn:2,sm:5');const m=new Model(source,zones);m.setHeroic('8','sm',0);let out=m.applyTo(source.slice());assert.ok(out.includes('beat|8|elwynn,sm'));assert.ok(out.includes('hbeat|8|elwynn:2'));m.setNormal('8','elwynn',false);out=m.applyTo(source.slice());assert.ok(!out.some(l=>l.startsWith('hbeat|8|')));assert.ok(out.includes('beat|8|sm'));m.verify(out);
});
test('bulk ranks apply only to known normal-cleared maps and keep opaque future data',()=>{
 const source=fixture();source.splice(-1,0,'hbeat|8|future_map:06,sm:02');const m=new Model(source,zones);m.setClearedDifficulty('8',3);let out=m.applyTo(source.slice());assert.ok(out.includes('hbeat|8|future_map:06,sm:3,elwynn:3'));m.setClearedDifficulty('8',0);out=m.applyTo(source.slice());assert.ok(out.includes('hbeat|8|future_map:06'));m.verify(out);
});
test('unknown imported ranks remain untouched when another map is edited',()=>{
 const source=fixture();source.splice(-1,0,'hbeat|8|sm:6');const m=new Model(source,zones);m.setHeroic('8','elwynn',1);assert.ok(m.applyTo(source.slice()).includes('hbeat|8|sm:6,elwynn:1'));
});
test('invalid ranks, unsupported zones and uninitialized classes cannot create edits',()=>{
 for(const raw of [-1,6,'1.5','',NaN,'1e0']){const m=new Model(fixture(),zones);assert.throws(()=>m.setHeroic('8','sm',raw));assert.equal(m.snapshot().fingerprint,'[]')}
 const m=new Model(fixture(),zones);assert.throws(()=>m.setHeroic('9','sm',1),/not initialized/);assert.throws(()=>m.setHeroic('8','future_map',1),/Unsupported/);assert.throws(()=>m.setHeroic('6','sm',1),/Unsupported/);
});
test('duplicate or malformed records are not silently merged',()=>{
 assert.throws(()=>parseHeroic('hbeat|8|sm:1,sm:3'));assert.throws(()=>parseHeroic('hbeat|8|sm:no'));assert.throws(()=>parseHeroic('hbeat|8|sm:0'));
 const source=fixture();source.splice(-1,0,'hbeat|8|sm:1','hbeat|8|sm:2');const m=new Model(source,zones);assert.throws(()=>m.state('8'),/Duplicate/);m.setHeroic('1','elwynn',2);const out=m.applyTo(source.slice());assert.equal(out.filter(l=>l.startsWith('hbeat|8|')).length,2);m.verify(out);
});
test('verification catches unrelated heroic or normal record changes',()=>{
 const source=fixture(),m=new Model(source,zones);m.setHeroic('8','sm',4);const out=m.applyTo(source.slice());assert.throws(()=>m.verify(out.map(l=>l==='beat|1|elwynn'?'beat|1|naxx':l)));assert.throws(()=>m.verify(out.map(l=>l==='hbeat|8|sm:4'?'hbeat|8|sm:5':l)));
});
test('legacy numeric unlocks advance without changing modern open records',()=>{
 const source=fixture();source.splice(-1,0,'unlock|8|2');const m=new Model(source,zones);m.setHeroic('8','naxx',5);const out=m.applyTo(source.slice());assert.ok(out.includes('unlock|8|12'));assert.ok(out.includes('open|8|av'));m.verify(out);
});
test('restoring the imported levels restores the exact original line',()=>{
 const source=fixture();source.splice(-1,0,'hbeat|8|sm:03,elwynn:1');const m=new Model(source,zones);m.setHeroic('8','sm',5);m.setHeroic('8','sm',3);assert.equal(m.snapshot().fingerprint,'[]');assert.deepEqual(m.applyTo(source.slice()),source);
});
