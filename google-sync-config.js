/* Studia V284 — one-request device merge transport.
   One iframe POST, one merged response. No /550 block loop, no JSONP. */
(()=>{
'use strict';
if(window.__STUDIA_V284_CLOUD__)return;window.__STUDIA_V284_CLOUD__=true;
const $=s=>document.querySelector(s);
const URL_KEYS=['studia-v284-script-url','studia-v242-script-url','studia-v234-script-url','studia-script-url','schoolhub-script-url','google-sync-script-url'];
const TOKEN_KEYS=['studia-v284-token','studia-v242-token','studia-v234-token','studia-token','schoolhub-token','cloud-token'];
const USER_KEYS=['studia-v284-user','studia-v242-user','studia-v234-user','studia-user','schoolhub-user'];
const HASH_KEY='studia-v284-local-hashes';
const DIRTY_KEY='studia-v284-dirty';
const COLLECTIONS=['homework','tests','writtenTests','grades','flashcards','subjects','absences','studySessions','reminders','flashDecks','quizzes','studySheets','missedHours'];
const MAPS=['canvasSheets','lessonExtras'];
const FIELDS=['settings','timetable','timetableSubjectColors','economy'];
let busy=false,pending=false,timer=0;
const clone=v=>{try{return structuredClone(v)}catch(_){try{return JSON.parse(JSON.stringify(v))}catch(__){return v}}};
const isObj=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const safeJSON=(s,f=null)=>{try{return JSON.parse(s)}catch(_){return f}};
function scanUrl(){
  const inp=$('#v150ScriptUrl');if(inp?.value?.trim())return inp.value.trim();
  if(window.STUDIA_SYNC_CONFIG?.scriptUrl)return String(window.STUDIA_SYNC_CONFIG.scriptUrl).trim();
  for(const k of URL_KEYS){const v=String(localStorage.getItem(k)||'').trim();if(/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec/i.test(v))return v}
  for(let i=0;i<localStorage.length;i++){const v=String(localStorage.getItem(localStorage.key(i)||'')||'');const m=v.match(/https:\/\/script\.google\.com\/macros\/s\/[^"'\s]+\/exec/i);if(m)return m[0]}
  return '';
}
function scanToken(){for(const k of TOKEN_KEYS){const v=String(localStorage.getItem(k)||'');if(v.length>20)return v}return ''}
function rememberUrl(url){url=String(url||'').trim();if(!url)return;for(const k of URL_KEYS)localStorage.setItem(k,url);const i=$('#v150ScriptUrl');if(i)i.value=url}
function rememberAuth(r){if(r?.token)for(const k of TOKEN_KEYS)localStorage.setItem(k,String(r.token));if(r?.user)for(const k of USER_KEYS)localStorage.setItem(k,JSON.stringify(r.user))}
function rememberedUser(){for(const k of USER_KEYS){const o=safeJSON(localStorage.getItem(k)||'');if(o)return o}return null}
function normalizeUrl(url){return String(url||'').trim().replace(/\?.*$/,'')}
function setStatus(text,bad=false){
  const s=String(text||'');
  const a=$('#v150AccountStatus');if(a){a.textContent=s;a.classList.toggle('error',!!bad)}
  for(const sel of ['#v232DesktopSync small','#v242DesktopSync small','#v232SyncStatusInline','#v242SyncStatus']){const e=$(sel);if(e)e.textContent=s}
}
function secureId(){try{const a=new Uint32Array(4);crypto.getRandomValues(a);return [...a].map(x=>x.toString(36)).join('')}catch(_){return Date.now().toString(36)+Math.random().toString(36).slice(2)}}
function deviceId(){let v=localStorage.getItem('studia-v284-device-id')||localStorage.getItem('studia-v265-device-id')||'';if(!v){v='d-'+secureId();localStorage.setItem('studia-v284-device-id',v)}return v}
function deviceName(){return /iPhone|iPad|Android|Mobile/i.test(navigator.userAgent)?'Handy':'Laptop'}
function bytesToB64(bytes){let s='';for(let i=0;i<bytes.length;i+=0x8000)s+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(s)}
function b64ToBytes(b64){const s=atob(String(b64||'')),a=new Uint8Array(s.length);for(let i=0;i<s.length;i++)a[i]=s.charCodeAt(i);return a}
async function gzipText(text){if(typeof CompressionStream!=='function')return '';const cs=new CompressionStream('gzip');const ab=await new Response(new Blob([String(text)]).stream().pipeThrough(cs)).arrayBuffer();return bytesToB64(new Uint8Array(ab))}
async function ungzipText(b64){if(typeof DecompressionStream!=='function')throw new Error('Browser kann Cloud-Daten nicht entpacken');const ds=new DecompressionStream('gzip');return await new Response(new Blob([b64ToBytes(b64)]).stream().pipeThrough(ds)).text()}
function stable(v){
  if(Array.isArray(v))return '['+v.map(stable).join(',')+']';
  if(isObj(v)){return '{'+Object.keys(v).filter(k=>!/^_v284|^_syncV284$|^_syncMeta$|^__studiaSyncMeta$|^_updatedAt$|^__studiaUpdatedAt$/.test(k)).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}'}
  return JSON.stringify(v);
}
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(36)}
function itemId(x,path='item'){if(!isObj(x))return '';if(x.id!=null&&String(x.id).trim())return String(x.id);const id='legacy-'+hash(path+'|'+stable(x));x.id=id;return id}
function ghost(kind,x){
  if(!isObj(x))return true;const val=o=>String(o??'').trim();const meaningful=s=>/[\p{L}\p{N}]/u.test(val(s));
  if(kind==='homework'){const words=[x.subject,x.text,x.note].some(meaningful),files=Array.isArray(x.files)&&x.files.length,hasDue=/^\d{4}-\d{2}-\d{2}$/.test(val(x.due));return !words&&!files&&!hasDue}
  if(kind==='tests'){const words=[x.subject,x.type,x.text].some(meaningful),files=Array.isArray(x.files)&&x.files.length,hasDate=/^\d{4}-\d{2}-\d{2}$/.test(val(x.date));return !words&&!files&&!hasDate}
  return false;
}
function readHashes(){const o=safeJSON(localStorage.getItem(HASH_KEY)||'{}',{});o.collections||={};o.maps||={};o.fields||={};o.tombstones||={};o.mapTombstones||={};return o}
function writeHashes(o){try{localStorage.setItem(HASH_KEY,JSON.stringify(o||{}))}catch(_){}}
function preparePayload(source){
  const now=Date.now(),h=readHashes(),out={_syncV284:{version:1,tombstones:clone(h.tombstones||{}),mapTombstones:clone(h.mapTombstones||{}),fieldTs:{}}};
  for(const key of COLLECTIONS){
    const arr=(Array.isArray(source?.[key])?source[key]:[]).filter(x=>!ghost(key,x));const prev=h.collections[key]||{},next={};out[key]=[];out._syncV284.tombstones[key]||={};
    for(const raw of arr){const x=clone(raw),id=itemId(x,key),sig=hash(stable(x)),old=prev[id];if(!old||old.hash!==sig)x._v284UpdatedAt=Math.max(Number(x._v284UpdatedAt||0),now);else x._v284UpdatedAt=Math.max(Number(x._v284UpdatedAt||0),Number(old.ts||1));next[id]={hash:sig,ts:Number(x._v284UpdatedAt||1)};delete out._syncV284.tombstones[key][id];out[key].push(x)}
    for(const id of Object.keys(prev))if(!next[id])out._syncV284.tombstones[key][id]=Math.max(Number(out._syncV284.tombstones[key][id]||0),now);
    h.collections[key]=next;
  }
  for(const key of MAPS){const src=isObj(source?.[key])?source[key]:{},prev=h.maps[key]||{},next={};out[key]={};out._syncV284.mapTombstones[key]||={};
    for(const [id,raw] of Object.entries(src)){const x=clone(raw),sig=hash(stable(x)),old=prev[id];if(isObj(x))x._v284UpdatedAt=!old||old.hash!==sig?Math.max(Number(x._v284UpdatedAt||0),now):Math.max(Number(x._v284UpdatedAt||0),Number(old.ts||1));next[id]={hash:sig,ts:Number(x?._v284UpdatedAt||1)};delete out._syncV284.mapTombstones[key][id];out[key][id]=x}
    for(const id of Object.keys(prev))if(!next[id])out._syncV284.mapTombstones[key][id]=Math.max(Number(out._syncV284.mapTombstones[key][id]||0),now);h.maps[key]=next;
  }
  for(const key of FIELDS){const v=clone(source?.[key]),sig=hash(stable(v)),old=h.fields[key];const ts=!old||old.hash!==sig?now:Number(old.ts||1);out._syncV284.fieldTs[key]=ts;h.fields[key]={hash:sig,ts};if(v!==undefined)out[key]=v}
  h.tombstones=clone(out._syncV284.tombstones);h.mapTombstones=clone(out._syncV284.mapTombstones);writeHashes(h);return out;
}
function acceptMerged(merged){
  const h={collections:{},maps:{},fields:{},tombstones:clone(merged?._syncV284?.tombstones||{}),mapTombstones:clone(merged?._syncV284?.mapTombstones||{})};
  for(const key of COLLECTIONS){h.collections[key]={};for(const x of Array.isArray(merged?.[key])?merged[key]:[]){const id=itemId(x,key);h.collections[key][id]={hash:hash(stable(x)),ts:Number(x._v284UpdatedAt||1)}}}
  for(const key of MAPS){h.maps[key]={};for(const [id,x] of Object.entries(isObj(merged?.[key])?merged[key]:{}))h.maps[key][id]={hash:hash(stable(x)),ts:Number(x?._v284UpdatedAt||1)}}
  for(const key of FIELDS){if(merged&&key in merged)h.fields[key]={hash:hash(stable(merged[key])),ts:Number(merged?._syncV284?.fieldTs?.[key]||1)}}writeHashes(h);
}
function direct(action,payload={},timeoutMs=70000){
  const url=scanUrl();if(!url)return Promise.reject(new Error('Apps-Script-/exec-URL fehlt'));
  return new Promise((resolve,reject)=>{
    const callId='v284-'+secureId(),frame=document.createElement('iframe'),form=document.createElement('form');let done=false;
    frame.name='studiaV284_'+secureId();frame.style.cssText='position:fixed;width:1px;height:1px;left:-9999px;top:-9999px;border:0;opacity:0;pointer-events:none';
    form.method='POST';form.action=normalizeUrl(url);form.target=frame.name;form.enctype='application/x-www-form-urlencoded';form.acceptCharset='UTF-8';form.style.display='none';
    const add=(k,v)=>{const i=document.createElement('input');i.type='hidden';i.name=k;i.value=String(v??'');form.appendChild(i)};add('action','bridge_direct_v284');add('directAction',action);add('callId',callId);for(const[k,v]of Object.entries(payload))if(v!=null)add(k,v);
    const cleanup=()=>{if(done)return;done=true;clearTimeout(to);window.removeEventListener('message',onmsg);setTimeout(()=>{try{form.remove()}catch(_){}try{frame.remove()}catch(_){}},0)};
    const fail=e=>{cleanup();reject(e instanceof Error?e:new Error(String(e||'Google-Sync fehlgeschlagen')))};
    const onmsg=ev=>{if(ev.source!==frame.contentWindow)return;const m=ev.data;if(!m||m.type!=='studia-v284-direct'||m.callId!==callId)return;cleanup();const r=m.result||{};if(!r.ok)return reject(new Error(String(r.error||'Google-Sync fehlgeschlagen')));resolve(r)};
    const to=setTimeout(()=>fail(new Error('Google-Sync dauert zu lange')),timeoutMs);window.addEventListener('message',onmsg);document.body.append(frame,form);try{form.submit()}catch(e){fail(e)}
  });
}
async function decodeData(r){if(isObj(r?.data))return r.data;if(r?.dataGzip){const txt=await ungzipText(String(r.dataGzip));return safeJSON(txt,{})||{}}return {}}
async function health(){return direct('health',{},25000)}
async function login(username,password){const r=await direct('login',{username,password},30000);rememberAuth(r);return r}
async function register(username,password){const r=await direct('register',{username,password},30000);rememberAuth(r);return r}
async function me(){const token=scanToken();if(!token)throw new Error('Nicht angemeldet');return direct('me',{token},25000)}
async function syncState(source){
  const token=scanToken();if(!token)throw new Error('Nicht angemeldet');const prepared=preparePayload(source||{}),raw=JSON.stringify(prepared);let gz='';try{gz=await gzipText(raw)}catch(_){}
  const payload={token,deviceId:deviceId(),deviceName:deviceName()};if(gz&&gz.length<raw.length)payload.dataGzip=gz;else payload.data=raw;
  const r=await direct('sync',payload,90000);if(Number(r.version||0)<284)throw new Error('Apps-Script V284 fehlt · Code.gs neu bereitstellen');const data=await decodeData(r);acceptMerged(data);return {...r,data};
}
window.StudiaCloudV284={syncState,health,login,register,me,setStatus,rememberUrl,rememberAuth,rememberedUser,scanUrl,scanToken};
window.StudiaCloud=window.StudiaCloudV284;
window.GOOGLE_SYNC_CONFIG=window.GOOGLE_SYNC_CONFIG||{};try{Object.defineProperty(window.GOOGLE_SYNC_CONFIG,'scriptUrl',{configurable:true,get:scanUrl,set:rememberUrl})}catch(_){window.GOOGLE_SYNC_CONFIG.scriptUrl=scanUrl()}
window.v171CloudLogin=async()=>{try{const url=$('#v150ScriptUrl')?.value?.trim()||scanUrl(),u=$('#v150Username')?.value?.trim()||'',p=$('#v150Password')?.value||'';if(url)rememberUrl(url);setStatus('Verbindung wird geprüft …');await health();const r=await login(u,p);setStatus(`Angemeldet als ${r.user?.username||u} ✓`);localStorage.setItem(DIRTY_KEY,'1');setTimeout(()=>window.studiaSyncNow?.().catch(()=>{}),50);return r}catch(e){setStatus(String(e?.message||e),true);throw e}};
window.v171CloudRegister=async()=>{try{const url=$('#v150ScriptUrl')?.value?.trim()||scanUrl(),u=$('#v150Username')?.value?.trim()||'',p=$('#v150Password')?.value||'';if(url)rememberUrl(url);setStatus('Konto wird erstellt …');await health();const r=await register(u,p);setStatus(`Konto ${r.user?.username||u} erstellt ✓`);if(r.recoveryCode)alert('Wiederherstellungscode — sicher speichern:\n\n'+r.recoveryCode);localStorage.setItem(DIRTY_KEY,'1');setTimeout(()=>window.studiaSyncNow?.().catch(()=>{}),50);return r}catch(e){setStatus(String(e?.message||e),true);throw e}};
function hydrate(){const url=scanUrl();if(url)rememberUrl(url);const u=rememberedUser();if(url&&scanToken())setStatus(u?.username?`Angemeldet als ${u.username}`:'Angemeldet · bereit');else setStatus('Noch nicht verbunden.')}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',hydrate,{once:true});else hydrate();
})();
