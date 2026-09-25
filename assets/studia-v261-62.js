
(()=>{
'use strict';
if(window.__STUDIA_V242_CORE__)return;window.__STUDIA_V242_CORE__=true;
const q=(s,r=document)=>r?.querySelector?.(s)||null,qa=(s,r=document)=>r?.querySelectorAll?[...r.querySelectorAll(s)]:[];
const clone=x=>{try{return structuredClone(x)}catch(_){try{return JSON.parse(JSON.stringify(x))}catch(__){return x}}};
const getData=()=>{try{return data}catch(_){return window.data||{}}};
const setData=v=>{try{data=v}catch(_){window.data=v}};
const storeKey=()=>{try{return KEY}catch(_){return 'schoolhub-v1'}};
const META='__studiaSyncMeta',UPDATED='__studiaUpdatedAt',BASE='studia-v242-last-synced-state';
const TRACKED=['homework','tests','writtenTests','grades','flashcards','subjects','absences','studySessions','reminders','flashDecks','quizzes','studySheets'];
let syncBusy=false,lastSyncAt=0,pullStart=null,pullReady=false,maintainQueued=false;
function clean(v){if(Array.isArray(v))return v.map(clean);if(v&&typeof v==='object'){const o={};for(const[k,x]of Object.entries(v)){if(k===META||k===UPDATED)continue;o[k]=clean(x)}return o}return v}
function same(a,b){try{return JSON.stringify(clean(a))===JSON.stringify(clean(b))}catch(_){return false}}
function idOf(x){return x&&typeof x==='object'&&x.id!=null?String(x.id):''}
function ensureMeta(d){if(!d||typeof d!=='object')return {version:1,fields:{},tombstones:{}};d[META]||={version:1,fields:{},tombstones:{}};d[META].fields||={};d[META].tombstones||={};d[META].version=1;return d[META]}
function stamp(cur,base){
 if(!cur||typeof cur!=='object')return;const ts=Date.now(),m=ensureMeta(cur),bm=base?.[META]||{};
 for(const name of TRACKED){
  const a=Array.isArray(cur[name])?cur[name]:[],b=Array.isArray(base?.[name])?base[name]:[],B=new Map(b.map(x=>[idOf(x),x]).filter(x=>x[0])),A=new Map(a.map(x=>[idOf(x),x]).filter(x=>x[0]));m.tombstones[name]||={};
  for(const item of a){const id=idOf(item);if(!id)continue;const old=B.get(id);const natural=Number(item.updatedAt||item.modifiedAt||item.v219LocalSavedAt||0);if(!old)item[UPDATED]=Math.max(Number(item[UPDATED])||0,natural,ts);else if(!same(item,old))item[UPDATED]=Math.max(natural,ts);else if(!Number(item[UPDATED]))item[UPDATED]=Math.max(Number(old?.[UPDATED])||0,natural,1);if(Number(item[UPDATED]||0)>Number(m.tombstones[name][id]||0))delete m.tombstones[name][id]}
  for(const old of b){const id=idOf(old);if(id&&!A.has(id))m.tombstones[name][id]=Math.max(Number(m.tombstones[name][id]||0),ts)}
 }
 for(const k of Object.keys(cur).filter(k=>k!==META&&!TRACKED.includes(k))){if(!same(cur[k],base?.[k]))m.fields[k]=ts;else if(!m.fields[k]&&bm?.fields?.[k])m.fields[k]=bm.fields[k]}
}
function mergeMeta(a,b){const A=a||{},B=b||{},o={version:1,fields:{},tombstones:{}};for(const k of new Set([...Object.keys(A.fields||{}),...Object.keys(B.fields||{})]))o.fields[k]=Math.max(Number(A.fields?.[k]||0),Number(B.fields?.[k]||0));for(const n of new Set([...Object.keys(A.tombstones||{}),...Object.keys(B.tombstones||{})])){o.tombstones[n]={};const aa=A.tombstones?.[n]||{},bb=B.tombstones?.[n]||{};for(const id of new Set([...Object.keys(aa),...Object.keys(bb)]))o.tombstones[n][id]=Math.max(Number(aa[id]||0),Number(bb[id]||0))}return o}
function mergePlain(r,l){if(l==null)return clone(r);if(r==null)return clone(l);if(Array.isArray(l)||Array.isArray(r))return clone(l);if(typeof l==='object'&&typeof r==='object')return {...clone(r),...clone(l)};return clone(l)}
function mergeCollection(name,larr,rarr,meta){
 const la=Array.isArray(larr)?larr:[],ra=Array.isArray(rarr)?rarr:[],L=new Map(la.map(x=>[idOf(x),x]).filter(x=>x[0])),R=new Map(ra.map(x=>[idOf(x),x]).filter(x=>x[0])),ids=[...new Set([...la.map(idOf),...ra.map(idOf)].filter(Boolean))],out=[];
 for(const id of ids){const l=L.get(id),r=R.get(id);let v;if(l&&r){const lt=Number(l[UPDATED]||l.updatedAt||l.modifiedAt||l.v219LocalSavedAt||0),rt=Number(r[UPDATED]||r.updatedAt||r.modifiedAt||r.v219LocalSavedAt||0);v=rt>lt?clone(r):lt>rt?clone(l):mergePlain(r,l);v[UPDATED]=Math.max(lt,rt,Number(v?.[UPDATED]||0))}else v=clone(l||r);const dead=Number(meta?.tombstones?.[name]?.[id]||0),vt=Number(v?.[UPDATED]||v?.updatedAt||v?.modifiedAt||v?.v219LocalSavedAt||0);if(dead&&dead>=vt)continue;if(v)out.push(v)}
 const seen=new Set(out.map(x=>{try{return JSON.stringify(clean(x))}catch(_){return String(x)}}));for(const x of [...la,...ra]){if(idOf(x))continue;let k;try{k=JSON.stringify(clean(x))}catch(_){k=String(x)}if(!seen.has(k)){seen.add(k);out.push(clone(x))}}return out;
}
function mergeState(local,remote){local=local&&typeof local==='object'?local:{};remote=remote&&typeof remote==='object'?remote:{};const meta=mergeMeta(local[META],remote[META]),out={},keys=new Set([...Object.keys(local),...Object.keys(remote)]);keys.delete(META);for(const k of keys){if(TRACKED.includes(k)){out[k]=mergeCollection(k,local[k],remote[k],meta);continue}const lt=Number(local[META]?.fields?.[k]||0),rt=Number(remote[META]?.fields?.[k]||0);out[k]=rt>lt?clone(remote[k]):lt>rt?clone(local[k]):mergePlain(remote[k],local[k])}out[META]=meta;return out}
function persist(){try{localStorage.setItem(storeKey(),JSON.stringify(getData()))}catch(e){console.warn('[V242 local save]',e)}}
function readBase(){try{return JSON.parse(localStorage.getItem(BASE)||'{}')}catch(_){return {}}}
function saveBase(v){try{localStorage.setItem(BASE,JSON.stringify(v||{}))}catch(_){}}
function editorActive(){return document.body.classList.contains('editorMode')&&!!q('#view-sheet-editor.active')}
function commitEditor(){if(editorActive())try{window.saveCanvasSheetCore?.(true)}catch(e){console.warn('[V242 editor commit]',e)}persist()}
function rerender(){if(editorActive())return;try{window.renderAll?.()}catch(_){ }try{if(q('#view-plan.active'))window.renderPlan?.()}catch(_){ }try{if(q('#view-home.active'))window.renderHome?.()}catch(_){ }}
async function backup(){try{await window.v111CreateBackupNow?.(false)}catch(_){}}
function status(text,bad=false){const s=String(text||'');try{window.StudiaCloud?.setStatus?.(s,bad)}catch(_){}const b=q('#v242DesktopSync');if(b){b.title=s;b.classList.toggle('syncing',/Synchron/i.test(s)&&!/✓|Fehler|fehl|nicht|lokal/i.test(s));if(/gespeichert ✓|Lokal gespeichert/i.test(s))b.classList.remove('dirty');const sm=q('small',b);if(sm)sm.textContent=s}const p=q('#v242PullSync');if(p&&p.classList.contains('show'))p.textContent=s;const x=q('#v242SyncStatus');if(x){x.textContent=s;x.classList.toggle('bad',!!bad)}}
window.studiaSyncNow=async function(force=false){
 const dirty=!!window.v150CloudDirty?.();if(syncBusy)return {busy:true};if(!force&&!dirty&&Date.now()-lastSyncAt<15000)return {skipped:true};syncBusy=true;status('Synchronisiere Geräte …');
 try{
  const cloud=window.StudiaCloud;if(!cloud)throw new Error('Sync-Modul fehlt');const cfg=cloud.config?.()||{};if(!cfg.url)throw new Error('Server-Script-Service-URL fehlt');if(!cfg.token)throw new Error('Nicht angemeldet');
  commitEditor();await backup();const d=getData(),base=readBase();stamp(d,base);persist();const local=clone(d);
  if(typeof cloud.syncState!=='function')throw new Error('Sync-Client V247 fehlt');
  const res=await cloud.syncState(clone(local));
  if(Number(res?.version||0)<247)throw new Error('Backend V247 fehlt · Apps Script einmal aktualisieren');
  const merged=res?.data&&typeof res.data==='object'?res.data:local;setData(merged);persist();rerender();
  saveBase(merged);window.v150ClearDirty?.();lastSyncAt=Date.now();status('Auf allen Geräten gespeichert ✓');setTimeout(()=>status('Lokal gespeichert'),2200);return {ok:true,updatedAt:res?.updatedAt||lastSyncAt};
 }catch(e){console.error('[Studia V247 sync]',e);persist();let msg=String(e?.message||'Sync fehlgeschlagen');if(/Unbekannte Aktion:\s*sync/i.test(msg))msg='Backend V247 fehlt · Apps Script einmal aktualisieren';status(msg+' · lokal sicher',true);try{window.cuteToast?.('Sync: '+msg)}catch(_){}setTimeout(()=>status('Lokal gespeichert'),3500);throw e}finally{syncBusy=false;setTimeout(()=>q('#v242PullSync')?.classList.remove('show','ready','syncing'),450)}
};
window.studiaSyncNow.__v219Guarded=true;
window.v171CloudNow=function(){return window.studiaSyncNow(false)};window.v171CloudNow.__v219Guarded=true;try{v171CloudNow=window.v171CloudNow}catch(_){}

/* one sync button + one pull gesture */
function ensureSyncUI(){
 let b=q('#v242DesktopSync');if(!b){b=document.createElement('button');b.id='v242DesktopSync';b.type='button';b.title='Geräte synchronisieren';b.setAttribute('aria-label','Geräte synchronisieren');b.innerHTML='<span class="spin">↻</span><span>Geräte synchronisieren<small>Lokal gespeichert</small></span>';b.onclick=()=>window.studiaSyncNow(true).catch(()=>{});document.body.appendChild(b)}
 let p=q('#v242PullSync');if(!p){p=document.createElement('div');p.id='v242PullSync';p.textContent='Zum Synchronisieren ziehen';document.body.appendChild(p)}
 const card=q('.v171CloudSettings');if(card){let st=q('#v242SyncStatus',card);if(!st){st=document.createElement('div');st.id='v242SyncStatus';st.textContent='Lokal gespeichert';card.appendChild(st)}for(const btn of qa('button',card)){if(/jetzt synchronisieren|zusammenführen|geräte synchronisieren/i.test(btn.textContent||'')){btn.removeAttribute('onclick');btn.onclick=()=>window.studiaSyncNow(true).catch(()=>{});btn.textContent='Jetzt synchronisieren'}}}
}
document.addEventListener('touchstart',e=>{if(innerWidth>=900||editorActive()||document.body.classList.contains('modalOpen'))return;const sc=document.scrollingElement||document.documentElement;if((sc.scrollTop||window.scrollY)>3)return;const t=e.touches?.[0];if(!t)return;pullStart=t.clientY;pullReady=false;ensureSyncUI()},{passive:true});
document.addEventListener('touchmove',e=>{if(pullStart==null)return;const t=e.touches?.[0];if(!t)return;const dy=Math.max(0,t.clientY-pullStart),p=q('#v242PullSync');if(!p)return;if(dy>8){p.classList.add('show');p.style.transform=`translate(-50%, ${Math.min(58,dy*.42)-45}px)`}pullReady=dy>=85;p.classList.toggle('ready',pullReady);p.textContent=pullReady?'Loslassen zum Synchronisieren ↻':'Zum Synchronisieren ziehen'},{passive:true});
document.addEventListener('touchend',()=>{if(pullStart==null)return;const run=pullReady;pullStart=null;pullReady=false;const p=q('#v242PullSync');if(p)p.style.transform='';if(run)window.studiaSyncNow(true).catch(()=>{});else setTimeout(()=>p?.classList.remove('show','ready'),180)},{passive:true});

/* Subject colors stay authoritative and saved. */
function canon(name){let x=String(name||'').replace(/\s+/g,' ').trim();try{x=window.prettySubject?.(x)||x}catch(_){}x=x.toUpperCase().trim();const a={M:'MATHEMATIK',MATHE:'MATHEMATIK',MATHEMATIK:'MATHEMATIK',D:'DEUTSCH',DE:'DEUTSCH',DEUTSCH:'DEUTSCH',E:'ENGLISCH',ENG:'ENGLISCH',ENGLISCH:'ENGLISCH',PH:'PHYSIK',PHY:'PHYSIK',PHYSIK:'PHYSIK',BIO:'BIOLOGIE',BI:'BIOLOGIE',BIOLOGIE:'BIOLOGIE',CH:'CHEMIE',CHE:'CHEMIE',CHEMIE:'CHEMIE',G:'GESCHICHTE',GE:'GESCHICHTE',GES:'GESCHICHTE',GESCHICHTE:'GESCHICHTE',ET:'ETHIK',ETHIK:'ETHIK',SP:'SPORT',SPORT:'SPORT',INF:'INFORMATIK',INFORMATIK:'INFORMATIK'};return a[x]||x}
function subjectColor(name){const d=getData();d.timetableSubjectColors||={};const c=canon(name);for(const[k,v]of Object.entries(d.timetableSubjectColors))if(canon(k)===c&&/^#[0-9a-f]{6}$/i.test(String(v)))return String(v).toLowerCase();const rec=(d.subjects||[]).find(s=>canon(s.name)===c||canon(s.abbr)===c);if(rec?.color)return String(rec.color);try{return window.hashColor?.(c)||'#e9a7a4'}catch(_){return '#e9a7a4'}}
function setSubjectColor(name,color){color=String(color||'').toLowerCase();if(!/^#[0-9a-f]{6}$/.test(color))return;const d=getData(),c=canon(name);d.timetableSubjectColors||={};d.timetableSubjectColors[c]=color;for(const s of d.subjects||[])if(canon(s.name)===c||canon(s.abbr)===c){s.color=color;if(s.autoFromTimetable)s.cover=color;s[UPDATED]=Date.now()}ensureMeta(d).fields.timetableSubjectColors=Date.now();persist();window.v150MarkDirty?.(500);try{window.renderPlan?.();window.renderHome?.()}catch(_){}}
window.setTimetableSubjectColor=setSubjectColor;window.v216SetSubjectColor=setSubjectColor;window.timetableSubjectColor=subjectColor;try{timetableSubjectColor=subjectColor}catch(_){}
document.addEventListener('change',e=>{const inp=e.target instanceof Element?e.target.closest('#v210SubjectColors input[type="color"]'):null;if(!inp)return;const name=inp.closest('.v210ColorRow')?.querySelector('span')?.textContent?.trim();if(name)setSubjectColor(name,inp.value)},true);

/* New tape SVG — same DOM is cloned to print/PDF. */
function tapeColor(el){return el.dataset.v242TapeColor||el.style.backgroundColor||el.style.background||'#f2beb2'}
function tapeSVG(color){let lines='';for(let x=-25;x<130;x+=13)lines+=`<line x1="${x}" y1="32" x2="${x+34}" y2="-2" stroke="white" stroke-opacity=".18" stroke-width="3"/>`;return `<svg class="v242TapeArt" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><path d="M1.5 2 L98.5 .8 L99 27.5 L1 29 Z" fill="${color}" fill-opacity=".76"/>${lines}</svg>`}
function decorateTape(root=document){for(const el of qa('.tapeSticker',root)){const color=tapeColor(el);el.dataset.v242TapeColor=color;let art=q(':scope > .v242TapeArt',el);if(!art){el.insertAdjacentHTML('afterbegin',tapeSVG(color));art=q(':scope > .v242TapeArt',el)}else{const path=q('path',art);if(path)path.setAttribute('fill',color)}}}
window.v242DecorateTape=decorateTape;

/* one print handler */
window.printCanvasSheet=async function(){
 if(innerWidth<900&&typeof window.v170PrintMobile==='function')return window.v170PrintMobile();const w=window.open('about:blank','_blank','width=1050,height=900');if(!w)return alert('Bitte Pop-ups für Studia erlauben, damit die Druckvorschau geöffnet werden kann.');w.document.write('<p style="font:16px sans-serif;padding:24px">Druckvorschau wird geladen …</p>');
 try{const clones=await window.cloneAllPages181?.();if(!clones?.length){w.close();return alert('Keine Lernblatt-Seite gefunden.')}for(const page of clones)decorateTape(page);const first=clones[0],W=parseFloat(first.style.width),H=parseFloat(first.style.height),faces=[...document.querySelectorAll('style')].map(s=>s.textContent.match(/@font-face\s*\{[^}]*\}/g)||[]).flat().join('\n')+clones.map((c,i)=>{const name='studiaPage'+i;c.style.setProperty('page',name,'important');return '@page '+name+'{size:'+parseFloat(c.style.width)+'px '+parseFloat(c.style.height)+'px;margin:0}'}).join('');
 const tapeCSS='.tapeSticker{background:transparent!important;border:0!important;outline:0!important;box-shadow:none!important;overflow:visible!important}.tapeSticker:before,.tapeSticker:after{display:none!important;content:none!important}.tapeSticker>.v242TapeArt{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;display:block!important;pointer-events:none!important;overflow:visible!important}';
 w.document.open();w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Studia · Druckvorschau</title><base href="'+location.href+'"></head><body><header class="toolbar"><b>Druckvorschau · nur das Lernblatt</b><button id="print">Drucken</button><button id="close">Schließen</button></header><main class="printRoot">'+clones.map(c=>c.outerHTML).join('')+'</main></body></html>');w.document.close();q('#close',w.document).onclick=()=>w.close();q('#print',w.document).onclick=async()=>{try{await w.document.fonts.ready}catch(_){}await Promise.all([...w.document.images].map(img=>img.complete?Promise.resolve():new Promise(r=>{img.onload=r;img.onerror=r})));w.focus();w.print()};w.focus();
 }catch(e){console.error('[Studia V242 print]',e);try{w.close()}catch(_){}alert('Die Druckvorschau konnte nicht erstellt werden. '+(e?.message?`(${e.message})`:''))}
};try{printCanvasSheet=window.printCanvasSheet}catch(_){}

if(!window.__STUDIA_V245_HOME_CLOCK__){window.__STUDIA_V245_HOME_CLOCK__=setInterval(()=>{try{if(document.querySelector('#view-home.active')&&!document.body.classList.contains('editorMode'))window.renderHome?.()}catch(_){}},1000)}
function maintain(){if(maintainQueued)return;maintainQueued=true;requestAnimationFrame(()=>{maintainQueued=false;ensureSyncUI();decorateTape();const e=q('#headerEyebrow');if(e)e.textContent='VERSION 253'})}
/* V253: global DOM observer removed; it caused continuous self-triggered maintenance. */[0,120,450,1200].forEach(t=>setTimeout(maintain,t));
/* V245: no automatic network sync on reconnect; user triggers sync explicitly. */
})();
