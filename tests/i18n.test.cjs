'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const catalog=require('../data/i18n.json');
const {createTranslator}=require('../src/i18n.js');const t=createTranslator(catalog).translate;
test('old English UI and new Chinese resources translate in both directions',()=>{
 assert.equal(t('Equipment Collection','zh-CN'),'装备收藏');assert.equal(t('装备收藏','en'),'Equipment Collection');
 assert.equal(t('成就点与印记','en'),'Achievement Points & Marks');assert.equal(t('Restore imported marks','zh-CN'),'恢复导入的印记');
 assert.equal(t('未建记录','en'),'No record');assert.equal(t('ACCOUNT & CLASS RESOURCES · 实验性功能','en'),'Account & class resources · Experimental');
});
test('dynamic counts, class labels, ranks and source-language aliases translate',()=>{
 assert.equal(t('Mage (class 8)','zh-CN'),'法师（职业 8）');assert.equal(t('法师（职业 8）','en'),'Mage (class 8)');
 assert.equal(t('31 points spent','zh-CN'),'已分配 31 点');assert.equal(t('3 级','en'),'Rank 3');
 assert.equal(t('Arcane Focus, rank 3 of 5','zh-CN'),'奥术集中，等级 3/5');
 assert.equal(t('✦ 成就点 / 印记','en'),'✦ Achievement Points / Marks');
});
test('talent detail metadata and prerequisites translate as separate structured segments',()=>{
 assert.equal(t('Protection · row 7 · rank 0/1 · single rank','zh-CN'),'防护 · 第 7 行 · 等级 0/1 · 单等级');
 assert.equal(t('Requires 30 points in Protection · Requires 1 rank in Fortified','zh-CN'),'防护需要分配 30 点 · 需要 坚固 至少 1 级');
});
test('descriptions retain their numeric values after template substitution',()=>{
 assert.equal(t('Your weapon swings deal 17% more damage.','zh-CN'),'你的武器攻击伤害提高 17%。');
 assert.equal(t('你的武器攻击伤害提高 17%。','en'),'Your weapon swings deal 17% more damage.');
});
test('nested export errors and validation messages use the selected language',()=>{
 const source='Export blocked: 印记数量必须是非负整数';
 assert.equal(t(source,'en'),'Export blocked: Marks amount must be a non-negative integer');
 assert.equal(t(source,'zh-CN'),'导出已阻止：印记数量必须是非负整数');
});
test('equipment labels and achievement IDs preserve values while localizing labels',()=>{
 assert.equal(t('Common Head · 101000','zh-CN'),'普通 头部 · 101000');
 assert.equal(t('class:mage · +10 点','en'),'class:mage · +10 points');
 assert.equal(t('法师获胜 class:mage','en'),'Mage wins class:mage');
 assert.equal(t('instinct_gold · 每级费用 30','en'),'instinct_gold · Cost per rank 30');
});
test('XP warnings with combined dynamic class details are localized',()=>{
 const source='Warrior has 51 points spent but only 0 talent XP. Talent XP is not the same as points: the game works out your earned points from the XP and drops spent talents it cannot afford.';
 const translated=t(source,'zh-CN');assert.ok(!translated.includes('Talent XP is not'));assert.ok(translated.includes('战士'));assert.ok(translated.includes('51'));assert.ok(translated.includes('0'));
});
test('unknown strings, filenames, IDs and whitespace are not rewritten',()=>{
 for(const raw of ['Zulorael','AzerothSurvivors 2026-10-29 14-02-31.sav','marks|8|445','future:unknown','  custom player name  '])assert.equal(t(raw,'zh-CN'),raw);
 assert.equal(t('  Equipment Collection  ','zh-CN'),'  装备收藏  ');
});
test('every bundled talent name and description has a Chinese translation',()=>{
 const core=[...fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8').matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)][0][1];
 const ctx=vm.createContext({TextDecoder,TextEncoder,Uint8Array,DataView,Int32Array,atob,btoa,crypto:require('node:crypto').webcrypto});
 vm.runInContext(core.slice(0,core.indexOf('const C=')),ctx,{timeout:10000});const classes=JSON.parse(vm.runInContext('JSON.stringify(A)',ctx));
 let count=0;
 for(const cls of classes)for(const tree of cls.trees)for(const talent of tree.talents){
  assert.match(t(talent.name,'zh-CN'),/[\u3400-\u9fff]/,talent.name);
  const desc=talent.desc.replaceAll('{v}','17'),translated=t(desc,'zh-CN');assert.match(translated,/[\u3400-\u9fff]/,desc);
  if(talent.desc.includes('{v}'))assert.ok(translated.includes('17'),talent.id+' dropped its numeric value');count++;
 }
 assert.ok(count>340);
});
