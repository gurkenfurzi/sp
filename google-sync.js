/* Studia V274 — standalone Google Apps Script device sync for the app page */
(function(){
'use strict';
const URL_KEY='studia-gas-url',TOKEN_KEY='studia-account-token-v150',USER_KEY='studia-account-username-v150',DEVICE_KEY='studia-account-device-v150';
let busy=false,timer=null,applying=false;
const $=s=>document.querySelector(s);
function cfgUrl(){return String(localStorage.getItem(URL_KEY)||window.STUDIA_SYNC_CONFIG?.scriptUrl||'').trim().replace(/\/$/,'')}
function norm(u){u=String(u||'').trim();if(!u)return'';const m=u.match(/https:\/\/script\.google\.com\/macros\/s\/([^/?#]+)/i);return m?`https://script.google.com/macros/s/${m[1]}/exec`:u.replace(/\/$/,'')}
function valid(u=cfgUrl()){return /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec(?:\?.*)?$/i.test(String(u||''))}
function token(){return String(localStorage.getItem(TOKEN_KEY)||'')}
function device(){let d=localStorage.getItem(DEVICE_KEY);if(!d){d=crypto.randomUUID?.()||'dev-'+Date.now().toString(36)+Math.random().toString(36).slice(2);localStorage.setItem(DEVICE_KEY,d)}return d}
function status(t,bad=false){const x=$('.v171CloudSettings #v150AccountStatus')||$('#v150AccountStatus');if(x){x.textContent=t;x.classList.toggle('error',!!bad);x.classList.toggle('ok',!bad)}}
function syncable(k){return !!k&&(k.startsWith('schoolhub')||k.startsWith('schoolbloom')||k.startsWith('studia-'))&&![URL_KEY,TOKEN_KEY,USER_KEY,DEVICE_KEY].includes(k)&&!k.startsWith('studia-account-')}
function pack(){const o={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(syncable(k))o[k]=localStorage.getItem(k)}return o}
function localStamp(){return Number(localStorage.getItem('studia-v274-local-updated')||0)}
function mark(){if(applying)return;localStorage.setItem('studia-v274-local-updated',String(Date.now()));clearTimeout(timer);timer=setTimeout(()=>window.v171CloudNow?.().catch(()=>{}),1800)}
function action(path,method){if(path==='register')return'register';if(path==='login')return'login';if(path==='state'&&method==='GET')return'state';if(path==='state')return'state_put';return path}
async function call(act,method='GET',body={}){
 const base=cfgUrl();if(!valid(base))throw new Error('Google-Apps-Script-/exec-URL fehlt.');
 const u=new URL(base);u.searchParams.set('action',act);u.searchParams.set('_',Date.now());if(token())u.searchParams.set('token',token());
 const opt={method,redirect:'follow',cache:'no-store'};
 if(method!=='GET'){opt.headers={'Content-Type':'text/plain;charset=utf-8'};opt.body=JSON.stringify({...body,action:act,token:token()||body.token||''})}
 const c=new AbortController();opt.signal=c.signal;const tt=setTimeout(()=>c.abort(),16000);let r;try{r=await fetch(u,opt)}finally{clearTimeout(tt)}
 const text=await r.text();let j;try{j=JSON.parse(text)}catch{throw new Error('Google Sync antwortet nicht mit gültigem JSON. Apps-Script-Bereitstellung prüfen.')}
 if(j?.ok===false)throw new Error(String(j.error||'Synchronisierung fehlgeschlagen.'));return j;
}
window.v150RememberUrl=function(){const el=$('#v150ScriptUrl');const u=norm(el?.value||cfgUrl());if(el)el.value=u;if(!valid(u)){status('Bitte eine gültige Google-Apps-Script-/exec-URL eintragen.',true);return false}localStorage.setItem(URL_KEY,u);status('Server-URL gespeichert ✓');return true};
async function auth(register){if(busy)return;const url=$('#v150ScriptUrl'),user=$('#v150Username'),pass=$('#v150Password');if(url?.value)v150RememberUrl();const username=String(user?.value||'').trim(),password=String(pass?.value||'');if(!valid())return status('Google-Apps-Script-/exec-URL fehlt.',true);if(username.length<3||password.length<8)return status('Benutzername mind. 3 Zeichen, Passwort mind. 8 Zeichen.',true);busy=true;try{status(register?'Konto wird erstellt …':'Anmelden …');const r=await call(register?'register':'login','POST',{username,password,deviceId:device()});if(!r.token)throw new Error('Server hat kein Login-Token geliefert.');localStorage.setItem(TOKEN_KEY,r.token);localStorage.setItem(USER_KEY,r.user?.username||username);status(`Verbunden als ${r.user?.username||username} · Auto-Sync aktiv ✓`);await window.v171CloudNow()}catch(e){status(String(e.message||e),true)}finally{busy=false}}
window.v171CloudLogin=()=>auth(false);window.v171CloudRegister=()=>auth(true);
window.v150Login=window.v171CloudLogin;window.v150Register=window.v171CloudRegister;
window.v171CloudNow=async function(){if(busy)return;if(!token())return status('Bitte zuerst anmelden.',true);if(!valid())return status('Google-Apps-Script-/exec-URL fehlt.',true);busy=true;try{status('Geräte werden abgeglichen …');const remote=await call('state','GET');const remoteUpdated=Number(remote.updatedAt||remote.data?.updatedAt||0);const localUpdated=localStamp();const remoteState=remote.state||remote.data?.state||remote.data?.localStorage||remote.localStorage||{};
   if(remoteUpdated>localUpdated&&remoteState&&Object.keys(remoteState).length){applying=true;for(const [k,v] of Object.entries(remoteState))if(syncable(k))localStorage.setItem(k,String(v));localStorage.setItem('studia-v274-local-updated',String(remoteUpdated));applying=false;try{const raw=localStorage.getItem('schoolhub-v1');if(raw&&typeof data!=='undefined'){const d=JSON.parse(raw);Object.keys(data).forEach(k=>delete data[k]);Object.assign(data,d);window.renderAll?.()}}catch(_){} }
   else {const state=pack(),updatedAt=Math.max(Date.now(),localUpdated||0);await call('state_put','POST',{state,updatedAt,deviceId:device()});localStorage.setItem('studia-v274-local-updated',String(updatedAt));}
   status('Alle Geräte sind aktuell ✓');
 }catch(e){status(String(e.message||e),true)}finally{busy=false}};
window.studiaSyncNow=window.v171CloudNow;
// Settings fields restore
function fields(){const u=$('#v150ScriptUrl'),n=$('#v150Username');if(u&&!u.value)u.value=cfgUrl();if(n&&!n.value)n.value=localStorage.getItem(USER_KEY)||'';if(token())status(`Verbunden${localStorage.getItem(USER_KEY)?' als '+localStorage.getItem(USER_KEY):''} · Auto-Sync aktiv ✓`)}
[300,1000,2500].forEach(t=>setTimeout(fields,t));
document.addEventListener('input',e=>{if(e.target?.matches?.('#v150ScriptUrl,#v150Username,#v150Password'))return;mark()},true);
document.addEventListener('change',e=>{if(e.target?.matches?.('#v150ScriptUrl,#v150Username,#v150Password'))return;mark()},true);
document.addEventListener('click',e=>{if(e.target?.closest?.('button,input,select,textarea'))setTimeout(mark,80)},true);
window.addEventListener('online',()=>setTimeout(()=>window.v171CloudNow?.().catch(()=>{}),500));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(()=>window.v171CloudNow?.().catch(()=>{}),500)});
setInterval(()=>{if(document.visibilityState==='visible'&&token())window.v171CloudNow?.().catch(()=>{})},45000);
setTimeout(()=>{if(token())window.v171CloudNow?.().catch(()=>{})},1200);
})();
