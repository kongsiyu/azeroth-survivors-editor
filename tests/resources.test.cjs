'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Model}=require('../src/resources.js');
const catalog=require('../data/resource-catalog.json');
const synthetic={achievements:[{id:'old:a',points:10},{id:'old:b',points:15},{id:'new:c',points:20},{id:'new:d',points:25}],perks:[{id:'test',costs:[5,10]}]};
function fixture(){return ['pick|8|5|1|sm|Tester|0,0,0,0,0|1','ach|old:a,old:b','achat|old:a=100','perk|test:1','marks|8|445','stat|marks=999,gold=100','future|do|not|change',''];}
test('marks are per class; stats and unknown lines stay byte-for-byte intact',()=>{
 const original=fixture(),m=new Model(original,synthetic);m.setMarks('8','1234');m.setMarks('1','0');const out=m.applyTo(original.slice());m.verify(out);
 assert.ok(out.includes('marks|8|1234'));assert.ok(out.includes('marks|1|0'));assert.ok(out.includes('stat|marks=999,gold=100'));assert.ok(out.includes('future|do|not|change'));assert.equal(out.at(-1),'');assert.deepEqual(original,fixture());
 const tampered=out.map(l=>l==='marks|8|1234'?'marks|8|12':l);assert.throws(()=>m.verify(tampered));
});
test('unmodified duplicate class records cannot be silently rewritten',()=>{
 const m=new Model(['marks|8|1','marks|8|2'],synthetic);assert.throws(()=>m.setMarks('8','3'),/重复/);
});
test('invalid marks block export until fixed or restored',()=>{
 for(const raw of ['','-1','1.5','1e6','2147483648','abc']){
  const m=new Model(fixture(),synthetic);assert.throws(()=>m.setMarks('8',raw));assert.throws(()=>m.applyTo(fixture()));m.setMarks('8','123');assert.doesNotThrow(()=>m.applyTo(fixture()));
 }
});
test('new achievements get dates, imported undated achievements stay undated, undo is exact',()=>{
 const original=fixture(),m=new Model(original,synthetic);m.setAchievement('new:c',true,200);assert.equal(m.payload('achat'),'old:a=100,new:c=200');
 m.setAchievement('old:b',false,300);m.setAchievement('old:b',true,400);assert.equal(m.payload('achat'),'old:a=100,new:c=200');
 m.setAchievement('new:c',false);assert.deepEqual(m.applyTo(original.slice()),original);assert.equal(m.snapshot().changed,false);
});
test('unknown achievements are preserved and make the calculated balance incomplete',()=>{
 const m=new Model(['ach|old:a,unknown:future','perk|test:1'],synthetic);assert.equal(m.balance().complete,false);assert.throws(()=>m.setAvailable(100));m.setAchievement('new:c',true,100);assert.ok(m.earned().has('unknown:future'));
});
test('target point solver can combine additions and removals and rejects impossible targets atomically',()=>{
 const m=new Model(fixture(),synthetic);assert.equal(m.balance().available,20);m.setAvailable(25,200);assert.equal(m.balance().available,25);m.setAvailable(5,200);assert.equal(m.balance().available,5);
 const before=m.snapshot().fingerprint;assert.throws(()=>m.setAvailable(1));assert.equal(m.snapshot().fingerprint,before);assert.throws(()=>m.setAvailable(99999));
});
test('perk costs are cumulative; account restore preserves marks and marks restore preserves account',()=>{
 const m=new Model(fixture(),synthetic);m.setMarks('8',99);m.setPerk('test',2);assert.equal(m.balance().spent,15);m.restore('marks');assert.equal(m.mark('8'),445);assert.equal(m.balance().spent,15);m.setMarks('8',100);m.restore('account');assert.equal(m.mark('8'),100);assert.equal(m.balance().spent,5);
});
test('purchased cosmetics and unknown perk ranks do not silently count as zero cost',()=>{
 const m=new Model(['ach|old:a','perk|test:9','tabard|90001'],synthetic);assert.equal(m.balance().complete,false);assert.ok(m.balance().unknown.length>=2);
});
test('catalog has unique IDs, positive rewards and sample-compatible perk costs',()=>{
 assert.equal(new Set(catalog.achievements.map(a=>a.id)).size,catalog.achievements.length);
 assert.ok(catalog.achievements.every(a=>Number.isSafeInteger(a.points)&&a.points>0));
 const m=new Model(['ach|class:hunter,class:mage,class:paladin,class:warrior,count:caches100,count:gold50k,count:gold5k,count:guardians100,count:kills100k,count:kills10k,count:runs10,feat:bare,feat:kills2500,feat:kills6000,feat:lairs,pieces:25,talents:1,talents:9,zone:ab,zone:arena,zone:duskwood,zone:elwynn,zone:feralas,zone:sm,zone:ungoro,zone:wsg','perk|banish:1,companion:1,instinct_gold:1,keen:1,leash:3,opening:1,paws:3,rerolls:1'],catalog);
 assert.equal(m.balance().earned,405);assert.equal(m.balance().spent,315);assert.equal(m.balance().available,90);m.setAvailable(95,200);assert.equal(m.balance().available,95);
});
