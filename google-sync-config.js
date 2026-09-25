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
function timeout(ms=18000){const c=new AbortController(),id=setTimeout(()=>c.abort(),ms);return {signal:c.signal,done:()=>clearTimeout(id)}}
async function parse(res){
  const txt=await res.text(); let out;
  try{out=JSON.parse(txt)}catch(_){throw new Error('Cloud antwortet nicht mit gültigem JSON')}
  if(!out?.ok){const msg=String(out?.error||`Serverfehler ${res.status}`);const e=new Error(msg);e.status=out?.status||res.status;throw e}
  return out;
}
async function get(action,params={}){
  const c=config(); if(!c.url)throw new Error('Server-Script-Service-URL fehlt');
  const u=new URL(normalizeUrl(c.url));u.searchParams.set('action',action);u.searchParams.set('_',String(Date.now()));
  for(const[k,v]of Object.entries(params))if(v!=null&&v!=='')u.searchParams.set(k,String(v));
  const t=timeout();try{return await parse(await fetch(u.toString(),{method:'GET',cache:'no-store',redirect:'follow',credentials:'omit',signal:t.signal}))}catch(e){if(e?.name==='AbortError')throw new Error('Cloud-Zeitüberschreitung');throw e}finally{t.done()}
}
async function post(action,payload={}){
  const c=config(); if(!c.url)throw new Error('Server-Script-Service-URL fehlt');
  const t=timeout();try{return await parse(await fetch(normalizeUrl(c.url),{method:'POST',cache:'no-store',redirect:'follow',credentials:'omit',signal:t.signal,headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,...payload})}))}catch(e){if(e?.name==='AbortError')throw new Error('Cloud-Zeitüberschreitung');throw e}finally{t.done()}
}
async function health(){return get('health')}
async function me(){const c=config();if(!c.token)throw new Error('Nicht angemeldet');return get('me',{token:c.token})}
async function getState(){const c=config();if(!c.token)throw new Error('Nicht angemeldet');return get('state',{token:c.token})}
async function putState(data){const c=config();if(!c.token)throw new Error('Nicht angemeldet');return post('state_put',{token:c.token,data})}
async function login(username,password){const r=await post('login',{username,password});rememberAuth(r);return r}
async function register(username,password){const r=await post('register',{username,password});rememberAuth(r);return r}
window.StudiaCloud={config,rememberUrl,rememberAuth,rememberedUser,health,me,getState,putState,login,register,setStatus};
window.GOOGLE_SYNC_CONFIG=window.GOOGLE_SYNC_CONFIG||{};
try{Object.defineProperty(window.GOOGLE_SYNC_CONFIG,'scriptUrl',{configurable:true,get:scanUrl,set:rememberUrl})}catch(_){window.GOOGLE_SYNC_CONFIG.scriptUrl=scanUrl()}
window.v150MarkDirty=function(delay=700){
  localStorage.setItem(DIRTY,'1');clearTimeout(dirtyTimer);
  const ms=Math.max(300,Number(delay)||700);
  dirtyTimer=setTimeout(()=>{try{window.studiaSyncNow?.(false)}catch(_){}},ms);
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
