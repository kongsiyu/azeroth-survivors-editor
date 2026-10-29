'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{pathToFileURL}=require('node:url');
const {createCodec}=require('../tools/analyze-save.cjs');let runtime=process.env.PLAYWRIGHT_MODULE||'playwright';try{require.resolve(runtime)}catch{runtime=path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')}
const {chromium}=require(runtime),sample=process.argv[2];if(!sample)throw Error('Usage: node tests/zones.browser.cjs <sample.sav>');
(async()=>{
 const work=fs.mkdtempSync(path.join(os.tmpdir(),'azeroth-heroic-')),decode=createCodec(),before=decode(fs.readFileSync(sample,'utf8')).split(/\r?\n/),browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const context=await browser.newContext({locale:'zh-CN',acceptDownloads:true,viewport:{width:1440,height:1100}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  async function chooseClass(id){await page.locator('.cls[data-cls="'+id+'"]').click();await page.waitForFunction(value=>document.getElementById('zm-class').value===value,id)}
  await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);await page.locator('#file').setInputFiles(path.resolve(sample));
  await page.waitForFunction(()=>window.__AS_EDITOR_BRIDGE?.resources()?.mark('8')===445);
  await chooseClass('8');await page.waitForFunction(()=>document.getElementById('zm-class').value==='8');
  assert.equal(await page.locator('select[data-heroic-zone="sm"]').inputValue(),'0');
  assert.ok(await page.locator('input[data-zone="sm"]').isChecked());
  await page.locator('select[data-heroic-zone="sm"]').selectOption('3');
  assert.equal(await page.locator('select[data-heroic-zone="sm"]').inputValue(),'3');assert.ok(await page.locator('input[data-zone="sm"]').isChecked());
  let snapshot=await page.evaluate(()=>__AS_EDITOR_BRIDGE.snapshot());assert.equal(snapshot.changedZones.length,1);assert.equal(snapshot.changedZones[0].heroic,1);assert.ok(snapshot.areas.includes('Zones'));
  const fingerprint=snapshot.fingerprint;await page.locator('#as-language').selectOption('en');assert.equal(await page.evaluate(()=>__AS_EDITOR_BRIDGE.snapshot().fingerprint),fingerprint);
  const downloadPromise=page.waitForEvent('download');await page.locator('#am-export').click();const download=await downloadPromise,file=path.join(work,'mage-sm-heroic-3.sav');await download.saveAs(file);const after=decode(fs.readFileSync(file,'utf8')).split(/\r?\n/);
  assert.ok(after.includes('hbeat|8|sm:3'));
  const keep=line=>!/^(hbeat|talent)\|/.test(line);assert.deepEqual(after.filter(keep),before.filter(keep));
  for(const line of before.filter(l=>l.startsWith('talent|'))){const fields=line.split('|'),actual=after.find(l=>l.startsWith('talent|'+fields[1]+'|')).split('|');assert.equal(actual[2],fields[2]);assert.deepEqual(actual[3].split(',').sort(),fields[3].split(',').sort())}
  await page.locator('#file').setInputFiles(file);await page.waitForFunction(()=>window.__AS_EDITOR_BRIDGE.zones()?.state('8').heroic.get('sm')===3);await chooseClass('8');
  assert.deepEqual(await page.evaluate(()=>__AS_EDITOR_BRIDGE.snapshot().areas),[]);
  await page.locator('select[data-heroic-zone="sm"]').selectOption('1');assert.equal(await page.evaluate(()=>__AS_EDITOR_BRIDGE.zones().state('8').heroic.get('sm')),1);
  await page.locator('#zm-restore').click();assert.equal(await page.locator('select[data-heroic-zone="sm"]').inputValue(),'3');
  await page.locator('input[data-zone="sm"]').uncheck();assert.equal(await page.locator('select[data-heroic-zone="sm"]').inputValue(),'0');assert.equal(await page.evaluate(()=>__AS_EDITOR_BRIDGE.zones().state('8').heroic.has('sm')),false);
  await page.locator('#zm-restore').click();await page.locator('select[data-heroic-zone="naxx"]').selectOption('5');assert.ok(await page.locator('input[data-zone="naxx"]').isChecked());
  await page.locator('#zm-restore').click();await page.locator('#zm-heroic-bulk').selectOption('2');await page.locator('#zm-apply-difficulty').click();assert.equal(await page.evaluate(()=>__AS_EDITOR_BRIDGE.zones().state('8').heroic.size),8);
  await chooseClass('1');assert.equal(await page.locator('select[data-heroic-zone="elwynn"]').inputValue(),'0');
  await chooseClass('11');assert.ok(await page.locator('select[data-heroic-zone="sm"]').isDisabled());
  await chooseClass('8');assert.equal(await page.locator('select[data-heroic-zone="sm"]').inputValue(),'2');
  await page.locator('#zm-restore').click();assert.deepEqual(await page.evaluate(()=>__AS_EDITOR_BRIDGE.snapshot().areas),[]);
  const at=file;await page.locator('#file').setInputFiles(at);await chooseClass('8');await page.waitForFunction(()=>document.querySelector('select[data-heroic-zone="sm"]').value==='3');
  await page.locator('#as-language').selectOption('zh-CN');await page.locator('#zone-manager').evaluate(el=>scrollTo(0,el.offsetTop-80));await page.screenshot({path:path.join(work,'heroic-desktop.png')});
  await page.setViewportSize({width:390,height:844});await page.locator('#zone-manager').evaluate(el=>scrollTo(0,el.offsetTop-100));await page.screenshot({path:path.join(work,'heroic-mobile.png')});
  const size=await page.evaluate(()=>({page:document.documentElement.scrollWidth,viewport:innerWidth}));assert.ok(size.page<=size.viewport+1,JSON.stringify(size));
  assert.deepEqual(errors,[]);console.log('PASS: highest heroic clear, exact hbeat format, class isolation, normal/heroic coupling, downgrade, bulk ranks, restore, language persistence, encrypted export and reimport, untouched account data, desktop/mobile layouts.');console.log('Artifacts: '+work);
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
