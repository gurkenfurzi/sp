(function(){
'use strict';
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
const isEditor=()=>document.body.classList.contains('editorMode');
const isDesktop=()=>innerWidth>=900;
const icon=(path)=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>`;
const paletteIcon=icon('M12 3a9 9 0 1 0 0 18h1.5a2 2 0 0 0 0-4H12a2 2 0 0 1 0-4h5a4 4 0 0 0 0 0-8.2A8.9 8.9 0 0 0 12 3Z');
let openedDesktopOnce=false;
/* The retired GitHub sync must never keep running invisibly. */
localStorage.removeItem('studia-sync-auto');

function selectedStickerObjects(){
 const ids=new Set([...(canvasState?.selectedIds||[]),canvasState?.selectedId].filter(Boolean));
 return (canvasState?.objects||[]).filter(o=>ids.has(o.id)&&o.stickerAsset&&!o.frameAsset);
}
function commitSticker(message){
 renderCanvasObjects?.();renderCanvasInspector?.();markCanvasDirty?.();pushHistory?.();window.v132SyncHits?.();
 if(message)window.cuteToast?.(message);
}
window.v141StickerTint=function(color){const list=selectedStickerObjects();if(!list.length)return window.cuteToast?.('Wähle zuerst einen Sticker ♡');list.forEach(o=>o.tintColor=color);commitSticker('Stickerfarbe geändert ♡')};
window.v141StickerOriginal=function(){const list=selectedStickerObjects();if(!list.length)return;list.forEach(o=>delete o.tintColor);commitSticker('Originalfarben wiederhergestellt ♡')};
function applyStickerTints(){
 for(const o of canvasState?.objects||[]){
  if(!o.stickerAsset||o.frameAsset)continue;
  const el=q(`.cobj[data-id="${CSS.escape(o.id)}"]`);if(!el)continue;
  el.classList.toggle('v141StickerTinted',!!o.tintColor);
  if(o.tintColor){el.style.setProperty('--v141-sticker-color',o.tintColor);el.style.setProperty('--v141-sticker-mask',`url("${String(o.src||'').replace(/"/g,'%22')}")`)}
  else{el.style.removeProperty('--v141-sticker-color');el.style.removeProperty('--v141-sticker-mask')}
 }
}
function stickerPanelHTML(){
 const list=selectedStickerObjects(),color=list[0]?.tintColor||'#e7919b';if(!list.length)return '';
 return `<section class="v137InspectorSection v141StickerSection"><div class="v137InspectorHead"><b>Stickerfarbe</b><span>${list.length>1?list.length+' Sticker':'Deko'}</span></div><div class="v141StickerColor"><label>${paletteIcon}<span>Farbe</span><input type="color" value="${color}" onchange="v141StickerTint(this.value)"></label><button onclick="v141StickerOriginal()">Originalfarben</button></div><p>Die neue Farbe nutzt die transparente Form des Stickers. Mit „Originalfarben“ stellst du das Bild wieder her.</p></section>`;
}
function decorateDesktopInspector(){
 const wrap=q('#canvasInspector .v137Inspector');if(!wrap)return;
 wrap.querySelector('.v141StickerSection')?.remove();const html=stickerPanelHTML();if(html)wrap.insertAdjacentHTML('afterbegin',html);
 qa('.v138TransparentActions',wrap).forEach(x=>x.remove());
}
function addCompactTransparency(root){
 for(const label of qa('.v138ObjectGrid label',root)){
  const name=(label.firstChild?.textContent||label.textContent||'').trim();if(!/^Füllfarbe$|^Kontur$/.test(name)||label.querySelector('.v141TransparentIcon'))continue;
  const prop=name==='Füllfarbe'?'fill':'stroke',b=document.createElement('button');b.type='button';b.className='v141TransparentIcon';b.title=name==='Füllfarbe'?'Keine Füllung':'Keine Kontur';b.setAttribute('aria-label',b.title);b.innerHTML=icon('M4 4l16 16M7 4h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3Z');b.onclick=e=>{e.preventDefault();e.stopPropagation();window.v137Appearance?.(prop,'transparent')};label.classList.add('v141ColorWithNone');label.appendChild(b)
 }
}

