(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.ASResources=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const MAX_NUMBER=2147483647;
  function integer(raw,label,max=MAX_NUMBER){
    const text=String(raw);
    if(!/^\d+$/.test(text))throw Error(label+'必须是非负整数');
    const value=Number(text);
    if(!Number.isSafeInteger(value)||value>max)throw Error(label+'不能超过 '+max);
    return value;
  }
  function pairs(raw,separator){
    return raw?raw.split(',').filter(Boolean).map(token=>{
      const at=token.lastIndexOf(separator);
      if(at<1)throw Error('无法识别记录：'+token);
      return [token.slice(0,at),token.slice(at+1)];
    }):[];
  }
  class Model{
    constructor(lines,catalog){
      this.original=lines.slice();this.catalog=catalog;
      this.achievements=new Map(catalog.achievements.map(a=>[a.id,a]));
      this.perks=new Map(catalog.perks.map(p=>[p.id,p]));
      this.patches=new Map();this.errors=new Map();this.dates=new Map();
    }
    originalRecord(key){
      const found=this.original.filter(line=>line.startsWith(key+'|'));
      if(found.length>1)throw Error('重复记录 '+key+'，请先检查存档');
      return found[0]??null;
    }
    record(key){return this.patches.has(key)?this.patches.get(key):this.originalRecord(key)}
    payload(key){const line=this.record(key);return line===null?'':line.slice(key.length+1)}
    patch(key,line){
      const original=this.originalRecord(key);
      if(line===original||(original===null&&line===key+'|'))this.patches.delete(key);
      else this.patches.set(key,line);
    }
    mark(classId){
      if(!/^\d+$/.test(String(classId)))throw Error('无效职业');
      const raw=this.payload('marks|'+classId);
      return raw===''?null:integer(raw,'印记数量');
    }
    setMarks(classId,raw){
      const key='marks|'+classId;
      try{
        if(!/^\d+$/.test(String(classId)))throw Error('无效职业');
        const value=integer(raw,'印记数量');
        this.patch(key,key+'|'+value);this.errors.delete(key);
      }catch(error){this.errors.set(key,error.message);throw error}
    }
    earned(){return new Set(this.payload('ach').split(',').filter(Boolean))}
    ranks(){return new Map(pairs(this.payload('perk'),':').map(([id,rank])=>[id,integer(rank,'强化等级')]))}
    setAchievement(id,on,now=Math.floor(Date.now()/1000)){
      const source=new Set((this.originalRecord('ach')||'ach|').slice(4).split(',').filter(Boolean));
      if(!this.achievements.has(id)&&!source.has(id))throw Error('未知成就 ID：'+id);
      const earned=this.earned();if(earned.has(id)===on)return;
      if(on)earned.add(id);else earned.delete(id);
      const sourceOrder=[...source].filter(key=>earned.has(key));
      const added=[...earned].filter(key=>!source.has(key)).sort();
      // Returning to the imported set restores its original ordering verbatim.
      const ach=sourceOrder.concat(added);
      const sourceDates=pairs((this.originalRecord('achat')||'achat|').slice(6),'=');
      const dates=sourceDates.filter(([key])=>!source.has(key)||earned.has(key));
      const existing=new Set(dates.map(([key])=>key));
      for(const key of added){
        if(existing.has(key))continue;
        if(!this.dates.has(key))this.dates.set(key,integer(now,'成就时间',Number.MAX_SAFE_INTEGER));
        dates.push([key,String(this.dates.get(key))]);
      }
      this.patch('ach','ach|'+ach.join(','));
      this.patch('achat','achat|'+dates.map(pair=>pair.join('=')).join(','));
    }
    setPerk(id,raw){
      const key='perk:'+id;
      try{
        const definition=this.perks.get(id),source=pairs((this.originalRecord('perk')||'perk|').slice(5),':');
        const rank=integer(raw,'强化等级',definition?definition.costs.length:255);
        if(!definition&&!(rank===0&&source.some(([key])=>key===id)))throw Error('未知强化：'+id);
        const ranks=this.ranks();if(rank)ranks.set(id,rank);else ranks.delete(id);
        const ordered=source.filter(([key])=>ranks.has(key)).map(([key])=>[key,ranks.get(key)]);
        for(const entry of [...ranks].filter(([key])=>!source.some(([id])=>id===key)).sort(([a],[b])=>a.localeCompare(b)))ordered.push(entry);
        this.patch('perk','perk|'+ordered.map(pair=>pair.join(':')).join(','));this.errors.delete(key);
      }catch(error){this.errors.set(key,error.message);throw error}
    }
    balance(){
      let earned=0,spent=0;const unknown=[];
      for(const id of this.earned()){
        const a=this.achievements.get(id);if(a)earned+=a.points;else unknown.push('成就 '+id);
      }
      for(const [id,rank] of this.ranks()){
        const p=this.perks.get(id);
        if(!p||rank>p.costs.length){unknown.push('强化 '+id+' ('+rank+')');continue}
        spent+=p.costs.slice(0,rank).reduce((sum,n)=>sum+n,0);
      }
      // Purchased cosmetics consume points too. Until their version-specific
      // costs are known, do not advertise a complete balance or target solver.
      if(this.payload('tabard'))unknown.push('已购买战袍的费用');
      if(this.payload('races'))unknown.push('已解锁种族的费用');
      const maximum=[...this.achievements.values()].reduce((sum,a)=>sum+a.points,0)-spent;
      return {earned,spent,available:earned-spent,maximum,complete:unknown.length===0,unknown};
    }
    setAvailable(raw,now){
      const target=integer(raw,'目标成就点'),balance=this.balance();
      if(!balance.complete)throw Error('存在未知奖励或消费项，请逐项编辑成就/强化');
      const delta=target-balance.available;if(!delta)return [];
      const adding=delta>0,earned=this.earned(),wanted=Math.abs(delta);
      const candidates=[...this.achievements.values()].filter(a=>earned.has(a.id)!==adding);
      const total=candidates.reduce((sum,a)=>sum+a.points,0);
      if(wanted>total)throw Error('目标超出可调整范围，当前最多可用 '+balance.maximum+' 点');
      // Bounded subset sum; every real achievement can contribute only once.
      const choices=new Map([[0,[]]]);
      for(const a of candidates){
        for(const [sum,ids] of [...choices].sort(([a],[b])=>b-a)){
          const next=sum+a.points;
          if(next>wanted)continue;
          const old=choices.get(next);
          if(!old||old.length>ids.length+1)choices.set(next,ids.concat(a.id));
        }
      }
      let selected=choices.get(wanted);
      if(!selected){
        // Some five-point changes require both adding and removing rewards.
        const goal=target+balance.spent,states=new Map([[balance.earned,[]]]);
        const limit=[...this.achievements.values()].reduce((sum,a)=>sum+a.points,0);
        for(const a of this.achievements.values()){
          const change=earned.has(a.id)?-a.points:a.points;
          for(const [sum,ids] of [...states]){
            const next=sum+change;if(next<0||next>limit)continue;
            const old=states.get(next);
            if(!old||old.length>ids.length+1)states.set(next,ids.concat(a.id));
          }
        }
        selected=states.get(goal);
      }
      if(!selected)throw Error('无法精确凑出该点数；请尝试以 5 或 10 点为间隔调整');
      for(const id of selected)this.setAchievement(id,!earned.has(id),now);
      return selected;
    }
    restore(scope='all'){
      for(const key of [...this.patches.keys()])if(scope==='all'||(scope==='marks'?key.startsWith('marks|'):['ach','achat','perk'].includes(key)))this.patches.delete(key);
      for(const key of [...this.errors.keys()])if(scope==='all'||(scope==='marks'?key.startsWith('marks|'):key.startsWith('perk:')))this.errors.delete(key);
      if(scope!=='marks')this.dates.clear();
    }
    assertValid(){if(this.errors.size)throw Error([...this.errors.values()].join('；'))}
    applyTo(lines){
      this.assertValid();
      for(const [key,line] of this.patches){
        const positions=[];lines.forEach((raw,i)=>{if(raw.startsWith(key+'|'))positions.push(i)});
        if(positions.length>1)throw Error('导出存在重复记录 '+key);
        if(positions.length)lines[positions[0]]=line;
        else lines.splice(lines.at(-1)===''?lines.length-1:lines.length,0,line);
      }
      return lines;
    }
    withoutChanges(lines){return lines.filter(line=>![...this.patches.keys()].some(key=>line.startsWith(key+'|')))}
    verify(lines){
      const expected=this.applyTo(this.original.slice());
      const managed=line=>/^(marks|ach|achat|perk)\|/.test(line);
      if(JSON.stringify(expected.filter(managed))!==JSON.stringify(lines.filter(managed)))throw Error('成就/印记/强化导出校验失败');
    }
    snapshot(){
      return {changed:this.patches.size>0,marksChanged:[...this.patches.keys()].filter(k=>k.startsWith('marks|')).length,
        achievementsChanged:this.patches.has('ach'),perksChanged:this.patches.has('perk'),errors:[...this.errors.values()],
        fingerprint:JSON.stringify([[...this.patches].sort(([a],[b])=>a.localeCompare(b)),[...this.errors].sort(([a],[b])=>a.localeCompare(b))])};
    }
  }
  return {Model,MAX_NUMBER};
});
