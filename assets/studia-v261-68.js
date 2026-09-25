
(()=>{
'use strict';
if(window.__STUDIA_V261__)return;window.__STUDIA_V261__=true;window.__STUDIA_VERSION__=261;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const DIRECT_GOOGLE=!!(window.google&&google.script&&google.script.run);
const BASE_KEY='studia-v260-sync-base', DEVICE_KEY='studia-v260-device-id';
let busy=false,autoTimer=0,lastSync=0,mutationSerial=0;
function dataRef(){try{return data}catch(_){return window.data||{}}}
function setDataRef(v){try{data=v}catch(_){window.data=v}}
function keyRef(){try{return KEY}catch(_){return 'schoolhub-v1'}}
function clone(v){try{return structuredClone(v)}catch(_){return JSON.parse(JSON.stringify(v))}}
function persist(){try{localStorage.setItem(keyRef(),JSON.stringify(dataRef()))}catch(e){console.warn('[Studia V261 local]',e)}}
function baseRead(){for(const k of [BASE_KEY,'studia-v259-sync-base','studia-v253-sync-base','studia-v242-last-synced-state']){try{const v=JSON.parse(localStorage.getItem(k)||'null');if(v&&typeof v==='object')return v}catch(_){}}return {}}
function baseSave(v){try{localStorage.setItem(BASE_KEY,JSON.stringify(v||{}))}catch(_){}}
function deviceId(){let v='';try{v=localStorage.getItem(DEVICE_KEY)||''}catch(_){}if(!v){v='device-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);try{localStorage.setItem(DEVICE_KEY,v)}catch(_){}}return v}
function deviceName(){return (/iPhone|iPad|Android|Mobile/i.test(navigator.userAgent)?'Handy':'Laptop')+' · '+String(navigator.platform||'Browser').slice(0,30)}
function cfg(){try{return window.StudiaCloud?.config?.()||{}}catch(_){return {}}}
function cleanUrl(u){return String(u||'').trim().replace(/[?#].*$/,'')}
function markVersion(){const e=$('#headerEyebrow');if(e&&e.textContent!=='VERSION 261')e.textContent='VERSION 261'}
function status(text,bad=false){
 const s=String(text||'');try{window.StudiaCloud?.setStatus?.(s,bad)}catch(_){}
 const x=$('#v242SyncStatus');if(x){x.textContent=s;x.classList.toggle('bad',!!bad)}
 const b=$('#v242DesktopSync');if(b){b.title=s;b.classList.toggle('syncing',/Synchron|Google lädt|Google speichert/i.test(s))}
 let info=$('#v260GoogleSyncInfo'),card=$('.v171CloudSettings');if(card&&!info){info=document.createElement('div');info.id='v260GoogleSyncInfo';card.appendChild(info)}
 if(info){info.textContent='Google Auto-Sync · '+s;info.classList.toggle('bad',!!bad);info.classList.toggle('syncing',/Synchron|lädt|speichert/i.test(s))}
}
function rememberUrl(url){try{window.StudiaCloud?.rememberUrl?.(url)}catch(_){}const i=$('#v150ScriptUrl');if(i)i.value=url}
function rememberAuth(r){try{window.StudiaCloud?.rememberAuth?.(r)}catch(_){} }
function token(){return String(cfg().token||'')}
function canAuto(){return DIRECT_GOOGLE&&navigator.onLine&&!!token()}
function bytesToB64(bytes){let s='';for(let i=0;i<bytes.length;i+=0x8000)s+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(s)}
function b64ToBytes(s){const raw=atob(String(s||'')),a=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)a[i]=raw.charCodeAt(i);return a}
async function gzipText(text){if(typeof CompressionStream!=='function')return '';const cs=new CompressionStream('gzip');const ab=await new Response(new Blob([String(text)]).stream().pipeThrough(cs)).arrayBuffer();return bytesToB64(new Uint8Array(ab))}
async function ungzipText(b64){if(typeof DecompressionStream!=='function')throw new Error('Browser kann Google-Sync-Daten nicht entpacken');const ds=new DecompressionStream('gzip');return await new Response(new Blob([b64ToBytes(b64)]).stream().pipeThrough(ds)).text()}
function googleCall(action,payload={},timeoutMs=60000){
 if(!DIRECT_GOOGLE)return Promise.reject(new Error('Studia muss über die Google-/exec-Web-App geöffnet sein'));
 return new Promise((resolve,reject)=>{
   let done=false;const timer=setTimeout(()=>{if(done)return;done=true;reject(new Error('Google-Sync antwortet nicht'))},timeoutMs);
   try{
     google.script.run
       .withSuccessHandler(async r=>{if(done)return;done=true;clearTimeout(timer);try{r=r||{};if(r.dataGzip){r.data=JSON.parse(await ungzipText(r.dataGzip));delete r.dataGzip}if(r.ok===false)throw new Error(String(r.error||'Google-Sync fehlgeschlagen'));resolve(r)}catch(e){reject(e)}})
       .withFailureHandler(er=>{if(done)return;done=true;clearTimeout(timer);reject(new Error(String(er&&er.message||er||'Google-Sync fehlgeschlagen')))})
       .v260ClientCall({action,...payload});
   }catch(e){if(!done){done=true;clearTimeout(timer);reject(e)}}
 })
}
function googleExecUrl(){const c=cfg();return cleanUrl(c.url||$('#v150ScriptUrl')?.value||'')}
function redirectToGoogle(){const url=googleExecUrl();if(!url)return false;rememberUrl(url);try{location.replace(url+'?action=app_v260');return true}catch(_){location.href=url+'?action=app_v260';return true}}
window.v260OpenGoogle=redirectToGoogle;
async function syncNow(reason='auto'){
 if(busy)return {busy:true};
 if(!DIRECT_GOOGLE){if(googleExecUrl())redirectToGoogle();return {google:false}}
 if(!navigator.onLine)return {offline:true};
 if(!token()){status('Google verbunden · bitte anmelden');return {auth:false}}
 busy=true;const serialAtStart=mutationSerial;status(reason==='manual'?'Synchronisiere mit Google …':'Automatische Synchronisierung …');
 try{
   try{if(document.body.classList.contains('editorMode'))window.saveCanvasSheetCore?.(true)}catch(_){}
   persist();
   const local=clone(dataRef()),base=baseRead();
   const raw=JSON.stringify(local),rawBase=JSON.stringify(base);let dataGzip='',baseGzip='';
   try{dataGzip=await gzipText(raw);baseGzip=await gzipText(rawBase)}catch(_){}
   const payload={token:token(),deviceId:deviceId(),deviceName:deviceName()};
   if(dataGzip&&dataGzip.length<raw.length)payload.dataGzip=dataGzip;else payload.data=raw;
   if(baseGzip&&baseGzip.length<rawBase.length)payload.baseGzip=baseGzip;else payload.base=rawBase;
   const r=await googleCall('sync',payload,90000);if(Number(r.version||0)<261)throw new Error('Google Backend V261 fehlt');
   const merged=r.data&&typeof r.data==='object'?r.data:local;setDataRef(merged);persist();baseSave(merged);lastSync=Date.now();
   try{window.renderAll?.();if($('#view-plan.active'))window.renderPlan?.();if($('#view-home.active'))window.renderHome?.();if($('#view-subjects.active'))window.renderSubjects?.();if($('#view-subject-detail.active'))window.renderSubjectDetail?.();if($('#view-topic-detail.active'))window.renderTopicDetail?.();if($('#view-deck-detail.active'))window.renderDeckDetail?.()}catch(_){}
   if(mutationSerial===serialAtStart){try{window.v150ClearDirty?.()}catch(_){}try{localStorage.setItem('studia-v242-dirty','0')}catch(_){}}else{try{window.v150MarkDirty?.(700)}catch(_){}}
   const n=Number(r.deviceCount||1);status(`Synchronisiert ✓${n>1?' · '+n+' Geräte':''}`);setTimeout(()=>{if(!busy)status('Auto-Sync aktiv ✓')},1600);return r;
 }catch(e){console.error('[Studia V261 Google sync]',e);status(String(e?.message||'Google-Sync fehlgeschlagen')+' · lokal sicher',true);throw e}
 finally{busy=false;if(mutationSerial!==serialAtStart)scheduleAuto('changed-during-sync',900)}
}
window.studiaSyncNow=(force)=>syncNow(force?'manual':'auto');window.v171CloudNow=()=>syncNow('manual');window.v171CloudNow.__v219Guarded=true;try{v171CloudNow=window.v171CloudNow}catch(_){}
function scheduleAuto(reason='change',delay=1000){clearTimeout(autoTimer);if(!canAuto())return;autoTimer=setTimeout(()=>syncNow(reason).catch(()=>{}),Math.max(300,Number(delay)||1000))}
const oldMark=window.v150MarkDirty;window.v150MarkDirty=function(delay=700){mutationSerial++;try{oldMark?.(delay)}catch(_){}scheduleAuto('Änderung',Math.max(750,Number(delay)||700))};
window.v150CloudDirty=window.v150CloudDirty||(()=>{try{return localStorage.getItem('studia-v242-dirty')==='1'}catch(_){return true}});

window.v171CloudLogin=async function(){
 if(!DIRECT_GOOGLE){const url=googleExecUrl();if(!url)throw new Error('Apps-Script-/exec-URL fehlt');redirectToGoogle();return}
 try{const username=$('#v150Username')?.value?.trim()||'',password=$('#v150Password')?.value||'';if(!username||!password)throw new Error('Benutzername und Passwort eingeben');status('Google-Anmeldung …');const r=await googleCall('login',{username,password});rememberAuth(r);try{localStorage.setItem('studia-v242-dirty','1')}catch(_){}status(`Angemeldet als ${r.user?.username||username} ✓`);await syncNow('login');return r}catch(e){status(String(e?.message||e),true);throw e}
};
window.v171CloudRegister=async function(){
 if(!DIRECT_GOOGLE){const url=googleExecUrl();if(!url)throw new Error('Apps-Script-/exec-URL fehlt');redirectToGoogle();return}
 try{const username=$('#v150Username')?.value?.trim()||'',password=$('#v150Password')?.value||'';if(!username||!password)throw new Error('Benutzername und Passwort eingeben');status('Studia-Konto wird angelegt …');const r=await googleCall('register',{username,password});rememberAuth(r);if(r.recoveryCode)alert('Wiederherstellungscode — sicher speichern:\n\n'+r.recoveryCode);try{localStorage.setItem('studia-v242-dirty','1')}catch(_){}await syncNow('register');return r}catch(e){status(String(e?.message||e),true);throw e}
};
if(window.StudiaCloud){window.StudiaCloud.health=()=>googleCall('health');window.StudiaCloud.login=(username,password)=>googleCall('login',{username,password});window.StudiaCloud.register=(username,password)=>googleCall('register',{username,password});window.StudiaCloud.me=()=>googleCall('me',{token:token()});}
function bind(){
 markVersion();const b=$('#v242DesktopSync');if(b){b.onclick=e=>{e.preventDefault();syncNow('manual').catch(()=>{})};b.title='Jetzt mit Google synchronisieren'}
 $$('.v171CloudSettings button').forEach(b=>{const t=(b.textContent||'').toLowerCase();if(/jetzt synchronisieren|geräte synchronisieren/.test(t)){b.removeAttribute('onclick');b.onclick=e=>{e.preventDefault();syncNow('manual').catch(()=>{})}}});
 const hint=$('#v246BackendHint');if(hint)hint.textContent='Google Auto-Sync V261 · direkt in der Google-Web-App.';
 let info=$('#v260GoogleSyncInfo'),card=$('.v171CloudSettings');if(card&&!info){info=document.createElement('div');info.id='v260GoogleSyncInfo';card.appendChild(info)}
 if(info&&!busy)info.textContent='Google Auto-Sync · '+(DIRECT_GOOGLE?(token()?'aktiv ✓':'bitte anmelden'):'öffnet über Google …');
}
const oldOpen=window.openView;if(typeof oldOpen==='function'&&!oldOpen.__v260){window.openView=function(){const r=oldOpen.apply(this,arguments);setTimeout(bind,25);return r};window.openView.__v260=true;try{openView=window.openView}catch(_){} }
window.addEventListener('online',()=>scheduleAuto('online',350));window.addEventListener('focus',()=>scheduleAuto('focus',450));window.addEventListener('pageshow',()=>scheduleAuto('pageshow',550));document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')scheduleAuto('sichtbar',450)});
setInterval(()=>{if(document.visibilityState==='visible'&&canAuto()&&Date.now()-lastSync>18000)scheduleAuto('intervall',250)},20000);
[0,150,600,1500].forEach(t=>setTimeout(()=>{bind();if(DIRECT_GOOGLE&&token())scheduleAuto('start',t?600:1000)},t));
setInterval(markVersion,5000);
if(!DIRECT_GOOGLE && /^https:\/\/gurkenfurzi\.github\.io$/i.test(location.origin||'') && googleExecUrl())setTimeout(()=>redirectToGoogle(),350);
})();
