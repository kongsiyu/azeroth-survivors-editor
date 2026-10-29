(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else{root.ASI18n=api;if(root.document&&root.AS_I18N_CATALOG)api.mount(root.AS_I18N_CATALOG)}
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const normalize=text=>String(text).replace(/\s+/g,' ').trim();
  const escape=text=>text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  function createTranslator(catalog){
    const locales=Object.keys(catalog.locales),exact=new Map(),templates=[],cache=new Map();
    const canonical=new Set(Object.values(catalog.translations).flatMap(map=>Object.keys(map)));
    for(const source of canonical)exact.set(normalize(source),source);
    for(const locale of locales){
      for(const [source,value] of Object.entries(catalog.translations[locale]||{}))if(!exact.has(normalize(value)))exact.set(normalize(value),source);
      for(const [value,source] of Object.entries(catalog.aliases?.[locale]||{}))exact.set(normalize(value),source);
    }
    function compile(forms){
      for(const source of new Set(Object.values(forms))){
        const tokens=[];let pattern='',last=0;const text=normalize(source);
        for(const match of text.matchAll(/\{([a-zA-Z][\w]*)\}/g)){
          pattern+=escape(text.slice(last,match.index));
          const token=match[1];tokens.push(token);
          pattern+=['count','rank','max','total','all','slots','added','removed','classes'].includes(token)?'([0-9,]+)':token==='id'?'([a-zA-Z0-9_:|.-]+)':['name','class','zone'].includes(token)?'([^·;；]+?)':'([\\s\\S]*?)';
          last=match.index+match[0].length;
        }
        pattern+=escape(text.slice(last));
        if(tokens.length&&text.replace(/\{\w+\}/g,'').length>=1)templates.push({regex:new RegExp('^'+pattern+'$'),tokens,forms,weight:text.replace(/\{\w+\}/g,'').length});
      }
    }
    for(const source of canonical)if(/\{\w+\}/.test(source))compile(Object.fromEntries(locales.map(locale=>[locale,locale==='en'?source:catalog.translations[locale]?.[source]||source])));
    for(const forms of catalog.patterns||[])compile(forms);
    templates.sort((a,b)=>b.weight-a.weight);
    function translate(raw,locale='en',depth=0){
      const text=String(raw),key=locale+'\0'+text;
      if(depth===0&&cache.has(key))return cache.get(key);
      const match=/^(\s*)([\s\S]*?)(\s*)$/.exec(text),body=normalize(match[2]);let result=body;
      const source=exact.get(body);
      if(source!==undefined)result=locale==='en'?source:catalog.translations[locale]?.[source]||source;
      else if(depth<4){
        let found=false;
        for(const template of templates){
          const values=template.regex.exec(body);if(!values)continue;
          const data=Object.fromEntries(template.tokens.map((token,i)=>[token,translate(values[i+1],locale,depth+1)]));
          result=(template.forms[locale]||template.forms.en).replace(/\{(\w+)\}/g,(_,token)=>data[token]??'{'+token+'}');found=true;break;
        }
        if(!found){
          const namedId=/^(.+?)\s+([a-z][a-z0-9_]*:[a-z0-9_:]+|legendaryset|armoryoflegends|setbonus|sharedset|set8|wardrobe)$/.exec(body);
          if(namedId)result=translate(namedId[1],locale,depth+1)+' '+namedId[2];
          else if(/;\s|；/.test(body)){
            const parts=body.split(/;\s+|；/),translated=parts.map(part=>translate(part,locale,depth+1));
            if(parts.some((part,i)=>part!==translated[i]))result=translated.join(locale==='en'?'; ':'；');
          }else if(/\s[·/×]\s/.test(body))result=body.split(/(\s[·/×]\s)/).map((part,i)=>i%2?part:translate(part,locale,depth+1)).join('');
        }
      }
      const output=result===body&&source===undefined?text:match[1]+result+match[3];
      if(depth===0){if(cache.size>10000)cache.clear();cache.set(key,output)}
      return output;
    }
    return {translate,locales};
  }
  function mount(catalog){
    const translator=createTranslator(catalog),storageKey='as-editor-language',version=document.title.match(/v\d+\.\d+\.\d+/)?.[0]||'';let locale;
    try{locale=localStorage.getItem(storageKey)}catch(_error){}
    if(!Object.hasOwn(catalog.locales,locale))locale=navigator.language?.toLowerCase().startsWith('zh')?'zh-CN':'en';
    const records=new WeakMap(),attributes=new WeakMap(),validations=new WeakMap();
    const ignored='script,style,pre,code,textarea,[data-i18n-ignore],#fname';
    const pickerWrap=document.createElement('label');pickerWrap.className='as-language-picker';pickerWrap.dataset.i18nIgnore='';pickerWrap.title='语言 / Language';
    const picker=document.createElement('select');picker.id='as-language';picker.setAttribute('aria-label','语言 / Language');
    for(const [value,meta] of Object.entries(catalog.locales))picker.add(new Option(meta.label,value));
    picker.value=locale;pickerWrap.append(picker);
    (document.querySelector('.as15-nav-right')||document.getElementById('as15-nav')||document.body).prepend(pickerWrap);
    function localizeNode(node){
      const current=node.textContent,prior=records.get(node);
      const source=prior&&current===prior.output?prior.source:current;
      const output=translator.translate(source,locale);
      records.set(node,{source,output});if(output!==current)node.textContent=output;
    }
    function localizeAttribute(el,name){
      const saved=attributes.get(el)||new Map(),current=el.getAttribute(name),prior=saved.get(name);
      const source=prior&&current===prior.output?prior.source:current;
      const output=translator.translate(source,locale);saved.set(name,{source,output});attributes.set(el,saved);
      if(output!==current)el.setAttribute(name,output);
    }
    let scheduled=false;
    const observer=new MutationObserver(schedule);
    function apply(){
      scheduled=false;
      // The Character summary includes a player-supplied name, not UI copy.
      for(const row of document.querySelectorAll('#summary .srow'))if(translator.translate(row.children[0]?.textContent||'','en')==='Character'&&row.children[1])row.children[1].dataset.i18nIgnore='';
      const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{acceptNode:node=>node.parentElement?.closest(ignored)?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});let node;
      while(node=walker.nextNode())if(node.textContent.trim())localizeNode(node);
      for(const el of document.querySelectorAll('[title],[placeholder],[aria-label],[alt]')){
        if(el.closest(ignored))continue;
        for(const name of ['title','placeholder','aria-label','alt'])if(el.hasAttribute(name))localizeAttribute(el,name);
      }
      for(const el of document.querySelectorAll('input,select'))if(el.validity?.customError){
        const current=el.validationMessage,prior=validations.get(el),source=prior&&current===prior.output?prior.source:current;
        const output=translator.translate(source,locale);validations.set(el,{source,output});if(output!==current)el.setCustomValidity(output);
      }
      document.documentElement.lang=catalog.locales[locale].htmlLang;
      document.title=translator.translate('Azeroth Survivors Save Editor',locale)+' '+version+' | Shilen';
      observer.takeRecords();
    }
    function schedule(){if(!scheduled){scheduled=true;queueMicrotask(apply)}}
    function setLocale(value){
      if(!Object.hasOwn(catalog.locales,value))return;
      locale=value;picker.value=value;try{localStorage.setItem(storageKey,value)}catch(_error){}
      apply();document.dispatchEvent(new CustomEvent('as15:language',{detail:{locale}}));
    }
    picker.addEventListener('change',()=>setLocale(picker.value));
    observer.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['title','placeholder','aria-label','alt']});
    Object.assign(api,{t:(text,language=locale)=>translator.translate(text,language),setLocale,locale:()=>locale,refresh:apply});apply();
    return api;
  }
  const api={createTranslator,mount};return api;
});
