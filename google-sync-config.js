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
async function health(){return get('health')}
async function me(){const c=config();if(!c.token)throw new Error('Nicht angemeldet');return get('me',{token:c.token})}
async function getState(){const c=config();if(!c.token)throw new Error('Nicht angemeldet');return get('state',{token:c.token})}
async function putState(data){const c=config();if(!c.token)throw new Error('Nicht angemeldet');return post('state_put',{token:c.token,data})}
function v247BytesToB64(bytes){let s='';const step=0x8000;for(let i=0;i<bytes.length;i+=step)s+=String.fromCharCode(...bytes.subarray(i,i+step));return btoa(s)}
function v247B64ToBytes(b64){const s=atob(String(b64||'')),a=new Uint8Array(s.length);for(let i=0;i<s.length;i++)a[i]=s.charCodeAt(i);return a}
async function v247GzipText(text){if(typeof CompressionStream!=='function')return '';const cs=new CompressionStream('gzip');const ab=await new Response(new Blob([String(text)]).stream().pipeThrough(cs)).arrayBuffer();return v247BytesToB64(new Uint8Array(ab))}
async function v247UngzipText(b64){if(typeof DecompressionStream!=='function')throw new Error('Browser kann Cloud-Daten nicht entpacken');const ds=new DecompressionStream('gzip');return await new Response(new Blob([v247B64ToBytes(b64)]).stream().pipeThrough(ds)).text()}
async function v247BridgeSync(data){
  const c=config();if(!c.url)throw new Error('Server-Script-Service-URL fehlt');if(!c.token)throw new Error('Nicht angemeldet');
  const id='v247-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
  const name='studiaBridge_'+id.replace(/[^a-z0-9_]/gi,'');
  const frame=document.createElement('iframe');frame.name=name;frame.style.cssText='position:fixed;width:1px;height:1px;left:-9999px;top:-9999px;border:0;opacity:0;pointer-events:none';
  const form=document.createElement('form');form.method='POST';form.action=normalizeUrl(c.url);form.target=name;form.enctype='application/x-www-form-urlencoded';form.acceptCharset='UTF-8';form.style.display='none';
  const add=(k,v)=>{const i=document.createElement('input');i.type='hidden';i.name=k;i.value=String(v??'');form.appendChild(i)};
  add('action','sync_bridge');add('token',c.token);add('bridgeId',id);add('replyGzip',typeof DecompressionStream==='function'?'1':'0');
  const raw=JSON.stringify(data||{});let gz='';try{gz=await v247GzipText(raw)}catch(_){}
  if(gz&&gz.length<raw.length){add('dataGzip',gz);add('encoding','gzip-base64')}else add('data',raw);
  return await new Promise((resolve,reject)=>{
    let done=false;const cleanup=()=>{if(done)return;done=true;clearTimeout(timer);window.removeEventListener('message',onmsg);setTimeout(()=>{form.remove();frame.remove()},0)};
    const finishErr=e=>{cleanup();reject(e instanceof Error?e:new Error(String(e||'Sync fehlgeschlagen')))};
    const onmsg=async ev=>{if(ev.source!==frame.contentWindow)return;const m=ev.data;if(!m||m.type!=='studia-sync-bridge'||m.id!==id)return;try{const p=m.payload||{};if(!p.ok)throw new Error(String(p.error||'Sync fehlgeschlagen'));if(p.dataGzip){p.data=JSON.parse(await v247UngzipText(p.dataGzip));delete p.dataGzip}cleanup();resolve(p)}catch(e){finishErr(e)}};
    const timer=setTimeout(()=>finishErr(new Error('Cloud antwortet nicht · Apps-Script-Bereitstellung prüfen')),18000);
    window.addEventListener('message',onmsg);document.body.append(frame,form);try{form.submit()}catch(e){finishErr(e)}
  });
}
async function syncState(data){return v247BridgeSync(data)}
async function login(username,password){const r=await post('login',{username,password});rememberAuth(r);return r}
async function register(username,password){const r=await post('register',{username,password});rememberAuth(r);return r}
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
function hydrate(){const url=scanUrl();if(url)rememberUrl(url);const u=rememberedUser();if(url&&scanToken())setStatus(u?.username?`Angemeldet als ${u.username}`:'Angemeldet · bereit');else setStatus('Noch nicht verbunden.')}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',hydrate,{once:true});else hydrate();
})();
