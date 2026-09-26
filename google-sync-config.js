/* Studia V287 — one sync engine only: fast delta sync + one-shot bootstrap. */
(()=>{
'use strict';
if(window.__STUDIA_SYNC_V287__)return;window.__STUDIA_SYNC_V287__=true;
const KEY='schoolhub-v1';
const DB='studia-sync-v287', STORE='kv';
const URL_KEYS=['studia-v287-script-url','studia-v286-script-url','studia-v284-script-url','studia-v281-script-url','studia-v265-script-url','studia-script-url','schoolhub-script-url','google-sync-script-url'];
const TOKEN_KEYS=['studia-v287-token','studia-v286-token','studia-v284-token','studia-v281-token','studia-v265-token','studia-token','schoolhub-token','cloud-token'];
const USER_KEYS=['studia-v287-user','studia-v286-user','studia-v284-user','studia-v281-user','studia-v265-user','studia-user','schoolhub-user'];
let busy=false,pending=false,timer=0,lastSyncAt=0,lastSeenLocal='';
const $=s=>document.querySelector(s);
const safeJSON=(s,f=null)=>{try{return JSON.parse(s)}catch(_){return f}};
const clone=v=>{try{return structuredClone(v)}catch(_){return safeJSON(JSON.stringify(v),v)}};
const isObj=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const rid=()=>{try{return crypto.randomUUID()}catch(_){return Date.now().toString(36)+Math.random().toString(36).slice(2)}};
function endpoint(){const i=$('#v150ScriptUrl');if(i?.value?.trim())return i.value.trim();for(const k of URL_KEYS){const v=String(localStorage.getItem(k)||'').trim();if(/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec/i.test(v))return v}return ''}
function token(){for(const k of TOKEN_KEYS){const v=String(localStorage.getItem(k)||'');if(v.length>20)return v}return ''}
function user(){for(const k of USER_KEYS){const v=safeJSON(localStorage.getItem(k)||'');if(v)return v}return null}
function rememberUrl(v){v=String(v||'').trim();if(!v)return;URL_KEYS.forEach(k=>localStorage.setItem(k,v));const i=$('#v150ScriptUrl');if(i)i.value=v;window.STUDIA_SYNC_CONFIG={...(window.STUDIA_SYNC_CONFIG||{}),scriptUrl:v}}
function rememberAuth(r){if(r?.token)TOKEN_KEYS.forEach(k=>localStorage.setItem(k,String(r.token)));if(r?.user)USER_KEYS.forEach(k=>localStorage.setItem(k,JSON.stringify(r.user)))}
function status(text,state='ok'){const s=String(text||'');const a=$('#v150AccountStatus');if(a){a.textContent=s;a.classList.toggle('error',state==='error')}const d=$('#v232DesktopSync');if(d){d.classList.toggle('syncing',state==='syncing');const sm=d.querySelector('small');if(sm)sm.textContent=s}const i=$('#v232SyncStatusInline');if(i)i.textContent=s}
function deviceId(){let d=localStorage.getItem('studia-v287-device-id');if(!d){d='dev-'+rid();localStorage.setItem('studia-v287-device-id',d)}return d}
function deviceName(){return /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)?'Handy':'Laptop'}
function meaningful(v){return /[\p{L}\p{N}]/u.test(String(v??'').trim())}
function cleanState(src){
  const x=clone(src||{});
  const walk=v=>{if(Array.isArray(v)){v.forEach(walk);return}if(!isObj(v))return;delete v._updatedAt;delete v._syncMeta;delete v._syncV284;delete v._syncV281;delete v.__studiaSyncMeta;Object.values(v).forEach(walk)};walk(x);
  if(Array.isArray(x.homework))x.homework=x.homework.filter(o=>o&&([o.subject,o.text,o.note].some(meaningful)||(o.files?.length)||/^\d{4}-\d{2}-\d{2}$/.test(String(o.due||''))));
  if(Array.isArray(x.tests))x.tests=x.tests.filter(o=>o&&([o.subject,o.type,o.text].some(meaningful)||(o.files?.length)||/^\d{4}-\d{2}-\d{2}$/.test(String(o.date||''))));
  return x;
}
function same(a,b){if(a===b)return true;if(a===undefined||b===undefined)return false;try{return JSON.stringify(a)===JSON.stringify(b)}catch(_){return false}}
function idArray(a){if(!Array.isArray(a)||!a.length)return false;const seen=new Set();for(const x of a){if(!isObj(x)||x.id==null)return false;const id=String(x.id);if(seen.has(id))return false;seen.add(id)}return true}
function diff(base,next){
  if(same(base,next))return null;
  if(next===undefined)return{t:'d'};
  if(base===undefined)return{t:'s',v:clone(next)};
  if(Array.isArray(base)&&Array.isArray(next)&&idArray(base)&&idArray(next)){
    const B=Object.fromEntries(base.map(x=>[String(x.id),x])),N=Object.fromEntries(next.map(x=>[String(x.id),x])),c={},d=[];
    Object.keys(N).forEach(id=>{const z=diff(B[id],N[id]);if(z)c[id]=z});Object.keys(B).forEach(id=>{if(!(id in N))d.push(id)});
    if(!Object.keys(c).length&&!d.length)return null;return{t:'a',c,d};
  }
  if(isObj(base)&&isObj(next)){
    const c={};for(const k of new Set([...Object.keys(base),...Object.keys(next)])){const z=diff(base[k],next[k]);if(z)c[k]=z}
    return Object.keys(c).length?{t:'o',c}:null;
  }
  return{t:'s',v:clone(next)};
}
function applyDelta(base,delta){
  if(!delta)return clone(base);if(delta.t==='d')return undefined;if(delta.t==='s')return clone(delta.v);
  if(delta.t==='o'){const out=isObj(base)?clone(base):{};for(const [k,z] of Object.entries(delta.c||{})){const v=applyDelta(out[k],z);if(v===undefined)delete out[k];else out[k]=v}return out}
  if(delta.t==='a'){let out=Array.isArray(base)?clone(base):[];const dead=new Set((delta.d||[]).map(String));out=out.filter(x=>!(x&&x.id!=null&&dead.has(String(x.id))));for(const [id,z] of Object.entries(delta.c||{})){const pos=out.findIndex(x=>x&&x.id!=null&&String(x.id)===id);if(pos>=0){const v=applyDelta(out[pos],z);if(v===undefined)out.splice(pos,1);else out[pos]=v}else{const v=applyDelta(undefined,z);if(v!==undefined)out.push(v)}}return out}
  return clone(base);
}
function b64(bytes){let s='';for(let i=0;i<bytes.length;i+=32768)s+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(s)}
function unb64(v){const s=atob(String(v||'')),a=new Uint8Array(s.length);for(let i=0;i<s.length;i++)a[i]=s.charCodeAt(i);return a}
async function gzipJSON(v){const raw=JSON.stringify(v);if(typeof CompressionStream!=='function')return{raw};const cs=new CompressionStream('gzip'),ab=await new Response(new Blob([raw]).stream().pipeThrough(cs)).arrayBuffer();return{gz:b64(new Uint8Array(ab)),raw}}
async function ungzipJSON(v){if(!v)return null;if(typeof DecompressionStream!=='function')throw new Error('Dieser Browser kann die Cloud-Daten nicht entpacken');const ds=new DecompressionStream('gzip');const txt=await new Response(new Blob([unb64(v)]).stream().pipeThrough(ds)).text();return safeJSON(txt,null)}
function openDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE)};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function dbGet(k,f=null){try{const db=await openDB();return await new Promise((res,rej)=>{const t=db.transaction(STORE,'readonly'),r=t.objectStore(STORE).get(k);r.onsuccess=()=>res(r.result===undefined?f:r.result);r.onerror=()=>rej(r.error)})}catch(_){return f}}
async function dbSet(k,v){const db=await openDB();return await new Promise((res,rej)=>{const t=db.transaction(STORE,'readwrite');t.objectStore(STORE).put(v,k);t.oncomplete=()=>res();t.onerror=()=>rej(t.error)})}
function postDirect(action,payload={},timeout=30000){
  const ep=endpoint();if(!ep)return Promise.reject(new Error('Server-Script-Service-URL fehlt'));
  return new Promise((resolve,reject)=>{
    const callId='v287-'+rid(),frame=document.createElement('iframe'),form=document.createElement('form');let done=false;
    frame.name='studia_'+rid();frame.style.cssText='position:fixed;left:-10000px;top:-10000px;width:1px;height:1px;border:0;opacity:0';
    form.method='POST';form.action=ep.replace(/\?.*$/,'');form.target=frame.name;form.style.display='none';form.enctype='application/x-www-form-urlencoded';
    const add=(k,v)=>{const i=document.createElement('input');i.type='hidden';i.name=k;i.value=String(v??'');form.appendChild(i)};
    add('action','bridge_direct_v287');add('directAction',action);add('callId',callId);for(const [k,v] of Object.entries(payload))if(v!=null)add(k,v);
    const cleanup=()=>{if(done)return;done=true;clearTimeout(to);removeEventListener('message',onmsg);setTimeout(()=>{form.remove();frame.remove()},0)};
    const onmsg=e=>{if(e.source!==frame.contentWindow)return;const m=e.data;if(!m||m.type!=='studia-v287-direct'||m.callId!==callId)return;cleanup();const r=m.result||{};if(!r.ok)return reject(new Error(r.error||'Cloud-Sync fehlgeschlagen'));resolve(r)};
    const to=setTimeout(()=>{cleanup();reject(new Error('Google-Sync antwortet nicht'))},timeout);
    addEventListener('message',onmsg);document.body.append(frame,form);form.submit();
  })
}
function jsonp(action,params={},timeout=45000){
  const ep=endpoint();if(!ep)return Promise.reject(new Error('Server-Script-Service-URL fehlt'));
  return new Promise((resolve,reject)=>{const cb='__studia287_'+rid().replace(/-/g,'_'),s=document.createElement('script');let done=false;const finish=()=>{if(done)return;done=true;clearTimeout(to);try{delete window[cb]}catch(_){window[cb]=undefined}s.remove()};window[cb]=r=>{finish();if(!r?.ok)return reject(new Error(r?.error||'Cloud konnte nicht geladen werden'));resolve(r)};const q=new URLSearchParams({action,callback:cb,_:String(Date.now())});for(const [k,v] of Object.entries(params))if(v!=null)q.set(k,String(v));s.src=ep+(ep.includes('?')?'&':'?')+q.toString();s.onerror=()=>{finish();reject(new Error('Cloud-Download nicht erreichbar'))};const to=setTimeout(()=>{finish();reject(new Error('Cloud-Download dauert zu lange'))},timeout);document.head.appendChild(s)})
}
async function pullFull(){status('Einmaliger erster Abgleich …','syncing');const r=await jsonp('pull_all_v287',{token:token(),deviceId:deviceId(),deviceName:deviceName()},50000);if(Number(r.version)!==287)throw new Error('Google Apps Script V287 ist noch nicht bereitgestellt');const d=r.dataGzip?await ungzipJSON(r.dataGzip):(r.data||{});return{state:cleanState(d||{}),version:Number(r.updatedAt||0)}}
function applyLocal(state){state=cleanState(state);try{data=state}catch(_){window.data=state}localStorage.setItem(KEY,JSON.stringify(state));lastSeenLocal=localStorage.getItem(KEY)||'';try{renderAll?.()}catch(_){}try{if($('#view-plan.active'))renderPlan?.()}catch(_){}try{if($('#view-subjects.active'))renderSubjects?.()}catch(_){}try{if($('#view-tasks.active'))renderTasks?.()}catch(_){}}
async function syncNow(opts={}){
  if(busy){pending=true;return{busy:true}};
  if(!navigator.onLine){status('Offline · lokal gespeichert','error');return{offline:true}}
  if(!token()){status('Nicht angemeldet · lokale Daten sicher','error');return{auth:false}}
  busy=true;status('Synchronisiere Geräte …','syncing');
  try{
    try{if(typeof save==='function')save()}catch(_){}
    let current;try{current=cleanState(data)}catch(_){current=cleanState(safeJSON(localStorage.getItem(KEY)||'{}',{}))}
    const base=await dbGet('baseState',undefined),baseVersion=Number(await dbGet('baseVersion',0)||0);
    const delta=diff(base,current);const packed=await gzipJSON(delta);
    const payload={token:token(),deviceId:deviceId(),deviceName:deviceName(),baseUpdatedAt:baseVersion};
    if(packed.gz&&packed.gz.length<packed.raw.length)payload.deltaGzip=packed.gz;else payload.delta=packed.raw;
    const r=await postDirect('sync_delta',payload,35000);
    if(Number(r.version)!==287)throw new Error('Google Apps Script V287 ist noch nicht bereitgestellt');
    let latest,version=Number(r.updatedAt||baseVersion||0);
    if(r.needFullPull||base===undefined){const full=await pullFull();latest=full.state;version=full.version}else{
      latest=clone(base);let ds=[];if(r.deltasGzip)ds=await ungzipJSON(r.deltasGzip)||[];else if(Array.isArray(r.deltas))ds=r.deltas;for(const d of ds)latest=applyDelta(latest,d);latest=cleanState(latest||{});
    }
    applyLocal(latest);await dbSet('baseState',clone(latest));await dbSet('baseVersion',version);lastSyncAt=Date.now();
    const c={s:latest.subjects?.length||0,h:latest.homework?.length||0,t:latest.tests?.length||0};status(`Synchronisiert ✓ · ${c.s} Fächer · ${c.h} Aufgaben · ${c.t} Tests`,'ok');
    return{ok:true,version};
  }catch(e){console.error('[Studia V287 sync]',e);status((e?.message||String(e))+' · lokal sicher','error');throw e}
  finally{busy=false;if(pending){pending=false;setTimeout(()=>syncNow().catch(()=>{}),700)}}
}
async function loginAndSync(){const u=$('#v150Username')?.value?.trim()||'',p=$('#v150Password')?.value||'',ep=$('#v150ScriptUrl')?.value?.trim()||endpoint();if(ep)rememberUrl(ep);status('Anmeldung …','syncing');const r=await postDirect('login',{username:u,password:p},20000);if(Number(r.version)!==287)throw new Error('Google Apps Script V287 ist noch nicht bereitgestellt');rememberAuth(r);status('Angemeldet als '+(r.user?.username||u)+' ✓');return syncNow({manual:true})}
async function register(){const u=$('#v150Username')?.value?.trim()||'',p=$('#v150Password')?.value||'',ep=$('#v150ScriptUrl')?.value?.trim()||endpoint();if(ep)rememberUrl(ep);status('Konto wird erstellt …','syncing');const r=await postDirect('register',{username:u,password:p},20000);if(Number(r.version)!==287)throw new Error('Google Apps Script V287 ist noch nicht bereitgestellt');rememberAuth(r);if(r.recoveryCode)alert('Wiederherstellungscode — sicher speichern:\n\n'+r.recoveryCode);status('Konto erstellt ✓');return syncNow({manual:true})}
function ensureButton(){if($('#v232DesktopSync'))return;const b=document.createElement('button');b.id='v232DesktopSync';b.type='button';b.innerHTML='<span class="spin">↻</span><span>Geräte synchronisieren<small>Lokal gespeichert</small></span>';b.onclick=()=>syncNow({manual:true}).catch(()=>{});document.body.appendChild(b)}
function install(){window.v171CloudNow=syncNow;window.studiaSyncNow=syncNow;window.v171CloudLogin=loginAndSync;window.v171CloudRegister=register;try{v171CloudNow=syncNow}catch(_){};ensureButton()}
function schedule(){clearTimeout(timer);timer=setTimeout(()=>{if(Date.now()-lastSyncAt<5000)return;syncNow().catch(()=>{})},2200)}
function watch(){const now=localStorage.getItem(KEY)||'';if(now&&now!==lastSeenLocal){lastSeenLocal=now;schedule()}}
function hookSave(){const old=window.save;if(typeof old!=='function'||old.__v287)return;const w=function(){const r=old.apply(this,arguments);lastSeenLocal=localStorage.getItem(KEY)||'';schedule();return r};w.__v287=true;window.save=w;try{save=w}catch(_){}}
async function hydrate(){install();hookSave();const ep=endpoint();if(ep)rememberUrl(ep);const u=user();status(token()?(u?.username?'Angemeldet als '+u.username+' · bereit':'Angemeldet · bereit'):'Noch nicht verbunden.');lastSeenLocal=localStorage.getItem(KEY)||'';setInterval(()=>{install();hookSave();watch()},2200);setTimeout(()=>{if(token()&&navigator.onLine)syncNow().catch(()=>{})},1800)}
window.StudiaSyncV287={syncNow,loginAndSync,register,status,rememberUrl,version:287,resetBase:async()=>{await dbSet('baseState',undefined);await dbSet('baseVersion',0)}};
addEventListener('online',()=>setTimeout(()=>syncNow().catch(()=>{}),700));addEventListener('focus',()=>{if(token()&&Date.now()-lastSyncAt>20000)setTimeout(()=>syncNow().catch(()=>{}),900)});document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&token()&&Date.now()-lastSyncAt>20000)setTimeout(()=>syncNow().catch(()=>{}),1000)});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',hydrate,{once:true});else hydrate();
})();
