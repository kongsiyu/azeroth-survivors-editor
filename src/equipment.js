(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.ASEquipment=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  // UI position is not the save's tier digit. The game accepts tier digits
  // 0..6: 4 is Legendary, and 5/6 are Alliance and Horde PvP variants (quality enum 5).
  const TIERS=Object.freeze([
    {key:'common',code:0,name:'Common',color:'#c7c7c7',source:'Elwynn Forest / Duskwood'},
    {key:'uncommon',code:1,name:'Uncommon',color:'#49e64e',source:'Warsong Gulch / Un’Goro'},
    {key:'rare',code:2,name:'Rare',color:'#54aaff',source:'Arathi Basin / Feralas'},
    {key:'epic',code:3,name:'Epic',color:'#bf75f7',source:'Gurubashi Arena / Scarlet Monastery'},
    {key:'pvp1',code:5,name:'PvP (Alliance)',color:'#d889f7',source:'PvP Alliance set'},
    {key:'pvp2',code:6,name:'PvP (Horde)',color:'#d889f7',source:'PvP Horde set'},
    {key:'legendary',code:4,name:'Legendary',color:'#ffb32c',source:'Legendary equipment'},
  ].map(Object.freeze));
  const CLASSES=Object.freeze(['1','2','3','4','5','7','8','9','11']);
  const slots=cls=>['4','7'].includes(String(cls))?10:9;
  function itemId(cls,slot,tier){
    if(!CLASSES.includes(String(cls))||!Number.isInteger(slot)||slot<0||slot>=slots(cls)||!TIERS.some(t=>t.code===tier))throw Error('Invalid equipment class, slot or tier');
    return String(100000+Number(cls)*1000+slot*100+tier*10);
  }
  const classIds=cls=>TIERS.flatMap(tier=>Array.from({length:slots(cls)},(_,slot)=>itemId(cls,slot,tier.code)));
  const allIds=()=>CLASSES.flatMap(classIds);
  return {TIERS,CLASSES,slots,itemId,classIds,allIds,total:allIds().length};
});