function closeMobileProperties(){q('#v141PropertiesOverlay')?.remove();document.body.classList.remove('v141PropertiesOpen')}
window.v141CloseProperties=closeMobileProperties;
const baseProperties=window.v138OpenProperties;
window.v138OpenProperties=function(){
 if(!isEditor())return;
 if(isDesktop()){
  document.body.classList.remove('v135SideClosed');localStorage.setItem('studia-v135-side','open');
  try{window.v102RightTab?.('design')}catch(_){ }
  renderCanvasInspector?.();setTimeout(decorateDesktopInspector,0);return;
 }
 baseProperties?.();
 const drawer=q('#canvasQuickDrawer'),source=drawer?.innerHTML||'<div class="v138ObjectTools">Bitte zuerst etwas auswählen.</div>';
 drawer?.classList.remove('open');drawer?.removeAttribute('data-v137-mode');document.body.classList.remove('editorDrawerOpen');
 closeMobileProperties();
 const overlay=document.createElement('div');overlay.id='v141PropertiesOverlay';overlay.innerHTML=`<button class="v141PropertiesBackdrop" aria-label="Eigenschaften schließen" onclick="v141CloseProperties()"></button><section class="v141PropertiesSheet" role="dialog" aria-modal="true" aria-label="Eigenschaften"><div class="v141SheetHandle"></div><div class="v141PropertiesBody">${source}</div></section>`;
 document.body.appendChild(overlay);document.body.classList.add('v141PropertiesOpen');
 const body=q('.v141PropertiesBody',overlay),head=q('.mobileDrawerHead',body);if(head){const b=q('button',head);if(b)b.setAttribute('onclick','v141CloseProperties()')}
 qa('.v138TransparentActions',body).forEach(x=>x.remove());addCompactTransparency(body);const sticker=stickerPanelHTML();if(sticker)q('.v138ObjectTools',body)?.insertAdjacentHTML('afterbegin',sticker);
 requestAnimationFrame(()=>q('.v141PropertiesSheet',overlay)?.classList.add('open'));
};
try{v138OpenProperties=window.v138OpenProperties}catch(_){ }

function removeDuplicateTools(){
 qa('.v135MobileExtras,.v137ElementExtras,.v138ElementTools,.v139InsertTools,.v138TransparentActions').forEach(x=>x.remove());
 const drawer=q('#canvasQuickDrawer');if(!drawer)return;
 const mode=drawer.dataset.v139Mode||drawer.dataset.v138Mode||drawer.dataset.v137Mode||drawer.dataset.v134Mode||'',textView=!!drawer.querySelector('.mobileTextModeContent,.mobileTextEditor,.mobileTextLibrary')||/Text bearbeiten|Textformate/.test(drawer.textContent||'');
 if(mode!=='elements'||textView)qa('.v140InsertTools',drawer).forEach(x=>x.remove());
}
function watchDrawer(){const drawer=q('#canvasQuickDrawer');if(!drawer||drawer.dataset.v141Watch==='1')return;drawer.dataset.v141Watch='1';new MutationObserver(()=>requestAnimationFrame(removeDuplicateTools)).observe(drawer,{childList:true,subtree:true,attributes:true,attributeFilter:['class','data-v137-mode','data-v134-mode']})}

function repairDesktopChrome(){
 if(!isEditor()||!isDesktop()){openedDesktopOnce=false;return}
 if(!openedDesktopOnce){document.body.classList.remove('v135SideClosed');localStorage.setItem('studia-v135-side','open');openedDesktopOnce=true}
 const nav=q('.canvasQuickNav');if(nav){nav.style.removeProperty('display');nav.removeAttribute('hidden')}
 const side=q('#desktopEditorSidebar');if(side){side.style.removeProperty('display');side.removeAttribute('hidden')}
 if(typeof window.v139ForceNav==='function'&&qa('.canvasQuickNav button').length!==5)window.v139ForceNav('elements');
}

function cleanSettings(){
 const view=q('#view-settings');if(!view)return;
 qa('.v113SyncPanel',view).forEach(x=>x.remove());
 for(const panel of qa('.section.panel',view)){const text=panel.textContent||'';if(/GitHub Token|Gist-ID|GitHub-Sync|Firebase|Firecloud/i.test(text)&&!panel.classList.contains('v137CloudSettings'))panel.remove()}
 const box=q('.v137CloudSettings',view);if(box&&!box.classList.contains('v141GoogleSyncCard')){box.classList.add('v141GoogleSyncCard');box.innerHTML=`<div class="v141SettingsTitle"><span>${icon('M8 17a4 4 0 0 1 .7-7.9A5.5 5.5 0 0 1 19 10.5 3.5 3.5 0 0 1 18.5 17H8Z')}</span><div><h2>Google-Sync</h2><p class="small">Eine private Sicherung in deinem Google Drive – für Handy und Laptop.</p></div></div><button class="primary" onclick="openAccountDialog()">Google-Sync öffnen</button>`}
}

