
(()=>{
'use strict';
const desktop=()=>false; /* V182: V181 experimental desktop input retired. */
const isText=o=>!!o&&['text','block','task','merke','file'].includes(o.kind)&&!o.isChecklist;
const qs=(s,r=document)=>r.querySelector(s), qsa=(s,r=document)=>[...r.querySelectorAll(s)];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const clone=x=>JSON.parse(JSON.stringify(x));
let gesture=null, overlay=null, installed=false;

function scale(){const st=qs('#canvasStage');if(!st)return 1;const r=st.getBoundingClientRect(),w=typeof canvasPageWidth==='function'?canvasPageWidth():794;return Math.max(.01,r.width/w)}
function pageW(){return typeof canvasPageWidth==='function'?canvasPageWidth():794} function pageH(){return typeof canvasPageHeight==='function'?canvasPageHeight():1123}
function vectorBounds181(v){try{return vectorBounds(v)}catch(_){if(v.type==='rect')return{x:v.x,y:v.y,w:v.w,h:v.h};if(v.type==='ellipse')return{x:v.cx-v.rx,y:v.cy-v.ry,w:v.rx*2,h:v.ry*2};const p=v.points||[];if(!p.length)return{x:0,y:0,w:1,h:1};const xs=p.map(a=>a[0]),ys=p.map(a=>a[1]);return{x:Math.min(...xs),y:Math.min(...ys),w:Math.max(1,Math.max(...xs)-Math.min(...xs)),h:Math.max(1,Math.max(...ys)-Math.min(...ys))}}}
function sel(){if(!window.canvasState)return null;if(canvasState.selectedType==='object')return{kind:'object',ref:canvasState.objects.find(o=>o.id===canvasState.selectedId)};if(canvasState.selectedType==='vector')return{kind:'vector',ref:canvasState.vectors.find(v=>v.id===canvasState.selectedId)};return null}
function boxOf(s){if(!s?.ref)return null;return s.kind==='object'?{x:+s.ref.x||0,y:+s.ref.y||0,w:Math.max(1,+s.ref.w||1),h:Math.max(1,+s.ref.h||1),rot:+s.ref.rotation||0}:({...vectorBounds181(s.ref),rot:+s.ref.rotation||0})}
function ensureOverlay(){const st=qs('#canvasStage');if(!st)return null;if(!overlay||!overlay.isConnected){overlay=document.createElement('div');overlay.id='v181SelectionOverlay';overlay.innerHTML='<i class="v181-edge n" data-move="1"></i><i class="v181-edge e" data-move="1"></i><i class="v181-edge s" data-move="1"></i><i class="v181-edge w" data-move="1"></i>'+['nw','n','ne','e','se','s','sw','w'].map(h=>`<i class="v181-h ${h}" data-resize="${h}"></i>`).join('')+'<i class="v181-rotate" data-rotate="1"></i>';st.appendChild(overlay);overlay.addEventListener('pointerdown',overlayDown,{capture:true,passive:false})}return overlay}
function paintOverlay(){if(!desktop())return;const ov=ensureOverlay(),s=sel();if(!ov||!s?.ref||s.ref.editing||s.ref.locked){ov?.classList.add('hidden');return}const b=boxOf(s);ov.classList.remove('hidden');Object.assign(ov.style,{left:b.x+'px',top:b.y+'px',width:b.w+'px',height:b.h+'px',transform:`rotate(${b.rot||0}deg)`})}
function selectObject(id,noRender=true){const o=canvasState.objects.find(x=>x.id===id);if(!o)return;canvasState.objects.forEach(x=>{if(x.id!==id&&x.editing)x.editing=false});canvasState.selectedType='object';canvasState.selectedId=id;canvasState.selectedIds=[id];canvasState.selectedVectorIds=[];canvasState.multiMode=false;qsa('#canvasObjects .cobj.selected').forEach(x=>x.classList.toggle('selected',x.dataset.id===id));qs(`#canvasObjects .cobj[data-id="${CSS.escape(id)}"]`)?.classList.add('selected');try{renderLayerList?.();renderCanvasInspector?.()}catch(_){}paintOverlay()}
function selectVector181(id){const v=canvasState.vectors.find(x=>x.id===id);if(!v)return;canvasState.objects.forEach(x=>x.editing=false);canvasState.selectedType='vector';canvasState.selectedId=id;canvasState.selectedIds=[];canvasState.selectedVectorIds=[id];canvasState.multiMode=false;try{renderVectors?.();renderLayerList?.();renderCanvasInspector?.()}catch(_){}paintOverlay()}
function caretAt(el,x,y){try{let r=null;if(document.caretRangeFromPoint)r=document.caretRangeFromPoint(x,y);else if(document.caretPositionFromPoint){const p=document.caretPositionFromPoint(x,y);if(p){r=document.createRange();r.setStart(p.offsetNode,p.offset);r.collapse(true)}}if(r&&el.contains(r.startContainer)){const s=getSelection();s.removeAllRanges();s.addRange(r)}}catch(_){}}
function enterText(id,x,y){const o=canvasState.objects.find(z=>z.id===id);if(!isText(o)||o.locked)return;canvasState.objects.forEach(z=>z.editing=z.id===id);canvasState.selectedType='object';canvasState.selectedId=id;canvasState.selectedIds=[id];canvasState.selectedVectorIds=[];renderCanvasObjects();requestAnimationFrame(()=>{const el=qs(`#canvasObjects .cobj[data-id="${CSS.escape(id)}"]`);if(!el)return;el.contentEditable='true';el.classList.add('editing');el.style.userSelect='text';el.style.webkitUserSelect='text';try{el.focus({preventScroll:true})}catch(_){el.focus()}caretAt(el,x,y);paintOverlay()})}
function exitEditing(except=null){let changed=false;(canvasState.objects||[]).forEach(o=>{if(o.editing&&o.id!==except){o.editing=false;changed=true}});if(changed){renderCanvasObjects();try{markCanvasDirty?.();pushHistory?.()}catch(_){}}}

function moveVectorRef(v,snap,dx,dy){if(v.type==='rect'){v.x=snap.x+dx;v.y=snap.y+dy}else if(v.type==='ellipse'){v.cx=snap.cx+dx;v.cy=snap.cy+dy}else if(v.points){v.points=snap.points.map(p=>[p[0]+dx,p[1]+dy])}}
function resizeVectorRef(v,snap,b0,b1){const sx=b1.w/Math.max(1,b0.w),sy=b1.h/Math.max(1,b0.h);if(v.type==='rect'){v.x=b1.x;v.y=b1.y;v.w=b1.w;v.h=b1.h}else if(v.type==='ellipse'){v.cx=b1.x+b1.w/2;v.cy=b1.y+b1.h/2;v.rx=Math.max(1,(snap.rx||b0.w/2)*sx);v.ry=Math.max(1,(snap.ry||b0.h/2)*sy)}else if(v.points){v.points=snap.points.map(p=>[b1.x+(p[0]-b0.x)*sx,b1.y+(p[1]-b0.y)*sy])}}
function resizeBox(b,h,dx,dy){let x=b.x,y=b.y,w=b.w,hgt=b.h;const min=18;if(h.includes('e'))w=Math.max(min,b.w+dx);if(h.includes('s'))hgt=Math.max(min,b.h+dy);if(h.includes('w')){const nw=Math.max(min,b.w-dx);x=b.x+(b.w-nw);w=nw}if(h.includes('n')){const nh=Math.max(min,b.h-dy);y=b.y+(b.h-nh);hgt=nh}x=clamp(x,0,pageW()-min);y=clamp(y,0,pageH()-min);w=Math.min(w,pageW()-x);hgt=Math.min(hgt,pageH()-y);return{x,y,w,h:hgt}}
function startGesture(mode,e,handle=''){const s=sel(),b=boxOf(s);if(!s?.ref||s.ref.locked||!b)return;e.preventDefault();e.stopImmediatePropagation();gesture={mode,kind:s.kind,id:s.ref.id,pid:e.pointerId,sx:e.clientX,sy:e.clientY,box:b,snap:clone(s.ref),handle,sc:scale(),moved:false};try{e.target.setPointerCapture?.(e.pointerId)}catch(_){} }
function overlayDown(e){if(e.button!==0)return;if(e.target.dataset.rotate)startGesture('rotate',e);else if(e.target.dataset.resize)startGesture('resize',e,e.target.dataset.resize);else if(e.target.dataset.move)startGesture('move',e)}
window.addEventListener('pointermove',e=>{if(!gesture||e.pointerId!==gesture.pid||!desktop())return;e.preventDefault();e.stopImmediatePropagation();const d=gesture,dx=(e.clientX-d.sx)/d.sc,dy=(e.clientY-d.sy)/d.sc;if(!d.moved&&Math.hypot(dx,dy)<.4)return;d.moved=true;if(d.kind==='object'){const o=canvasState.objects.find(x=>x.id===d.id);if(!o)return;if(d.mode==='move'){o.x=clamp(d.snap.x+dx,0,pageW()-o.w);o.y=clamp(d.snap.y+dy,0,pageH()-o.h)}else if(d.mode==='resize'){const b=resizeBox(d.box,d.handle,dx,dy);Object.assign(o,{x:b.x,y:b.y,w:b.w,h:b.h})}else{const st=qs('#canvasStage')?.getBoundingClientRect();if(!st)return;const sc=d.sc,cx=st.left+(d.box.x+d.box.w/2)*sc,cy=st.top+(d.box.y+d.box.h/2)*sc;o.rotation=Math.atan2(e.clientY-cy,e.clientX-cx)*180/Math.PI+90}const el=qs(`#canvasObjects .cobj[data-id="${CSS.escape(d.id)}"]`);if(el){el.style.left=o.x+'px';el.style.top=o.y+'px';el.style.width=o.w+'px';el.style.height=o.h+'px';el.style.transform=`rotate(${o.rotation||0}deg)`}}else{const v=canvasState.vectors.find(x=>x.id===d.id);if(!v)return;if(d.mode==='move')moveVectorRef(v,d.snap,dx,dy);else if(d.mode==='resize')resizeVectorRef(v,d.snap,d.box,resizeBox(d.box,d.handle,dx,dy));else{const st=qs('#canvasStage')?.getBoundingClientRect();if(!st)return;const cx=st.left+(d.box.x+d.box.w/2)*d.sc,cy=st.top+(d.box.y+d.box.h/2)*d.sc;v.rotation=Math.atan2(e.clientY-cy,e.clientX-cx)*180/Math.PI+90}renderVectors()}paintOverlay();try{markCanvasDirty?.(false)}catch(_){}},{capture:true,passive:false});
function endGesture(e){if(!gesture||e.pointerId!==gesture.pid)return;const moved=gesture.moved;gesture=null;if(moved){try{markCanvasDirty?.();pushHistory?.();renderLayerList?.();renderCanvasInspector?.()}catch(_){}}paintOverlay()}
window.addEventListener('pointerup',endGesture,true);window.addEventListener('pointercancel',endGesture,true);

let v181Tap={id:null,time:0,x:0,y:0};
/* Window-capture owns desktop hit testing before all historical document handlers. */
window.addEventListener('pointerdown',e=>{
 if(window.__STUDIA_V190_SELECTION_OWNER||!desktop()||e.pointerType==='touch'||e.button!==0)return;
 const t=e.target instanceof Element?e.target:null;if(!t)return;
 if(t.closest('#v181SelectionOverlay,.canvasTopbar,.desktopCommandBar,#canvasQuickDrawer,#desktopEditorSidebar,#v96PageStrip,#topViewMenu'))return;
 const editing=t.closest('#canvasObjects .cobj.editing,#canvasObjects .cobj[contenteditable="true"]');
 if(editing)return; // native text editing/selection must remain untouched
 const td=t.closest('#canvasObjects .tableObj td');
 if(td){
   const c=td.closest('.cobj'),id=c?.dataset.id;if(!id)return;
   e.preventDefault();e.stopImmediatePropagation();selectObject(id);
   const o=canvasState.objects.find(x=>x.id===id);if(o)o.activeCell={r:+td.dataset.r||0,c:+td.dataset.c||0};
   td.contentEditable=o?.locked?'false':'true';
   if(!o?.locked){try{td.focus({preventScroll:true})}catch(_){td.focus()}caretAt(td,e.clientX,e.clientY)}
   return;
 }
 const c=t.closest('#canvasObjects .cobj');
 if(c){
   const id=c.dataset.id,o=canvasState.objects.find(x=>x.id===id);if(!o)return;
   e.preventDefault();e.stopImmediatePropagation();
   if(e.shiftKey){try{toggleObjectInMultiSelection?.(id)}catch(_){};return}
   const now=performance.now(),dbl=isText(o)&&v181Tap.id===id&&(now-v181Tap.time)<430&&Math.hypot(e.clientX-v181Tap.x,e.clientY-v181Tap.y)<18;
   v181Tap={id,time:now,x:e.clientX,y:e.clientY};
   if(dbl){v181Tap={id:null,time:0,x:0,y:0};enterText(id,e.clientX,e.clientY);return}
   selectObject(id);return;
 }
 const hit=t.closest('#canvasObjects .shapeHit,#canvasObjects .vectorTouchProxy,#canvasObjects .vectorObj');
 if(hit){const id=hit.dataset.vid||hit.dataset.vectorWrap;if(id){e.preventDefault();e.stopImmediatePropagation();selectVector181(id);return}}
}, {capture:true,passive:false});

function attach181(){if(window.__STUDIA_V190_SELECTION_OWNER||!desktop())return;qsa('#canvasObjects .cobj').forEach(el=>{if(el.dataset.v181Bound==='1')return;el.dataset.v181Bound='1';const id=el.dataset.id;const o=canvasState.objects.find(x=>x.id===id);if(!o)return;
  el.addEventListener('pointerdown',e=>{if(!desktop())return;const cur=canvasState.objects.find(x=>x.id===id);if(!cur)return;if(cur.editing){return}if(e.target.closest('td,input,textarea,select,button,a'))return;if(e.button!==0)return;e.preventDefault();e.stopImmediatePropagation();if(e.shiftKey){try{toggleObjectInMultiSelection?.(id)}catch(_){};return}selectObject(id)}, {capture:true,passive:false});
  if(isText(o))el.addEventListener('dblclick',e=>{if(!desktop())return;e.preventDefault();e.stopImmediatePropagation();enterText(id,e.clientX,e.clientY)}, {capture:true});
  if(el.isContentEditable||o.editing)el.addEventListener('input',()=>{const x=canvasState.objects.find(z=>z.id===id);if(x){const c=el.cloneNode(true);c.querySelectorAll('.resizeHandle,.rotateHandle,.v135LinkBadge').forEach(n=>n.remove());x.text=c.innerHTML;try{markCanvasDirty?.()}catch(_){}}});
  if(o.kind==='table')el.querySelectorAll('td').forEach(td=>{td.contentEditable=o.locked?'false':'true';td.addEventListener('pointerdown',e=>{e.stopImmediatePropagation();selectObject(id);const x=canvasState.objects.find(z=>z.id===id);if(x)x.activeCell={r:+td.dataset.r||0,c:+td.dataset.c||0}}, {capture:true});td.addEventListener('input',()=>{const x=canvasState.objects.find(z=>z.id===id);if(x){x.cells[+td.dataset.r][+td.dataset.c]=td.innerText;try{markCanvasDirty?.()}catch(_){}}})})
 });
 qsa('#canvasObjects .shapeHit,#canvasObjects .vectorTouchProxy').forEach(h=>{if(h.dataset.v181Bound==='1')return;h.dataset.v181Bound='1';h.addEventListener('pointerdown',e=>{if(!desktop()||e.button!==0)return;const id=h.dataset.vid;if(!id)return;e.preventDefault();e.stopImmediatePropagation();selectVector181(id)}, {capture:true,passive:false})});paintOverlay()}

/* Exit text edit only when clicking outside the currently edited text. Inside it, native caret/selection owns everything. */
document.addEventListener('pointerdown',e=>{if(!desktop())return;const editing=qs('#canvasObjects .cobj.editing,[contenteditable="true"].cobj');if(editing&&editing.contains(e.target))return;if(e.target instanceof Element&&e.target.closest('#v181SelectionOverlay,.canvasTopbar,.desktopCommandBar,#canvasQuickDrawer,#desktopEditorSidebar,#v96PageStrip'))return;if(editing)exitEditing()}, {capture:true});

/* Clean, deterministic line: one real vector, no legacy divider object. */
window.addVectorLine=function(){const v={id:id(),z:nextCanvasZ(),type:'path',points:[[220,420],[580,420]],fill:'none',stroke:'#6f625d',strokeWidth:3,dash:'solid',closed:false,rotation:0,locked:false};canvasState.vectors.push(v);canvasState.vectorTool='select';selectVector181(v.id);try{markCanvasDirty?.();pushHistory?.();renderVectors?.()}catch(_){};cuteToast?.('Linie eingefügt ♡')};

/* Pure read-only multi-page view using the actual rendered page DOM. */
async function cloneAllPages181(){
 try{v96SyncPage?.()}catch(_){}
 canvasState.pages ||= [typeof v96CurrentPageData==='function'?v96CurrentPageData():{objects:clone(canvasState.objects),vectors:clone(canvasState.vectors),orientation:canvasState.orientation,pageStyle:clone(canvasState.pageStyle)}];
 const savedRuntime={history:[...canvasState.history],historyIndex:canvasState.historyIndex,historyLock:canvasState.historyLock,lastSavedHash:canvasState.lastSavedHash,userZoomTouched:canvasState.userZoomTouched};canvasState.historyLock=true;canvasState.userZoomTouched=true;const camera=window.canvasViewState?.(),active=canvasState.activePage||0,selection={selectedType:canvasState.selectedType,selectedId:canvasState.selectedId,selectedIds:[...(canvasState.selectedIds||[])],selectedVectorIds:[...(canvasState.selectedVectorIds||[])],multiMode:canvasState.multiMode},out=[];
 try{
  for(const page of canvasState.pages){
   v96LoadPageData(page);Object.assign(canvasState,{selectedType:null,selectedId:null,selectedIds:[],selectedVectorIds:[],multiMode:false});
   renderCanvasObjects();renderVectors();applyCanvasPageSize?.();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
   const st=qs('#canvasStage');if(!st)continue;const c=st.cloneNode(true);window.v183FreezePrintStyles?.(st,c);
   c.querySelectorAll('#v183DesktopFrame,#v181SelectionOverlay,#v132InteractionLayer,#v152TextHitLayer,#v168MobileTextLayer,#canvasGuides,#pathDrawHint,.resizeHandle,.rotateHandle,.vectorSelectBox,.vectorHandle,.vectorRotateLine,.pathNode,.guideLine,.shapeHit,.vectorTouchProxy,.v135LinkBadge,.tableMoveHandle,.v108MoveHandle,.v108VectorMoveHandle,.v138TransformHandle').forEach(n=>n.remove());
   for(const n of [c,...c.querySelectorAll('*')]){n.removeAttribute('id');n.removeAttribute('contenteditable');n.removeAttribute('tabindex');n.removeAttribute('draggable');for(const a of [...n.attributes])if(a.name.startsWith('on'))n.removeAttribute(a.name);n.classList.remove('selected','editing','v152EditingText');n.style.setProperty('pointer-events','none','important');n.style.setProperty('user-select','none','important');n.style.setProperty('-webkit-user-modify','read-only','important');n.style.setProperty('caret-color','transparent','important')}
   c.className='v181PreviewPage';c.style.cssText='';const bg=c.querySelector('.canvasPage');if(bg){bg.classList.remove('canvasPage');bg.style.setProperty('border','0','important');bg.style.setProperty('box-shadow','none','important')}for(const [p,v] of Object.entries({position:'relative',width:st.offsetWidth+'px',height:st.offsetHeight+'px',transform:'none','transform-origin':'0 0',left:'0',top:'0',margin:'0',border:'0','box-shadow':'none',overflow:'hidden',display:'block'}))c.style.setProperty(p,v,'important');
   c.dataset.orientation=canvasState.orientation||'portrait';
   for(const o of canvasState.objects||[]){if(!(o.linkUrl||o.linkSheetId||o.linkTargetId))continue;const el=c.querySelector('[data-id="'+CSS.escape(o.id)+'"]');if(!el)continue;const a=document.createElement('a');a.title='Link öffnen';const target=o.linkTargetId||o.linkSheetId,type=o.linkTargetType||(o.linkSheetId?'sheet':'');if(target){a.href='#studia/'+type+'/'+encodeURIComponent(target);a.dataset.studiaType=type;a.dataset.studiaTarget=target}else{const url=/^https?:\/\//i.test(o.linkUrl)?o.linkUrl:'https://'+o.linkUrl;try{if(!['http:','https:'].includes(new URL(url).protocol))continue}catch(_){continue}a.href=url;a.target='_blank';a.rel='noopener noreferrer'}a.style.cssText='position:absolute!important;inset:0!important;display:block!important;pointer-events:auto!important;cursor:pointer!important;z-index:1!important';a.setAttribute('aria-label','Link öffnen');el.appendChild(a)}
   c.querySelectorAll('a[href]').forEach(a=>{if(!a.dataset.studiaType){try{if(!['http:','https:','mailto:'].includes(new URL(a.href,location.href).protocol)){a.removeAttribute('href');return}}catch(_){a.removeAttribute('href');return}a.target='_blank';a.rel='noopener noreferrer'}a.style.setProperty('pointer-events','auto','important');a.style.setProperty('cursor','pointer','important')});
   out.push(c);
  }
 }finally{v96LoadPageData(canvasState.pages[active]);canvasState.activePage=active;Object.assign(canvasState,selection,savedRuntime);renderCanvasObjects();renderVectors();renderCanvasInspector();renderLayerList();updateHistoryButtons();v96RenderPageStrip?.();window.restoreCanvasView?.(camera)}
 return out;
}
/* V237: expose the already-working internal page cloner to the print/export layer. */
window.cloneAllPages181=cloneAllPages181;
window.v181OpenPreview=async function(){let host=qs('#v181Preview');if(!host){host=document.createElement('div');host.id='v181Preview';host.setAttribute('role','dialog');host.setAttribute('aria-label','Lernblatt-Vorschau');host.innerHTML='<div class="v181PreviewBar"><b>Lernblatt-Vorschau</b><button type="button">Schließen</button></div><div class="v181PreviewPages"></div>';document.body.appendChild(host);host.querySelector('button').onclick=()=>host.classList.remove('open');host.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();host.querySelector('.v181PreviewBar button').click()}});const fitPages=()=>{if(!host.classList.contains('open'))return;host.querySelectorAll('.v181PreviewPage').forEach(c=>{const scale=Math.min(1,(innerWidth-64)/parseFloat(c.style.width),(innerHeight-120)/parseFloat(c.style.height));c.style.setProperty('zoom',String(Math.max(.1,scale)),'important')})};host.fitPages=fitPages;window.addEventListener('resize',fitPages);host.addEventListener('click',e=>{const a=e.target.closest('a[data-studia-target]');if(!a)return;e.preventDefault();const type=a.dataset.studiaType,id=a.dataset.studiaTarget;host.querySelector('.v181PreviewBar button').click();if(type==='sheet'){openStudySheetEditor(id);setTimeout(()=>window.v181OpenPreview?.(),500)}else if(type==='quiz')startQuiz(id);else if(type==='task')openView('tasks')})}const pages=host.querySelector('.v181PreviewPages');pages.innerHTML='<div style="padding:40px">Seiten werden geladen …</div>';host.classList.add('open');const clones=await cloneAllPages181();pages.replaceChildren(...clones);host.fitPages();host.querySelector('.v181PreviewBar button').focus()};

/* Exact-ish multi-page print: clone the real rendered page rather than re-drawing a simplified model. */
window.printCanvasSheet=async function(){
 if(innerWidth<900&&window.v170PrintMobile)return window.v170PrintMobile();
 const w=window.open('about:blank','_blank','width=1050,height=900');if(!w)return alert('Bitte Pop-ups für Studia erlauben, damit die Druckvorschau geöffnet werden kann.');
 w.document.write('<p style="font:16px sans-serif;padding:24px">Druckvorschau wird geladen …</p>');
 try{
  const clones=await cloneAllPages181();if(!clones.length){w.close();return alert('Keine Lernblatt-Seite gefunden.')}
  const first=clones[0],W=parseFloat(first.style.width),H=parseFloat(first.style.height),faces=[...document.querySelectorAll('style')].map(s=>s.textContent.match(/@font-face\s*\{[^}]*\}/g)||[]).flat().join('\n')+clones.map((c,i)=>{const name='studiaPage'+i;c.style.setProperty('page',name,'important');return '@page '+name+'{size:'+parseFloat(c.style.width)+'px '+parseFloat(c.style.height)+'px;margin:0}'}).join('');
  w.document.open();w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Studia · Druckvorschau</title><base href="'+location.href+'"></head><body><header class="toolbar"><b>Druckvorschau · nur das Lernblatt</b><button id="print">Drucken</button><button id="close">Schließen</button></header><main class="printRoot">'+clones.map(c=>c.outerHTML).join('')+'</main></body></html>');w.document.close();
  w.document.querySelector('#close').onclick=()=>w.close();w.document.querySelector('#print').onclick=async()=>{await w.document.fonts.ready;await Promise.all([...w.document.images].map(img=>img.complete?Promise.resolve():new Promise(r=>{img.onload=r;img.onerror=r})));w.focus();w.print()};w.focus();
 }catch(e){w.close();console.error(e);alert('Die Druckvorschau konnte nicht erstellt werden. Bitte versuche es erneut.')}
};
try{printCanvasSheet=window.printCanvasSheet}catch(_){}

function install(){window.__STUDIA_V180_DESKTOP__=innerWidth>=900;const eye=qs('#headerEyebrow');if(eye)eye.textContent='VERSION 202';document.title='Studia';try{window.v132SyncHits?.();window.v138RefreshHandles?.()}catch(_){}}
const oldSheet=window.renderSheetEditor;window.renderSheetEditor=function(){const r=oldSheet.apply(this,arguments);setTimeout(install,900);return r};try{renderSheetEditor=window.renderSheetEditor}catch(_){}
const oldOpen=window.openStudySheetEditor;if(oldOpen)window.openStudySheetEditor=function(){const r=oldOpen.apply(this,arguments);setTimeout(install,1050);return r};
window.addEventListener('resize',()=>{if(desktop())requestAnimationFrame(()=>{paintOverlay();attach181()})});
setTimeout(install,1300);
})();
