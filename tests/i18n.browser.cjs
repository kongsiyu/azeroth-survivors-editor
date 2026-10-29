'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{pathToFileURL}=require('node:url');
const {createCodec}=require('../tools/analyze-save.cjs');
let runtime=process.env.PLAYWRIGHT_MODULE||'playwright';try{require.resolve(runtime)}catch{runtime=path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')}
const {chromium}=require(runtime),sample=process.argv[2];if(!sample)throw Error('Usage: node tests/i18n.browser.cjs <sample.sav>');
(async()=>{
 const work=fs.mkdtempSync(path.join(os.tmpdir(),'azeroth-i18n-')),browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const context=await browser.newContext({locale:'zh-CN',acceptDownloads:true,viewport:{width:1440,height:1100}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
  await page.waitForFunction(()=>window.ASI18n?.locale?.()==='zh-CN');
  assert.equal(await page.locator('html').getAttribute('lang'),'zh-CN');
  await page.locator('#file').setInputFiles(path.resolve(sample));
  await page.waitForFunction(()=>window.__AS_EDITOR_BRIDGE.resources()?.mark('8')===445);
  await page.waitForFunction(()=>document.querySelector('#as-resources h2').textContent==='成就点与印记');
  assert.equal(await page.locator('#am-export').textContent(),'↓ 导出存档');
  const original=await page.evaluate(()=>({fingerprint:__AS_EDITOR_BRIDGE.snapshot().fingerprint,plain:document.getElementById('plain').textContent,pick:Y.pick.parts.join('|')}));
  await page.locator('#as-marks-8').fill('446');
  const edited=await page.evaluate(()=>__AS_EDITOR_BRIDGE.snapshot().fingerprint);
  await page.locator('#as-language').selectOption('en');
  await page.waitForFunction(()=>document.querySelector('#as-resources h2').textContent==='Achievement Points & Marks');
  assert.equal(await page.locator('html').getAttribute('lang'),'en');assert.equal(await page.locator('#am-export').textContent(),'↓ Export Save');
  assert.equal(await page.locator('#as-marks-8').inputValue(),'446');
  assert.equal(await page.evaluate(()=>__AS_EDITOR_BRIDGE.snapshot().fingerprint),edited);
  assert.equal(await page.evaluate(()=>document.getElementById('plain').textContent),original.plain);
  assert.equal(await page.evaluate(()=>Y.pick.parts.join('|')),original.pick);
  const collectChinese=()=>page.evaluate(()=>{
    const out=[],skip='script,style,pre,code,textarea,[data-i18n-ignore],#fname';const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let node;
    while(node=walker.nextNode())if(!node.parentElement.closest(skip)&&/[\u3400-\u9fff]/.test(node.textContent))out.push(node.textContent.trim());
    for(const el of document.querySelectorAll('[title],[placeholder],[aria-label]'))if(!el.closest(skip))for(const a of ['title','placeholder','aria-label'])if(/[\u3400-\u9fff]/.test(el.getAttribute(a)||''))out.push(a+': '+el.getAttribute(a));return [...new Set(out)];
  });
  assert.deepEqual(await collectChinese(),[]);
  for(const id of ['2','3','4','5','7','8','9','11','1']){
    await page.locator('.cls[data-cls="'+id+'"]').click();
    await page.locator('button.t[data-t]').first().hover();
    await page.evaluate(()=>ASI18n.refresh());
    assert.deepEqual(await collectChinese(),[],id+' has untranslated Chinese UI');
  }
  await page.locator('#as-language').selectOption('zh-CN');
  await page.waitForFunction(()=>document.getElementById('am-export').textContent==='↓ 导出存档');
  await page.locator('button.t[data-t]').first().hover();
  await page.evaluate(()=>ASI18n.refresh());
  assert.match(await page.locator('button.t[data-t]').first().getAttribute('aria-label'),/[\u3400-\u9fff]/);
  const downloadPromise=page.waitForEvent('download');await page.locator('#am-export').click();const download=await downloadPromise,file=path.join(work,'localized-export.sav');await download.saveAs(file);
  const plain=createCodec()(fs.readFileSync(file,'utf8'));assert.ok(plain.split(/\r?\n/).includes('marks|8|446'));
  assert.ok(!plain.includes('法师'));assert.ok(!plain.includes('战士'));
  await page.locator('#as-language').selectOption('en');await page.reload();
  await page.waitForFunction(()=>window.ASI18n?.locale?.()==='en');assert.equal(await page.locator('#as-language').inputValue(),'en');
  await page.locator('#as-language').selectOption('zh-CN');await page.reload();
  await page.waitForFunction(()=>window.ASI18n?.locale?.()==='zh-CN');
  await page.locator('#file').setInputFiles(path.resolve(sample));await page.waitForFunction(()=>window.__AS_EDITOR_BRIDGE.resources()?.mark('8')===445);
  await page.locator('#as-marks-8').fill('-1');await page.locator('#as-language').selectOption('en');
  await page.evaluate(()=>ASI18n.refresh());assert.match(await page.locator('#as-marks-8').evaluate(el=>el.validationMessage),/non-negative integer/);
  assert.deepEqual(await collectChinese(),[]);
  await page.locator('#as-marks-restore').click();
  await page.locator('#as-resources').evaluate(el=>scrollTo(0,el.offsetTop-90));await page.screenshot({path:path.join(work,'english-desktop.png')});
  await page.locator('#as-language').selectOption('zh-CN');await page.evaluate(()=>ASI18n.refresh());await page.screenshot({path:path.join(work,'chinese-desktop.png')});
  await page.setViewportSize({width:390,height:844});await page.locator('#as-resources').evaluate(el=>scrollTo(0,el.offsetTop-110));await page.screenshot({path:path.join(work,'chinese-mobile.png')});
  for(const lang of ['zh-CN','en']){await page.locator('#as-language').selectOption(lang);await page.evaluate(()=>ASI18n.refresh());const width=await page.evaluate(()=>({page:document.documentElement.scrollWidth,viewport:innerWidth}));assert.ok(width.page<=width.viewport+1,JSON.stringify({lang,...width}));}
  await page.setViewportSize({width:1440,height:1100});
  for(const lang of ['en','zh-CN']){
    await page.locator('#as-language').selectOption(lang);
    await page.locator('#am-all').click();
    await page.waitForFunction(()=>document.getElementById('as15-modal').open);
    await page.evaluate(()=>ASI18n.refresh());
    assert.equal(await page.locator('#as15-modal h2').textContent(),lang==='en'?'Unlock all 498 pieces?':'解锁全部 498 件装备？');
    await page.locator('#as15-cancel-unlock').click();
    for(const query of ['Common','普通']){
      await page.locator('#as15-equipment-search').fill(query);
      await page.waitForFunction(()=>document.querySelectorAll('#as15-focused-grid .as15-item-card').length>0);
      await page.evaluate(()=>ASI18n.refresh());
      assert.match(await page.locator('#as15-filter-label').textContent(),lang==='en'?/matching equipment/:/找到/);
    }
    await page.locator('#as15-equipment-search').fill('');
  }
  await page.locator('#xp').fill('0');await page.locator('#xp').dispatchEvent('change');await page.evaluate(()=>ASI18n.refresh());
  assert.ok(!(await page.locator('#warn').textContent()).includes('Talent XP is not the same as points'));
  await page.locator('#as-language').selectOption('en');await page.evaluate(()=>ASI18n.refresh());
  assert.ok((await page.locator('#warn').textContent()).includes('Talent XP is not the same as points'));
  await page.locator('#pickname').fill('法师');
  await page.waitForFunction(()=>Y.pick.parts[5]==='法师');
  for(const lang of ['en','zh-CN']){await page.locator('#as-language').selectOption(lang);await page.evaluate(()=>ASI18n.refresh());assert.equal(await page.locator('#summary .srow').last().locator('span').nth(1).textContent(),'法师');assert.equal(await page.locator('#pickname').inputValue(),'法师');}
  assert.deepEqual(errors,[]);console.log('PASS: automatic language, both directions, all classes, tooltip text, source data and drafts preserved, export, preference persistence, validation messages, desktop and mobile layouts.');console.log('Artifacts: '+work);
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
