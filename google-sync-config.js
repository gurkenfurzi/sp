/* Studia V242 — single cloud transport. No stacked wrappers. */
(()=>{
'use strict';
if(window.__STUDIA_V242_CLOUD__) return;
window.__STUDIA_V242_CLOUD__=true;
const $=s=>document.querySelector(s);
const URL_KEYS=['studia-v242-script-url','studia-v234-script-url','studia-script-url','schoolhub-script-url','google-sync-script-url'];
const TOKEN_KEYS=['studia-v242-token','studia-v234-token','studia-token','schoolhub-token','cloud-token'];
const USER_KEYS=['studia-v242-user','studia-v234-user','studia-user','schoolhub-user'];
const DIRTY='studia-v242-dirty';
let dirtyTimer=0;
const safeJSON=(s,f=null)=>{try{return JSON.parse(s)}catch(_){return f}};
function scanUrl(){
  const inp=$('#v150ScriptUrl'); if(inp?.value?.trim()) return inp.value.trim();
  for(const k of URL_KEYS){const v=String(localStorage.getItem(k)||'').trim();if(/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec/i.test(v)) return v}
  for(let i=0;i<localStorage.length;i++){
    const v=String(localStorage.getItem(localStorage.key(i)||'')||'');
    const m=v.match(/https:\/\/script\.google\.com\/macros\/s\/[^"'\s]+\/exec/i); if(m) return m[0];
  }
  return '';
}
function scanToken(){
  for(const k of TOKEN_KEYS){const v=String(localStorage.getItem(k)||'');if(v.length>20)return v}
  for(let i=0;i<localStorage.length;i++){
    const k=String(localStorage.key(i)||''),raw=String(localStorage.getItem(k)||'');
    if(!/(studia|schoolhub|schoolbloom|cloud).*(token|session)|(token|session).*(studia|schoolhub|schoolbloom|cloud)/i.test(k)) continue;
    if(raw.length>20&&!raw.startsWith('{')&&!raw.startsWith('[')) return raw;
    const o=safeJSON(raw); const t=o?.token||o?.sessionToken||o?.session; if(typeof t==='string'&&t.length>20)return t;
  }
  return '';
}
function config(){return {url:scanUrl(),token:scanToken()}}
function rememberUrl(url){url=String(url||'').trim();if(!url)return;for(const k of URL_KEYS)localStorage.setItem(k,url);const i=$('#v150ScriptUrl');if(i)i.value=url}
function rememberAuth(r){if(r?.token)for(const k of TOKEN_KEYS)localStorage.setItem(k,String(r.token));if(r?.user)for(const k of USER_KEYS)localStorage.setItem(k,JSON.stringify(r.user))}
function rememberedUser(){for(const k of USER_KEYS){const o=safeJSON(localStorage.getItem(k)||'');if(o)return o}return null}
function normalizeUrl(url){return String(url||'').trim().replace(/\?.*$/,'')}
function setStatus(text,bad=false){
  const s=String(text||'');
  const a=$('#v150AccountStatus'); if(a){a.textContent=s;a.classList.toggle('error',!!bad)}
  const b=$('#v242DesktopSync small'); if(b)b.textContent=s;
  const c=$('#v242SyncStatus'); if(c){c.textContent=s;c.classList.toggle('bad',!!bad)}
  const p=$('#v242PullSync'); if(p&&/Synchron/i.test(s))p.textContent=s;
}
function timeout(ms){const c=new AbortController(),id=setTimeout(()=>c.abort(),ms);return {signal:c.signal,done:()=>clearTimeout(id)}}
async function parse(res){
  const txt=await res.text(); let out;
  try{out=JSON.parse(txt)}catch(_){
    if(/<!doctype|<html/i.test(txt))throw new Error('Cloud-Web-App ist nicht öffentlich erreichbar oder die Deployment-URL ist falsch');
    throw new Error('Cloud antwortet nicht mit gültigem JSON');
  }
  if(!out?.ok){const msg=String(out?.error||`Serverfehler ${res.status}`);const e=new Error(msg);e.status=out?.status||res.status;throw e}
  return out;
}
async function runCloudRequest(makeRequest,ms,label){
  const t=timeout(ms);
  try{return await parse(await makeRequest(t.signal))}
  catch(e){
    if(e?.name==='AbortError')throw new Error(`${label} dauert zu lange`);
    if(e instanceof TypeError)throw new Error(`${label} nicht erreichbar`);
    throw e;
  }finally{t.done()}
}
async function get(action,params={}){
  const c=config(); if(!c.url)throw new Error('Server-Script-Service-URL fehlt');
  const u=new URL(normalizeUrl(c.url));u.searchParams.set('action',action);u.searchParams.set('_',String(Date.now()));
  for(const[k,v]of Object.entries(params))if(v!=null&&v!=='')u.searchParams.set(k,String(v));
  const label=action==='state'?'Daten laden':action==='me'?'Anmeldung prüfen':action==='health'?'Server prüfen':action;
  return runCloudRequest(signal=>fetch(u.toString(),{method:'GET',cache:'no-store',redirect:'follow',credentials:'omit',signal}),8000,label);
}
async function post(action,payload={}){
  const c=config(); if(!c.url)throw new Error('Server-Script-Service-URL fehlt');
  const label=action==='sync'?'Geräte synchronisieren':action==='state_put'?'Daten speichern':action==='login'?'Anmeldung':action==='register'?'Registrierung':action;
  const ms=action==='sync'?25000:(action==='state_put'?12000:10000);
  return runCloudRequest(signal=>fetch(normalizeUrl(c.url),{method:'POST',cache:'no-store',redirect:'follow',credentials:'omit',signal,headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,...payload})}),ms,label);
}
async function health(){return v279Bounce('health',{},30000)}
async function me(){const c=config();if(!c.token)throw new Error('Nicht angemeldet');return v279Bounce('me',{token:c.token},30000)}
async function getState(){const c=config();if(!c.token)throw new Error('Nicht angemeldet');return get('state',{token:c.token})}
async function putState(data){const c=config();if(!c.token)throw new Error('Nicht angemeldet');return post('state_put',{token:c.token,data})}
function v247BytesToB64(bytes){let s='';const step=0x8000;for(let i=0;i<bytes.length;i+=step)s+=String.fromCharCode(...bytes.subarray(i,i+step));return btoa(s)}
function v247B64ToBytes(b64){const s=atob(String(b64||'')),a=new Uint8Array(s.length);for(let i=0;i<s.length;i++)a[i]=s.charCodeAt(i);return a}
async function v247GzipText(text){if(typeof CompressionStream!=='function')return '';const cs=new CompressionStream('gzip');const ab=await new Response(new Blob([String(text)]).stream().pipeThrough(cs)).arrayBuffer();return v247BytesToB64(new Uint8Array(ab))}
async function v247UngzipText(b64){if(typeof DecompressionStream!=='function')throw new Error('Browser kann Cloud-Daten nicht entpacken');const ds=new DecompressionStream('gzip');return await new Response(new Blob([v247B64ToBytes(b64)]).stream().pipeThrough(ds)).text()}
const V279_BASE_KEY='studia-v242-last-synced-state';
const V279_CLOUD_AT='studia-v265-cloud-updated-at';
function v279SecureId(){try{const a=new Uint32Array(4);crypto.getRandomValues(a);return [...a].map(x=>x.toString(36)).join('')}catch(_){return Date.now().toString(36)+Math.random().toString(36).slice(2)}}
function v279DeviceId(){let v='';try{v=localStorage.getItem('studia-v265-device-id')||localStorage.getItem('studia-v264-device-id')||''}catch(_){}if(!v){v='d-'+v279SecureId()}try{localStorage.setItem('studia-v265-device-id',v)}catch(_){}return v}
function v279DeviceName(){return /iPhone|iPad|Android|Mobile/i.test(navigator.userAgent)?'Handy':'Laptop'}
function v279DecodeB64UrlJson(s){let b=String(s||'').replace(/-/g,'+').replace(/_/g,'/');while(b.length%4)b+='=';const raw=atob(b),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return JSON.parse(new TextDecoder().decode(bytes)||'{}')}
function v279ReadBase(){try{return JSON.parse(localStorage.getItem(V279_BASE_KEY)||'{}')}catch(_){return {}}}
function v279SaveBase(v){try{localStorage.setItem(V279_BASE_KEY,JSON.stringify(v||{}))}catch(_){}}
function v279Bounce(action,payload={},timeoutMs=45000){
  const c=config();if(!c.url)return Promise.reject(new Error('Apps-Script-/exec-URL fehlt'));
  return new Promise((resolve,reject)=>{
    const callId='v279-'+v279SecureId(),frameName='studiaV279_'+v279SecureId();let done=false;
    const frame=document.createElement('iframe');frame.name=frameName;frame.style.cssText='position:fixed;width:1px;height:1px;left:-9999px;top:-9999px;border:0;opacity:0;pointer-events:none';
    const form=document.createElement('form');form.method='POST';form.action=normalizeUrl(c.url);form.target=frameName;form.enctype='application/x-www-form-urlencoded';form.acceptCharset='UTF-8';form.style.display='none';
    const add=(k,v)=>{const i=document.createElement('input');i.type='hidden';i.name=k;i.value=String(v??'');form.appendChild(i)};
    add('action','bridge_bounce_v265');add('bounceAction',action);add('callId',callId);for(const[k,v]of Object.entries(payload))if(v!=null)add(k,v);
    const cleanup=()=>{if(done)return;done=true;clearTimeout(to);window.removeEventListener('message',onmsg);setTimeout(()=>{try{form.remove()}catch(_){}try{frame.remove()}catch(_){}},0)};
    const fail=e=>{cleanup();reject(e instanceof Error?e:new Error(String(e||'Google-Sync fehlgeschlagen')))};
    const onmsg=ev=>{if(ev.origin!==location.origin)return;const m=ev.data;if(!m||m.type!=='studia-v265-bounce'||m.callId!==callId)return;try{const r=v279DecodeB64UrlJson(m.payload);cleanup();if(!r?.ok)throw new Error(String(r?.error||'Google-Sync fehlgeschlagen'));resolve(r)}catch(e){fail(e)}};
    const to=setTimeout(()=>fail(new Error('Google-Sync-Antwort kam nicht zurück · sync-bridge.html oder Apps-Script-Bereitstellung prüfen')),timeoutMs);
    window.addEventListener('message',onmsg);document.body.append(frame,form);try{form.submit()}catch(e){fail(e)}
  });
}
function v280DirectBridge(payload={}, timeoutMs=120000){
  const c=config();if(!c.url)return Promise.reject(new Error('Apps-Script-/exec-URL fehlt'));
  return new Promise((resolve,reject)=>{
    const bridgeId='v280-'+v279SecureId(),frameName='studiaV280_'+v279SecureId();let done=false;
    const frame=document.createElement('iframe');frame.name=frameName;frame.style.cssText='position:fixed;width:1px;height:1px;left:-9999px;top:-9999px;border:0;opacity:0;pointer-events:none';
    const form=document.createElement('form');form.method='POST';form.action=normalizeUrl(c.url);form.target=frameName;form.enctype='application/x-www-form-urlencoded';form.acceptCharset='UTF-8';form.style.display='none';
    const add=(k,v)=>{const i=document.createElement('input');i.type='hidden';i.name=k;i.value=String(v??'');form.appendChild(i)};
    add('action','sync_bridge_v253');add('bridgeId',bridgeId);add('replyGzip','1');
    for(const[k,v]of Object.entries(payload))if(v!=null)add(k,v);
    const cleanup=()=>{if(done)return;done=true;clearTimeout(to);window.removeEventListener('message',onmsg);setTimeout(()=>{try{form.remove()}catch(_){}try{frame.remove()}catch(_){}},0)};
    const fail=e=>{cleanup();reject(e instanceof Error?e:new Error(String(e||'Google-Sync fehlgeschlagen')))};
    const onmsg=ev=>{const m=ev.data;if(!m||m.type!=='studia-sync-bridge'||m.id!==bridgeId)return;try{cleanup();const r=m.payload;if(!r?.ok)throw new Error(String(r?.error||'Google-Sync fehlgeschlagen'));resolve(r)}catch(e){fail(e)}};
    const to=setTimeout(()=>fail(new Error('Schneller Cloud-Sync hat zu lange gebraucht')),timeoutMs);
    window.addEventListener('message',onmsg);document.body.append(frame,form);try{form.submit()}catch(e){fail(e)}
  });
}
async function v280DecodeReply(r){
  if(r?.data&&typeof r.data==='object')return r.data;
  if(r?.dataGzip){try{return JSON.parse(await v247UngzipText(String(r.dataGzip))||'{}')}catch(e){throw new Error('Cloud-Daten konnten nicht entpackt werden')}}
  return {};
}
async function v279PullFull(meta){
  const total=Math.max(0,Number(meta?.transportChunks||0)),expected=Number(meta?.updatedAt||0);if(!total)return {};
  let encoded='';
  const concurrency=Math.min(10,total),parts=new Array(total);let next=0,done=0;
  async function worker(){while(true){const i=next++;if(i>=total)return;const r=await v279Bounce('pull_chunk',{token:config().token,index:i,expectedUpdatedAt:expected},45000);if(Number(r.updatedAt||0)!==expected)throw new Error('Cloud wurde während des Ladens geändert · erneut synchronisieren');parts[i]=String(r.chunk||'');done++;setStatus(`Cloud lädt schnell ${done}/${total} …`)}}
  await Promise.all(Array.from({length:concurrency},worker));encoded=parts.join('');return await v247UngzipText(encoded)
}
async function syncState(data){
  const c=config();if(!c.token)throw new Error('Nicht angemeldet');
  const p={token:c.token,deviceId:v279DeviceId(),deviceName:v279DeviceName()};
  const raw=JSON.stringify(data||{}),baseRaw=JSON.stringify(v279ReadBase()||{});let gz='',bgz='';
  try{gz=await v247GzipText(raw)}catch(_){};try{bgz=await v247GzipText(baseRaw)}catch(_){};
  if(gz&&gz.length<raw.length)p.dataGzip=gz;else p.data=raw;
  if(bgz&&bgz.length<baseRaw.length)p.baseGzip=bgz;else p.base=baseRaw;
  setStatus('Cloud wird schnell synchronisiert …');
  try{
    const r=await v280DirectBridge(p,120000);
    const merged=await v280DecodeReply(r);
    v279SaveBase(merged);try{localStorage.setItem(V279_CLOUD_AT,String(Number(r.updatedAt)||Date.now()))}catch(_){}
    setStatus('Cloud synchronisiert ✓');
    return {...r,data:merged};
  }catch(fastErr){
    console.warn('Studia fast sync fallback:',fastErr);
    setStatus('Schneller Sync nicht verfügbar · Ersatzweg …');
    const meta=await v279Bounce('sync_push',p,90000);
    if(Number(meta.version||0)<265)throw new Error('Apps-Script V265 fehlt · Code.gs neu bereitstellen');
    const merged=await v279PullFull(meta);
    v279SaveBase(merged);try{localStorage.setItem(V279_CLOUD_AT,String(Number(meta.updatedAt)||0))}catch(_){}
    return {...meta,data:merged};
  }
}
async function login(username,password){const r=await v279Bounce('login',{username,password},30000);rememberAuth(r);return r}
async function register(username,password){const r=await v279Bounce('register',{username,password},30000);rememberAuth(r);return r}
window.StudiaCloud={config,rememberUrl,rememberAuth,rememberedUser,health,me,getState,putState,syncState,login,register,setStatus};
window.GOOGLE_SYNC_CONFIG=window.GOOGLE_SYNC_CONFIG||{};
try{Object.defineProperty(window.GOOGLE_SYNC_CONFIG,'scriptUrl',{configurable:true,get:scanUrl,set:rememberUrl})}catch(_){window.GOOGLE_SYNC_CONFIG.scriptUrl=scanUrl()}
window.v150MarkDirty=function(delay=700){
  localStorage.setItem(DIRTY,'1');clearTimeout(dirtyTimer);
  try{document.getElementById('v242DesktopSync')?.classList.add('dirty')}catch(_){}
};
window.v150CloudDirty=()=>localStorage.getItem(DIRTY)==='1';
window.v150ClearDirty=()=>localStorage.setItem(DIRTY,'0');
window.v171CloudLogin=async function(){
  try{
    const url=$('#v150ScriptUrl')?.value?.trim()||scanUrl(),username=$('#v150Username')?.value?.trim()||'',password=$('#v150Password')?.value||'';
    if(!url)throw new Error('Server-Script-Service-URL fehlt');if(!username||!password)throw new Error('Benutzername und Passwort eingeben');
    rememberUrl(url);setStatus('Verbindung wird geprüft …');await health();const r=await login(username,password);setStatus(`Angemeldet als ${r.user?.username||username} ✓`);localStorage.setItem(DIRTY,'1');await window.studiaSyncNow?.(true);return r;
  }catch(e){setStatus(String(e?.message||e),true);try{window.cuteToast?.('Sync: '+String(e?.message||e))}catch(_){}throw e}
};
window.v171CloudRegister=async function(){
  try{
    const url=$('#v150ScriptUrl')?.value?.trim()||scanUrl(),username=$('#v150Username')?.value?.trim()||'',password=$('#v150Password')?.value||'';
    if(!url)throw new Error('Server-Script-Service-URL fehlt');if(!username||!password)throw new Error('Benutzername und Passwort eingeben');
    rememberUrl(url);setStatus('Konto wird erstellt …');await health();const r=await register(username,password);setStatus(`Konto ${r.user?.username||username} erstellt ✓`);if(r.recoveryCode)alert('Wiederherstellungscode — sicher speichern:\n\n'+r.recoveryCode);localStorage.setItem(DIRTY,'1');await window.studiaSyncNow?.(true);return r;
  }catch(e){setStatus(String(e?.message||e),true);throw e}
};

/* V278 compatibility adapter: the app's merge layer expects window.v171CloudNow.
   The cloud module above exposes StudiaCloud.syncState(), so bridge the two here. */
window.v171CloudNow = async function(){
  if(!window.StudiaCloud || typeof window.StudiaCloud.syncState!=='function'){
    throw new Error('Google-Sync-Modul ist nicht geladen');
  }
  const current = (typeof data!=='undefined' && data && typeof data==='object') ? data : {};
  const result = await window.StudiaCloud.syncState(current);
  if(result && result.data && typeof result.data==='object' && typeof data!=='undefined' && data && typeof data==='object'){
    for(const k of Object.keys(data)) delete data[k];
    Object.assign(data, result.data);
    try{ localStorage.setItem('studiaData', JSON.stringify(data)); }catch(_){ }
    try{ window.v150ClearDirty?.(); }catch(_){ }
  }
  return result;
};
window.v171CloudNow.__v278Adapter = true;

function hydrate(){const url=scanUrl();if(url)rememberUrl(url);const u=rememberedUser();if(url&&scanToken())setStatus(u?.username?`Angemeldet als ${u.username}`:'Angemeldet · bereit');else setStatus('Noch nicht verbunden.')}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',hydrate,{once:true});else hydrate();
})();
