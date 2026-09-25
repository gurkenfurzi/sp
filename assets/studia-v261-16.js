
(function(){
 const VERSION=111;
 const BDB='studia-local-backups-v1', SNAP='snapshots', BLOBS='blobs';
 const MAX_SNAPS=20, MIN_INTERVAL=5*60*1000;
 const ENABLE_KEY='studia-local-backup-enabled', DAILY_KEY='studia-daily-backup-prompt-enabled', LAST_PROMPT_KEY='studia-daily-backup-prompt-date';
 let backupDirty=true, backupTimer=null, backupBusy=false;
 const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
 function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
 function stamp(ts=Date.now()){const d=new Date(ts);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}_${String(d.getHours()).padStart(2,'0')}-${String(d.getMinutes()).padStart(2,'0')}`}
 function escB(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
 function enabled(){return localStorage.getItem(ENABLE_KEY)!=='0'}
 function dailyEnabled(){return localStorage.getItem(DAILY_KEY)!=='0'}
 function snapshotLocalStorage(){const out={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k)out[k]=localStorage.getItem(k)}return out}
 function openBDB(){return new Promise((res,rej)=>{const r=indexedDB.open(BDB,1);r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains(SNAP)){const s=db.createObjectStore(SNAP,{keyPath:'id'});s.createIndex('ts','ts')}if(!db.objectStoreNames.contains(BLOBS))db.createObjectStore(BLOBS,{keyPath:'id'})};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
 function txDone(tx){return new Promise((res,rej)=>{tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error||new Error('aborted'))})}
 async function liveFiles(){try{const db=await dbOpen();return await new Promise((res,rej)=>{const r=db.transaction(STORE).objectStore(STORE).getAll();r.onsuccess=()=>res(r.result||[]);r.onerror=()=>rej(r.error)})}catch(e){console.warn('[Studia backup] live files unavailable',e);return []}}
 async function latestSnap(){const db=await openBDB();return await new Promise((res,rej)=>{const r=db.transaction(SNAP).objectStore(SNAP).getAll();r.onsuccess=()=>res((r.result||[]).sort((a,b)=>b.ts-a.ts)[0]||null);r.onerror=()=>rej(r.error)})}
 async function allSnaps(){const db=await openBDB();return await new Promise((res,rej)=>{const r=db.transaction(SNAP).objectStore(SNAP).getAll();r.onsuccess=()=>res((r.result||[]).sort((a,b)=>b.ts-a.ts));r.onerror=()=>rej(r.error)})}
 async function gc(db){const snaps=await new Promise((res,rej)=>{const r=db.transaction(SNAP).objectStore(SNAP).getAll();r.onsuccess=()=>res((r.result||[]).sort((a,b)=>b.ts-a.ts));r.onerror=()=>rej(r.error)});const remove=snaps.slice(MAX_SNAPS);if(remove.length){const tx=db.transaction(SNAP,'readwrite'),st=tx.objectStore(SNAP);remove.forEach(x=>st.delete(x.id));await txDone(tx)}const kept=snaps.slice(0,MAX_SNAPS),refs=new Set(kept.flatMap(x=>x.fileIds||[]));const blobs=await new Promise((res,rej)=>{const r=db.transaction(BLOBS).objectStore(BLOBS).getAllKeys();r.onsuccess=()=>res(r.result||[]);r.onerror=()=>rej(r.error)});const dead=blobs.filter(k=>!refs.has(k));if(dead.length){const tx=db.transaction(BLOBS,'readwrite'),st=tx.objectStore(BLOBS);dead.forEach(k=>st.delete(k));await txDone(tx)}}
 async function createSnapshot(reason='auto',force=false){
   if(backupBusy||(!enabled()&&!force))return null;
   backupBusy=true;
   try{
     const prev=await latestSnap();if(!force&&!backupDirty&&prev)return prev;if(!force&&prev&&Date.now()-prev.ts<MIN_INTERVAL)return prev;
     const files=await liveFiles(),db=await openBDB();
     if(files.length){const tx=db.transaction(BLOBS,'readwrite'),st=tx.objectStore(BLOBS);files.forEach(f=>st.put({id:f.id,name:f.name||'',type:f.type||f.blob?.type||'',blob:f.blob||null,updatedAt:Date.now()}));await txDone(tx)}
     const snap={id:`snap-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,ts:Date.now(),reason,version:VERSION,localStorage:snapshotLocalStorage(),fileIds:files.map(x=>x.id)};
     const tx=db.transaction(SNAP,'readwrite');tx.objectStore(SNAP).put(snap);await txDone(tx);await gc(db);backupDirty=false;updateStatus();return snap;
   }catch(e){console.error('[Studia backup] create failed',e);updateStatus(true);return null}finally{backupBusy=false}
 }
 async function getBackupBlob(id){const db=await openBDB();return await new Promise((res,rej)=>{const r=db.transaction(BLOBS).objectStore(BLOBS).get(id);r.onsuccess=()=>res(r.result||null);r.onerror=()=>rej(r.error)})}
 function blobToDataURL(blob){return new Promise((res,rej)=>{if(!blob)return res('');const r=new FileReader();r.onload=()=>res(String(r.result||''));r.onerror=()=>rej(r.error);r.readAsDataURL(blob)})}
 function dataURLToBlob(url){const [head,body]=String(url||'').split(',');if(!body)return new Blob([]);const mime=(head.match(/data:([^;]+)/)||[])[1]||'application/octet-stream',bin=atob(body),u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);return new Blob([u8],{type:mime})}
 async function fullPackageFromSnapshot(snap){const files=[];for(const id of snap.fileIds||[]){const f=await getBackupBlob(id);if(f)files.push({id:f.id,name:f.name,type:f.type,data:await blobToDataURL(f.blob)})}return {format:'studia-backup-v111',version:VERSION,createdAt:snap.ts,localStorage:snap.localStorage||{},files}}
 async function packageCurrent(){await createSnapshot('download',true);const snap=await latestSnap();return fullPackageFromSnapshot(snap)}
 function downloadPackage(pkg){const blob=new Blob([JSON.stringify(pkg)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`Studia_Backup_${stamp(pkg.createdAt||Date.now())}.studia.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200)}
 async function clearLiveFiles(){try{const db=await dbOpen();const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).clear();await txDone(tx)}catch(e){console.warn('[Studia backup] clear files failed',e)}}
 async function restorePackage(pkg){
   if(!pkg)return;
   if(pkg.format==='studia-backup-v111' || pkg.localStorage){
     await clearLiveFiles();
     if(Array.isArray(pkg.files)){for(const f of pkg.files){try{await dbPut({id:f.id,name:f.name||'',type:f.type||'',blob:dataURLToBlob(f.data||'')})}catch(e){console.warn('file restore failed',f?.id,e)}}}
     localStorage.clear();Object.entries(pkg.localStorage||{}).forEach(([k,v])=>localStorage.setItem(k,String(v)));
     location.reload();return;
   }
   // Backwards compatibility: old Studia exports contained only the main data object.
   localStorage.setItem(KEY,JSON.stringify(pkg));location.reload();
 }
 async function restoreSnapshot(id){const db=await openBDB(),snap=await new Promise((res,rej)=>{const r=db.transaction(SNAP).objectStore(SNAP).get(id);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});if(!snap)return alert('Backup nicht gefunden.');if(!confirm('Dieses lokale Backup wiederherstellen? Der aktuelle Stand wird dadurch ersetzt.'))return;const pkg=await fullPackageFromSnapshot(snap);await restorePackage(pkg)}
 async function updateStatus(err=false){const el=document.getElementById('v111BackupStatus');if(!el)return;try{const snaps=await allSnaps(),last=snaps[0];el.classList.toggle('warn',!!err);el.classList.toggle('ok',!!last&&!err);el.querySelector('b').textContent=enabled()?'Lokales Autobackup aktiv':'Lokales Autobackup aus';el.querySelector('span').textContent=err?'Letzte Sicherung fehlgeschlagen':last?`${snaps.length} Versionen · zuletzt ${new Date(last.ts).toLocaleString('de-DE',{dateStyle:'short',timeStyle:'short'})}`:'Noch kein Backup erstellt'}catch(_){}}
 function schedule(){if(!enabled())return;clearTimeout(backupTimer);backupTimer=setTimeout(async()=>{await createSnapshot('auto');if(backupDirty)schedule()},18000)}
 window.v111ToggleBackups=function(on){localStorage.setItem(ENABLE_KEY,on?'1':'0');backupDirty=true;if(on){schedule();v111CreateBackupNow(false)}else clearTimeout(backupTimer);updateStatus()};
 window.v111ToggleDailyPrompt=function(on){localStorage.setItem(DAILY_KEY,on?'1':'0')};
 window.v111CreateBackupNow=async function(showToast=true){const s=await createSnapshot('manual',true);if(showToast){if(s)typeof cuteToast==='function'?cuteToast('Backup lokal gespeichert ✓'):alert('Backup lokal gespeichert ✓');else alert('Backup konnte nicht gespeichert werden.')}};
 window.v111RequestPersistentStorage=async function(){if(!navigator.storage?.persist)return alert('Dein Browser bietet diese Funktion hier nicht an.');try{const ok=await navigator.storage.persist();alert(ok?'Studia-Speicher wird möglichst dauerhaft behalten ✓':'Safari hat den dauerhaften Speicher nicht zugesichert. Backup-Dateien bleiben deshalb weiterhin wichtig.')}catch{alert('Speicherschutz konnte nicht angefragt werden.')}};
 window.v111OpenRestoreManager=async function(){const snaps=await allSnaps();openModal(`<div class="v111Restore"><div class="rowBetween"><div><div class="eyebrow">BACKUPS</div><h2>Wiederherstellen</h2></div><button class="iconbtn" onclick="closeModal()">×</button></div><p class="small">Die letzten ${MAX_SNAPS} lokalen Stände werden automatisch aufgehoben.</p><div class="v111RestoreList">${snaps.length?snaps.map((s,i)=>`<div class="v111RestoreRow"><div><b>${i===0?'Aktuellstes Backup':'Backup '+(i+1)}</b><small>${escB(new Date(s.ts).toLocaleString('de-DE'))} · ${escB(s.reason||'auto')}</small></div><button onclick="v111RestoreSnapshot('${escB(s.id)}')">Wiederherstellen</button></div>`).join(''):'<div class="v111RestoreEmpty">Noch keine lokalen Backups vorhanden.</div>'}</div></div>`)};
 window.v111RestoreSnapshot=restoreSnapshot;
 window.exportData=async function(){try{const pkg=await packageCurrent();downloadPackage(pkg)}catch(e){console.error(e);alert('Backup-Datei konnte nicht erstellt werden.')}};
 const imp=document.getElementById('importData');if(imp)imp.onchange=async e=>{const f=e.target.files?.[0];if(!f)return;try{const pkg=JSON.parse(await f.text());if(!confirm('Dieses Backup importieren? Der aktuelle Stand wird dadurch ersetzt.'))return;await restorePackage(pkg)}catch(e){console.error(e);alert('Backup konnte nicht gelesen werden.')}finally{e.target.value=''}};
 // Every ordinary Studia save marks the backup dirty, but snapshots are throttled.
 try{const baseSave=save;save=function(){const r=baseSave.apply(this,arguments);backupDirty=true;schedule();return r}}catch(e){console.warn('[Studia backup] save hook unavailable',e)}
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&backupDirty&&enabled())createSnapshot('background',true)});
 window.addEventListener('pagehide',()=>{if(backupDirty&&enabled())createSnapshot('pagehide',true)});
 function syncSettings(){const a=document.getElementById('v111BackupEnabled'),d=document.getElementById('v111DailyPrompt');if(a)a.checked=enabled();if(d)d.checked=dailyEnabled();updateStatus()}
 const oldRenderSettings=typeof renderSettings==='function'?renderSettings:null;if(oldRenderSettings)renderSettings=function(){oldRenderSettings();setTimeout(syncSettings,0)};
 async function dailyPrompt(){if(!dailyEnabled()||localStorage.getItem(LAST_PROMPT_KEY)===today())return;localStorage.setItem(LAST_PROMPT_KEY,today());await sleep(900);if(document.body.classList.contains('modalOpen'))return;openModal(`<div><div class="eyebrow">SICHERHEIT</div><h2>Tagesbackup 🌷</h2><p class="small">Dein internes Backup läuft automatisch. Möchtest du zusätzlich die heutige Sicherungsdatei in „Downloads/Dateien“ speichern?</p><div class="row" style="margin-top:12px;flex-wrap:wrap"><button class="primary" onclick="closeModal();setTimeout(()=>exportData(),80)">Backup herunterladen</button><button class="ghost" onclick="closeModal()">Heute nicht</button></div></div>`)}
 setTimeout(()=>{syncSettings();if(enabled()){createSnapshot('startup');schedule()}dailyPrompt()},1200);
})();
