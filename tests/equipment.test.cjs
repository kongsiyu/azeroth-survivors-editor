'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const equipment=require('../src/equipment.js');
test('display labels map to actual saved tier digits, independently of row position',()=>{
 assert.deepEqual(equipment.TIERS.map(tier=>[tier.name,tier.code]),[['Common',0],['Uncommon',1],['Rare',2],['Epic',3],['PvP (Alliance)',5],['PvP (Horde)',6],['Legendary',4]]);
 const id=name=>equipment.itemId('8',0,equipment.TIERS.find(tier=>tier.name===name).code);
 assert.equal(id('Legendary'),'108040');assert.equal(id('PvP (Alliance)'),'108050');assert.equal(id('PvP (Horde)'),'108060');
});
test('all classes include both distinct PvP sets in every supported slot',()=>{
 for(const cls of equipment.CLASSES){const ids=equipment.classIds(cls);assert.equal(new Set(ids).size,ids.length);assert.equal(ids.length,equipment.slots(cls)*7);
  for(let slot=0;slot<equipment.slots(cls);slot++)for(const tier of [4,5,6])assert.ok(ids.includes(String(100000+Number(cls)*1000+slot*100+tier*10)));
 }
 assert.equal(equipment.total,581);assert.equal(equipment.allIds().length,581);assert.equal(new Set(equipment.allIds()).size,581);
});
test('the new catalog keeps every legacy ID and adds only the missing tier-6 items',()=>{
 const previous=equipment.CLASSES.flatMap(cls=>Array.from({length:6},(_,tier)=>Array.from({length:equipment.slots(cls)},(_,slot)=>String(100000+Number(cls)*1000+slot*100+tier*10))).flat());
 const next=new Set(equipment.allIds());assert.equal(previous.length,498);for(const id of previous)assert.ok(next.has(id));
 const added=[...next].filter(id=>!previous.includes(id));assert.equal(added.length,83);assert.ok(added.every(id=>Number(id)%100===60));
});
test('invalid slots, tiers and classes are rejected',()=>{
 for(const args of [['8',9,5],['4',10,6],['8',0,7],['6',0,4],['8',-1,5]])assert.throws(()=>equipment.itemId(...args));
});