window.openAccountDialog=function(){
 const url=localStorage.getItem('studia-gas-url')||'',key=localStorage.getItem('studia-gas-key')||'';
 openModal(`<div class="v135Modal v140SyncModal v141SyncModal"><div class="v135ModalHead"><div><span class="eyebrow">GOOGLE DRIVE</span><h2>Handy und Laptop synchronisieren</h2></div><button onclick="closeModal()">×</button></div><p class="v141SyncIntro">Beide Geräte verwenden dieselbe private Sicherungsdatei über dein eigenes Google Apps Script und Google Drive.</p><div class="v135FormGrid"><label class="full">Apps-Script-Web-App-URL<input id="v140SyncUrl" type="url" placeholder="https://script.google.com/macros/s/…/exec" value="${String(url).replace(/&/g,'&amp;').replace(/"/g,'&quot;')}"></label><label class="full">Persönlicher Sync-Schlüssel<input id="v140SyncKey" autocomplete="off" placeholder="auf Handy und Laptop exakt gleich" value="${String(key).replace(/&/g,'&amp;').replace(/"/g,'&quot;')}"></label></div><div id="v140SyncState" class="v140SyncState"></div><div class="v141SyncChoices"><button class="v141Upload" onclick="v140SyncUpload()"><b>↑ Diesen Stand hochladen</b><span>Speichert die Daten von diesem Gerät in Google Drive und überschreibt dort die vorige Sicherung.</span></button><button class="v141Download" onclick="v141ConfirmDownload()"><b>↓ Sicherung auf dieses Gerät laden</b><span>Ersetzt die Daten auf diesem Gerät durch den Stand aus Google Drive.</span></button></div><div class="v141SyncWarning"><b>Wichtig:</b> Zuerst auf dem Gerät mit dem richtigen, neuesten Stand hochladen. Danach auf dem anderen Gerät herunterladen.</div><details class="v140SyncHelp"><summary>Einmalige Einrichtung anzeigen</summary><ol><li>Auf script.google.com ein neues Projekt öffnen.</li><li><b>google-apps-script/Code.gs</b> vollständig hineinkopieren.</li><li>Bereitstellen → Neue Bereitstellung → Web-App.</li><li>Ausführen als „Ich“, Zugriff „Jeder“, dann bereitstellen.</li><li>Dieselbe /exec-URL und denselben Schlüssel auf beiden Geräten eintragen.</li></ol></details></div>`);
};
window.v141ConfirmDownload=function(){if(confirm('Google-Sicherung laden? Die aktuellen Daten auf diesem Gerät werden ersetzt.'))window.v140SyncDownload?.()};

function makeDialogsReliable(){
 const modal=q('#modalWrap .v135Modal');if(!modal)return;
 if(q('#v135ChartLabels',modal))modal.classList.add('v141ChartDialog');
 if(q('#v135TimeLabels',modal))modal.classList.add('v141TimelineDialog');
}
function reconcile(){
 repairDesktopChrome();watchDrawer();removeDuplicateTools();cleanSettings();applyStickerTints();decorateDesktopInspector();makeDialogsReliable();
 if(!isEditor())closeMobileProperties();
}

const baseObjects=window.renderCanvasObjects;
window.renderCanvasObjects=function(){const r=baseObjects?.apply(this,arguments);applyStickerTints();return r};try{renderCanvasObjects=window.renderCanvasObjects}catch(_){ }
const baseInspector=window.renderCanvasInspector;
window.renderCanvasInspector=function(){const r=baseInspector?.apply(this,arguments);decorateDesktopInspector();return r};try{renderCanvasInspector=window.renderCanvasInspector}catch(_){ }
const baseSettings=window.renderSettings;
if(baseSettings)window.renderSettings=function(){const r=baseSettings.apply(this,arguments);requestAnimationFrame(cleanSettings);return r};try{renderSettings=window.renderSettings}catch(_){ }
const baseModal=window.openModal;
if(baseModal)window.openModal=function(){const r=baseModal.apply(this,arguments);requestAnimationFrame(makeDialogsReliable);return r};try{openModal=window.openModal}catch(_){ }

document.addEventListener('keydown',e=>{if(e.key==='Escape'&&q('#v141PropertiesOverlay'))closeMobileProperties()},true);
document.addEventListener('click',e=>{if(!isEditor())return;const b=e.target.closest('.v138Properties,button[title="Eigenschaften"],button[aria-label="Eigenschaften"]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();window.v138OpenProperties()},true);
const observer=new MutationObserver(()=>requestAnimationFrame(reconcile));observer.observe(document.body,{attributes:true,attributeFilter:['class']});
window.addEventListener('resize',()=>setTimeout(reconcile,100));setTimeout(reconcile,500);setTimeout(reconcile,1400);
})();
