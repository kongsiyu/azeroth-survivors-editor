'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{pathToFileURL}=require('node:url');
const equipment=require('../src/equipment.js'),{createCodec}=require('../tools/analyze-save.cjs');
let runtime=process.env.PLAYWRIGHT_MODULE||'playwright';try{require.resolve(runtime)}catch{runtime=path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')}
const {chromium}=require(runtime),sample=process.argv[2];if(!sample)throw Error('Usage: node tests/equipment.browser.cjs <sample.sav>');
(async()=>{
 const work=fs.mkdtempSync(path.join(os.tmpdir(),'azeroth-equipment-')),decode=createCodec(),source=decode(fs.readFileSync(sample,'utf8'));
 const fixture=source.split(/\r?\n/).map(line=>line.startsWith('items|')?'items|108040,108060,999999':line).join('\n');
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({locale:'zh-CN',acceptDownloads:true,viewport:{width:1440,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
  const raw=await page.evaluate(plain=>G(plain),fixture);
  await page.locator('#file').setInputFiles({name:'equipment-test.sav',mimeType:'text/plain',buffer:Buffer.from(raw)});
  await page.waitForFunction(()=>__AS_EDITOR_BRIDGE?.resources()?.mark('8')===445);
  await page.locator('.cls[data-cls="8"]').click();await page.waitForFunction(()=>document.getElementById('am-class').value==='8');
  assert.equal(await page.locator('#am-matrix tbody tr').count(),7);assert.equal(await page.locator('#am-matrix .am-gear').count(),63);
  assert.equal(await page.locator('tr[data-tier="legendary"] .am-gear').first().getAttribute('data-id'),'108040');
  assert.equal(await page.locator('tr[data-tier="pvp1"] .am-gear').first().getAttribute('data-id'),'108050');
  assert.equal(await page.locator('tr[data-tier="pvp2"] .am-gear').first().getAttribute('data-id'),'108060');
  assert.ok((await page.locator('.am-gear[data-id="108040"]').getAttribute('class')).includes('on'));
  assert.ok(!(await page.locator('.am-gear[data-id="108050"]').getAttribute('class')).includes('on'));
  assert.ok((await page.locator('.am-gear[data-id="108060"]').getAttribute('class')).includes('on'));
  assert.ok((await page.locator('#am-count').textContent()).includes('581'));
  async function exportItems(name){
    const promise=page.waitForEvent('download');await page.locator('#am-export').click();const d=await promise,file=path.join(work,name);await d.saveAs(file);
    const lines=decode(fs.readFileSync(file,'utf8')).split(/\r?\n/),known=new Set(lines.find(line=>line.startsWith('items|')).slice(6).split(','));
    assert.deepEqual(lines.filter(l=>!/^(items|talent)\|/.test(l)),fixture.split(/\r?\n/).filter(l=>!/^(items|talent)\|/.test(l)));
    return {known,file};
  }
  await page.locator('.am-gear[data-id="108050"]').click();let exported=await exportItems('pvp-i.sav');assert.deepEqual([...exported.known].sort(),['108040','108050','108060','999999']);
  await page.locator('.am-gear[data-id="108040"]').click();exported=await exportItems('legendary-removed.sav');assert.deepEqual([...exported.known].sort(),['108050','108060','999999']);
  await page.locator('#file').setInputFiles(exported.file);await page.waitForFunction(()=>__AS_EDITOR_BRIDGE.snapshot().importKey.includes('items|108050,108060,999999'));await page.locator('.cls[data-cls="8"]').click();await page.waitForFunction(()=>document.getElementById('am-class').value==='8');
  assert.ok(!(await page.locator('.am-gear[data-id="108040"]').getAttribute('class')).includes('on'));assert.ok((await page.locator('.am-gear[data-id="108060"]').getAttribute('class')).includes('on'));
  await page.locator('#am-class-all').click();exported=await exportItems('class-all.sav');for(const id of equipment.classIds('8'))assert.ok(exported.known.has(id));assert.equal(exported.known.size,64);
  await page.locator('#am-reset').click();assert.equal(await page.locator('#am-matrix .am-gear.on').count(),2);
  await page.locator('#am-all').click();await page.waitForFunction(()=>document.getElementById('as15-modal').open);assert.ok((await page.locator('#as15-modal h2').textContent()).includes('581'));await page.locator('#as15-confirm-unlock').click();exported=await exportItems('all-581.sav');for(const id of equipment.allIds())assert.ok(exported.known.has(id));assert.equal(exported.known.size,582);
  await page.locator('#am-reset').click();await page.locator('#as-language').selectOption('en');await page.evaluate(()=>ASI18n.refresh());
  for(const [tier,label] of [['legendary','Legendary'],['pvp1','PvP (Alliance)'],['pvp2','PvP (Horde)']])assert.ok((await page.locator('tr[data-tier="'+tier+'"] .am-rarity').textContent()).startsWith(label));
  for(const query of ['PvP','Legendary','传说']){await page.locator('#as15-equipment-search').fill(query);await page.waitForFunction(expected=>document.querySelectorAll('#as15-focused-grid .as15-item-card').length===expected,query==='PvP'?18:9);const text=await page.locator('#as15-focused-grid').textContent();if(query==='PvP'){assert.ok(text.includes('PvP (Alliance)'));assert.ok(text.includes('PvP (Horde)'));assert.ok(!text.includes('Legendary'));}else assert.ok(!text.includes('PvP'));}
  await page.locator('#as15-equipment-search').fill('');await page.locator('#as-language').selectOption('zh-CN');await page.evaluate(()=>ASI18n.refresh());
  await page.locator('#am-matrix').evaluate(el=>scrollTo(0,el.offsetTop-120));await page.screenshot({path:path.join(work,'equipment-desktop.png')});
  await page.setViewportSize({width:390,height:844});await page.locator('#armory-merge').evaluate(el=>scrollTo(0,el.offsetTop-110));await page.screenshot({path:path.join(work,'equipment-mobile.png')});
  const size=await page.evaluate(()=>({page:document.documentElement.scrollWidth,viewport:innerWidth}));assert.ok(size.page<=size.viewport+1,JSON.stringify(size));assert.deepEqual(errors,[]);
  console.log('PASS: all seven rows, imported Legendary/PvP states, independent toggles, exact exported IDs and reimport, 581-item bulk unlock, 63-item class unlock, unknown item preservation, bilingual search, desktop/mobile layouts.');console.log('Artifacts: '+work);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
