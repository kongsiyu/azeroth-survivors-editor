(()=>{
  'use strict';
  const bridge=window.__AS_EDITOR_BRIDGE,$=id=>document.getElementById(id);
  if(!bridge||!window.ASResources)return;
  const classes=[['1','战士'],['2','圣骑士'],['3','猎人'],['4','潜行者'],['5','牧师'],['7','萨满'],['8','法师'],['9','术士'],['11','德鲁伊']];
  const section=document.createElement('section');section.id='as-resources';section.className='panel as-resource-panel';
  section.innerHTML=`<div class="tag">ACCOUNT & CLASS RESOURCES · 实验性功能</div><h2>成就点与印记</h2>
    <p class="hint">成就点通过调整已完成成就计算；印记按职业保存。请在游戏中核对导入后的数值。</p>
    <div id="as-resource-empty" class="hint">导入存档后即可编辑。</div>
    <div id="as-resource-controls" hidden>
      <div class="as-resource-metrics"><div><span>已获得成就点</span><strong id="as-ap-earned">—</strong></div><div><span>强化已消费</span><strong id="as-ap-spent">—</strong></div><div><span>可用成就点（计算值）</span><strong id="as-ap-available">—</strong></div></div>
      <p id="as-ap-incomplete" class="hint" hidden></p>
      <div class="as-resource-actions"><label for="as-ap-target">目标可用成就点</label><input id="as-ap-target" type="number" min="0" max="2147483647" step="5"><button class="btn primary" type="button" id="as-ap-apply">调整成就点</button><button class="btn" type="button" id="as-ap-max">完成全部已知成就</button></div>
      <p class="hint" id="as-ap-range"></p><p class="hint">调整点数会增减成就及关联奖励。已有成就时间保留；新增成就记录当前时间。强化、统计和地图通关不会随成就自动改写。</p>
      <details class="as-resource-details"><summary>逐项编辑成就 <span id="as-ach-count"></span></summary><label class="sr-only" for="as-ach-search">搜索成就</label><input id="as-ach-search" type="search" placeholder="搜索成就名称或 ID" autocomplete="off"><div id="as-ach-list" class="as-ach-list"></div></details>
      <details class="as-resource-details"><summary>永久强化与已消费点数</summary><p class="hint">降低等级可以返还计算中的消费点数，同时会降低对应强化效果。</p><div id="as-perk-list" class="as-perk-list"></div><button type="button" class="btn" id="as-perks-refund">清空强化并返还点数</button></details>
      <div class="as-resource-actions"><button type="button" class="btn" id="as-ap-restore">恢复导入的成就与强化</button></div>
      <h3>各职业印记数量</h3><p class="hint">未建立印记记录的职业显示为空；输入后将新增该职业的记录。累计统计中的印记数保持独立。</p>
      <div id="as-marks-list" class="as-marks-list"></div><div class="as-resource-actions"><button type="button" class="btn" id="as-marks-restore">恢复导入的印记</button><span class="hint" id="as-marks-stat"></span></div>
    </div><p id="as-resource-status" class="hint" role="status" aria-live="polite"></p>`;
  $('armory-merge').before(section);
  const nav=$('as15-nav');
  if(nav){const link=document.createElement('a');link.className='as15-nav-link';link.href='#as-resources';link.dataset.part='resources';link.textContent='✦ 成就点 / 印记';nav.querySelector('a').after(link);link.addEventListener('click',()=>nav.querySelectorAll('[data-part]').forEach(a=>a.setAttribute('aria-current',String(a===link))))}
  const markInputs=new Map(),achievementInputs=new Map(),perkInputs=new Map();
  for(const [id,name] of classes){
    const label=document.createElement('label');label.className='as-mark-field';
    const caption=document.createElement('span');caption.textContent=name+' · '+id;
    const input=document.createElement('input');input.type='number';input.min='0';input.max=String(ASResources.MAX_NUMBER);input.step='1';input.placeholder='未建记录';input.id='as-marks-'+id;input.setAttribute('aria-label',name+'印记数量');
    const note=document.createElement('small');label.append(caption,input,note);$('as-marks-list').append(label);markInputs.set(id,{input,note});
    input.addEventListener('input',()=>edit(model=>model.setMarks(id,input.value),input));
  }
  let currentImport=null,lastFingerprint=null,query='';
  function message(text,error=false){$('as-resource-status').textContent=text;$('as-resource-status').dataset.error=String(error)}
  function edit(action,input){
    try{const model=bridge.resources();if(!model)return;action(model);if(input)input.setCustomValidity('');render(true);message('修改已暂存，请使用底部 Export Save 导出。')}
    catch(error){if(input)input.setCustomValidity(error.message);message(error.message,true);render(true)}
    document.dispatchEvent(new CustomEvent('as15:resources'));
  }
  function renderMetrics(){
    const model=bridge.resources();if(!model)return;
    try{
      const b=model.balance();
      $('as-ap-earned').textContent=(b.complete?'':'≥ ')+b.earned;
      $('as-ap-spent').textContent=(b.complete?'':'已知 ')+b.spent;
      $('as-ap-available').textContent=b.complete?String(b.available):'待核实';
      $('as-ap-available').dataset.negative=String(b.available<0);
      $('as-ap-incomplete').hidden=b.complete;
      $('as-ap-incomplete').textContent='未能完整计算：'+b.unknown.join('、')+'。原始记录会保留，可逐项编辑已知成就。';
      $('as-ap-apply').disabled=!b.complete;
      $('as-ap-range').textContent='当前目录全部完成后最多可用 '+b.maximum+' 点；通常以 5 或 10 点为间隔调整。规则来自 2026-10-29 官方网页客户端，与你的游戏版本是否一致待测试。';
      if(document.activeElement!==$('as-ap-target'))$('as-ap-target').value=b.complete?b.available:'';
      const count=model.earned().size;$('as-ach-count').textContent='（已完成 '+count+' 项）';
    }catch(error){message(error.message,true);$('as-ap-apply').disabled=true}
  }
  function buildLists(model){
    $('as-ach-list').replaceChildren();achievementInputs.clear();
    const all=new Map(model.achievements);
    for(const id of model.earned())if(!all.has(id))all.set(id,{id,name:'未知成就（原存档）',points:null});
    for(const a of all.values()){
      const label=document.createElement('label');label.className='as-ach-row';label.dataset.search=(a.id+' '+a.name).toLowerCase();
      const input=document.createElement('input');input.type='checkbox';input.dataset.achievement=a.id;input.setAttribute('aria-label',a.name+' '+a.id);
      const text=document.createElement('span');text.textContent=a.name;
      const small=document.createElement('small');small.textContent=a.id+' · '+(a.points===null?'点数未知':'+'+a.points+' 点');text.append(small);label.append(input,text);$('as-ach-list').append(label);achievementInputs.set(a.id,input);
      input.addEventListener('change',()=>edit(m=>m.setAchievement(a.id,input.checked)));
    }
    $('as-perk-list').replaceChildren();perkInputs.clear();
    for(const p of model.catalog.perks){
      const label=document.createElement('label');label.className='as-perk-field';
      const text=document.createElement('span');text.textContent=p.label;
      const small=document.createElement('small');small.textContent=p.id+' · 每级费用 '+p.costs.join(' / ');text.append(small);
      const select=document.createElement('select');select.dataset.perk=p.id;select.setAttribute('aria-label',p.label+'等级');
      for(let rank=0;rank<=p.costs.length;rank++)select.add(new Option(rank+' 级',rank));
      label.append(text,select);$('as-perk-list').append(label);perkInputs.set(p.id,select);
      select.addEventListener('change',()=>edit(m=>m.setPerk(p.id,select.value),select));
    }
    filterAchievements();
  }
  function filterAchievements(){for(const label of $('as-ach-list').children)label.hidden=!!query&&!label.dataset.search.includes(query)}
  function render(force=false){
    const model=bridge.resources();$('as-resource-empty').hidden=!!model;$('as-resource-controls').hidden=!model;if(!model)return;
    const imported=model!==currentImport;
    if(imported){currentImport=model;lastFingerprint=null;buildLists(model);for(const {input} of markInputs.values())input.setCustomValidity('');message('存档已载入；成就点规则与游戏版本待核对。')}
    const state=model.snapshot();if(!force&&!imported&&state.fingerprint===lastFingerprint)return;lastFingerprint=state.fingerprint;
    renderMetrics();
    const earned=model.earned(),ranks=model.ranks();
    for(const [id,input] of achievementInputs)input.checked=earned.has(id);
    for(const [id,input] of perkInputs){const rank=ranks.get(id)||0;input.value=rank;if(!input.value){input.add(new Option(rank+' 级（原存档，超出目录）',rank));input.value=rank}}
    for(const [id,{input,note}] of markInputs){
      try{const value=model.mark(id);const error=model.errors.get('marks|'+id);if((document.activeElement!==input||imported)&&!error)input.value=value===null?'':value;input.setAttribute('aria-invalid',String(!!error));input.setCustomValidity(error?(window.ASI18n?.t?ASI18n.t(error):error):'');note.textContent=error||(value===null?'输入后创建记录':'原始值 '+(model.originalRecord('marks|'+id)?.split('|')[2]??'无记录'));input.disabled=false}
      catch(error){input.disabled=true;note.textContent=error.message}
    }
    const stat=pairsStat(model.original);$('as-marks-stat').textContent='stat.marks 原始统计：'+(stat??'无记录')+'（不自动同步）';
    if(state.errors.length)message(state.errors.join('；'),true);
  }
  function pairsStat(lines){const raw=lines.find(l=>l.startsWith('stat|'));return raw?.slice(5).split(',').find(x=>x.startsWith('marks='))?.slice(6)}
  $('as-ap-apply').addEventListener('click',()=>{const target=$('as-ap-target').value;edit(m=>m.setAvailable(target))});
  $('as-ap-max').addEventListener('click',()=>edit(m=>{const now=Math.floor(Date.now()/1000);for(const id of m.achievements.keys())m.setAchievement(id,true,now)}));
  $('as-ap-restore').addEventListener('click',()=>edit(m=>m.restore('account')));
  $('as-marks-restore').addEventListener('click',()=>{for(const {input} of markInputs.values())input.setCustomValidity('');edit(m=>m.restore('marks'))});
  $('as-perks-refund').addEventListener('click',()=>edit(m=>{for(const id of m.ranks().keys())m.setPerk(id,0)}));
  $('as-ach-search').addEventListener('input',event=>{query=event.target.value.trim().toLowerCase();filterAchievements()});
  setInterval(()=>render(),500);render();
})();
