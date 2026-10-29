(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.ASZones=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const MAX_HEROIC=5,CLASSES=['1','2','3','4','5','7','8','9','11'];
  const sameSet=(a,b)=>a.size===b.size&&[...a].every(value=>b.has(value));
  const sameMap=(a,b)=>a.size===b.size&&[...a].every(([key,value])=>b.get(key)===value);
  function parseHeroic(line){
    const entries=new Map(),raw=new Map();if(!line)return {entries,raw};
    const fields=line.split('|');if(fields.length!==3)throw Error('Unrecognized heroic progression record');
    for(const token of fields[2].split(',').filter(Boolean)){
      const match=/^([a-z0-9_]+):(\d+)$/.exec(token);
      if(!match||entries.has(match[1]))throw Error('Invalid or duplicate heroic zone entry: '+token);
      const value=Number(match[2]);
      // Unknown future ranks survive edits to other zones; new values use 0..5.
      if(!Number.isSafeInteger(value)||value<1||value>255)throw Error('Unrecognized imported heroic rank: '+token);
      entries.set(match[1],value);raw.set(match[1],token);
    }
    return {entries,raw};
  }
  class Model{
    constructor(lines,zones){this.original=lines.slice();this.zones=zones.map(z=>Array.isArray(z)?z[1]:z);this.states={}}
    record(kind,cls,lines=this.original){
      const found=lines.filter(line=>line.startsWith(kind+'|'+cls+'|'));
      if(found.length>1)throw Error('Duplicate '+kind+' record for class '+cls);
      return found[0]??null;
    }
    list(kind,cls){const line=this.record(kind,cls);return new Set(line?line.split('|').slice(2).join('|').split(',').filter(Boolean):[])}
    initialized(cls){return ['open','beat','unlock','hbeat'].some(kind=>this.original.some(line=>line.startsWith(kind+'|'+cls+'|')))}
    state(cls){
      cls=String(cls);if(!CLASSES.includes(cls))throw Error('Unsupported class');
      if(!this.states[cls]){
        const before=this.list('beat',cls),heroic=parseHeroic(this.record('hbeat',cls));
        this.states[cls]={beat:new Set(before),open:this.list('open',cls),heroic:new Map(heroic.entries),before,priorHeroic:heroic.entries,rawHeroic:heroic.raw};
      }
      return this.states[cls];
    }
    editable(cls,zone){
      const state=this.state(cls);
      if(!this.initialized(cls))throw Error('Zone progression is not initialized for this class');
      if(!this.zones.includes(zone))throw Error('Unsupported zone');
      return state;
    }
    setNormal(cls,zone,on){const state=this.editable(cls,zone);if(on)state.beat.add(zone);else{state.beat.delete(zone);state.heroic.delete(zone)}}
    setHeroic(cls,zone,raw){
      if(!/^\d+$/.test(String(raw)))throw Error('Heroic rank must be an integer from 0 to 5');
      const rank=Number(raw);if(rank<0||rank>MAX_HEROIC)throw Error('Heroic rank must be an integer from 0 to 5');
      const state=this.editable(cls,zone);
      if(rank){state.heroic.set(zone,rank);state.beat.add(zone)}else state.heroic.delete(zone);
    }
    setClearedDifficulty(cls,raw){
      const state=this.state(cls);if(!this.initialized(cls))throw Error('Zone progression is not initialized for this class');
      const known=[...state.beat].filter(zone=>this.zones.includes(zone));
      if(!known.length)throw Error('Clear at least one normal zone before applying a bulk difficulty');
      // Validate first so invalid input cannot leave a partially edited draft.
      if(!/^\d+$/.test(String(raw))||Number(raw)>MAX_HEROIC)throw Error('Heroic rank must be an integer from 0 to 5');
      for(const zone of known)this.setHeroic(cls,zone,raw);
    }
    classChanged(cls){const s=this.state(cls);return !sameSet(s.before,s.beat)||!sameMap(s.priorHeroic,s.heroic)}
    sortZones(a,b){const ai=this.zones.indexOf(a),bi=this.zones.indexOf(b);return (ai<0?999:ai)-(bi<0?999:bi)||a.localeCompare(b)}
    replace(lines,kind,cls,value){
      const old=this.record(kind,cls,lines),index=old===null?-1:lines.indexOf(old);
      if(value===null){if(index>=0)lines.splice(index,1);return}
      const line=kind+'|'+cls+'|'+value;
      if(index>=0)lines[index]=line;else lines.splice(lines.at(-1)===''?lines.length-1:lines.length,0,line);
    }
    legacyUnlock(cls,beat){
      const line=this.record('unlock',cls);if(line===null)return null;
      if(!/^unlock\|\d+\|\d+$/.test(line))throw Error('Unrecognized legacy zone unlock record for class '+cls);
      const value=Number(line.split('|')[2]);
      if(value<1||value>this.zones.length)throw Error('Legacy unlock value outside known zone range for class '+cls);
      const last=this.zones.reduce((max,zone,index)=>beat.has(zone)?index:max,-1);
      return Math.max(value,Math.min(this.zones.length,last+2));
    }
    applyTo(lines){
      for(const [cls,state] of Object.entries(this.states)){
        const normalChanged=!sameSet(state.before,state.beat),heroicChanged=!sameMap(state.priorHeroic,state.heroic);
        if(!normalChanged&&!heroicChanged)continue;
        if(!this.initialized(cls))throw Error('Zone progression is not initialized for this class');
        if(normalChanged){
          this.replace(lines,'beat',cls,[...state.beat].sort(this.sortZones.bind(this)).join(','));
          const unlock=this.legacyUnlock(cls,state.beat);if(unlock!==null)this.replace(lines,'unlock',cls,String(unlock));
        }
        if(heroicChanged){
          const keys=[...state.rawHeroic.keys()].filter(key=>state.heroic.has(key));
          keys.push(...[...state.heroic.keys()].filter(key=>!state.rawHeroic.has(key)).sort(this.sortZones.bind(this)));
          const tokens=keys.map(key=>state.heroic.get(key)===state.priorHeroic.get(key)?state.rawHeroic.get(key):key+':'+state.heroic.get(key));
          this.replace(lines,'hbeat',cls,tokens.length?tokens.join(','):null);
        }
      }
      return lines;
    }
    verify(lines){
      const managed=line=>/^(beat|hbeat|unlock)\|/.test(line),expected=this.applyTo(this.original.slice());
      if(JSON.stringify(expected.filter(managed))!==JSON.stringify(lines.filter(managed)))throw Error('Normal/heroic zone verification failed');
    }
    snapshot(){
      const changes=[];
      for(const [cls,state] of Object.entries(this.states))if(this.classChanged(cls))changes.push({cls,
        added:[...state.beat].filter(key=>!state.before.has(key)).length,removed:[...state.before].filter(key=>!state.beat.has(key)).length,
        heroic:[...new Set([...state.heroic.keys(),...state.priorHeroic.keys()])].filter(key=>state.heroic.get(key)!==state.priorHeroic.get(key)).length,
        beat:[...state.beat].sort(),levels:[...state.heroic].sort(([a],[b])=>a.localeCompare(b))});
      changes.sort((a,b)=>a.cls.localeCompare(b.cls));return {changes,fingerprint:JSON.stringify(changes)};
    }
  }
  return {Model,MAX_HEROIC,parseHeroic,sameSet,sameMap};
});
