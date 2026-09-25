
(function(){
if(window.__STUDIA_V129_INPUT__)return;

  'use strict';
  const mobile=()=>innerWidth<900;
  const editor=()=>document.body.classList.contains('editorMode')&&!!document.querySelector('#view-sheet-editor.active');
  const VP=()=>document.getElementById('canvasViewport');
  const ST=()=>document.getElementById('canvasStage');
  const SF=()=>document.getElementById('v96PanSurface')||ST()?.parentElement;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const escAttr=s=>String(s??'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  /* Disable the many legacy gesture listeners at event time. V121 owns gestures. */
  window.__STUDIA_V115_OWNS_GESTURES=true;

  function ensureSurface(){
    const vp=VP(),st=ST();if(!vp||!st)return null;
    let sf=document.getElementById('v96PanSurface');
    if(!sf){sf=document.createElement('div');sf.id='v96PanSurface';sf.className='v96PanSurface';st.parentNode.insertBefore(sf,st);sf.appendChild(st)}
    sf.style.position='relative';return sf;
  }
  function gutter(){return mobile()?28:72}
  function scaleNow(){return Number(ST()?.dataset.scale)||Number(window.canvasZoom)||1}

  /* Only canvasStage is transformed. Toolbar/sidebar/topbar are never scaled. */
  window.v121ApplyZoom=function(value,preserve=true,focus=null){
    const vp=VP(),st=ST(),sf=ensureSurface();if(!vp||!st||!sf)return;
    const old=clamp(scaleNow(),.18,4),z=clamp(Number(value)||1,.18,4),g=gutter();
    const fx=focus?.x ?? vp.clientWidth/2,fy=focus?.y ?? vp.clientHeight/2;
    let pageX=null,pageY=null;
    if(preserve){pageX=(vp.scrollLeft+fx-g)/old;pageY=(vp.scrollTop+fy-g)/old}
    window.canvasZoom=z;if(window.canvasState){canvasState.userZoomTouched=true}
    st.dataset.scale=String(z);st.style.zoom='';st.style.position='absolute';st.style.left=g+'px';st.style.top=g+'px';st.style.transform=`scale(${z})`;st.style.transformOrigin='0 0';
    sf.style.width=(canvasPageWidth()*z+g*2)+'px';sf.style.height=(canvasPageHeight()*z+g*2)+'px';sf.dataset.gutter=String(g);
    const a=document.getElementById('canvasZoomLabel');if(a)a.textContent=Math.round(z*100)+'%';const b=document.getElementById('v91ZoomLabel');if(b)b.textContent=Math.round(z*100)+'%';
    if(preserve&&pageX!=null)requestAnimationFrame(()=>{vp.scrollLeft=Math.max(0,g+pageX*z-fx);vp.scrollTop=Math.max(0,g+pageY*z-fy)});
  };
  window.v96ApplyZoom=window.v121ApplyZoom;window.v108ApplyZoom=window.v121ApplyZoom;
  try{v96ApplyZoom=window.v121ApplyZoom;v108ApplyZoom=window.v121ApplyZoom}catch(_){ }
  window.setCanvasZoom=v=>v121ApplyZoom(v,true);
  window.canvasZoomBy=d=>v121ApplyZoom((window.canvasZoom||1)+Number(d||0),true);
  window.fitCanvasStage=window.fitCanvasToScreen=function(){
    const vp=VP();if(!vp)return;const g=gutter();
    const z=clamp(Math.min((vp.clientWidth-g*2)/canvasPageWidth(),(vp.clientHeight-g*2)/canvasPageHeight(),1),.18,1);
    v121ApplyZoom(z,false);requestAnimationFrame(()=>{vp.scrollLeft=Math.max(0,g-12);vp.scrollTop=Math.max(0,g-12)});
  };
  try{setCanvasZoom=window.setCanvasZoom;fitCanvasStage=window.fitCanvasStage;fitCanvasToScreen=window.fitCanvasToScreen}catch(_){ }

  /* Canva-like two-finger zoom: world point under the finger midpoint remains under it. */
  let pinch=null;
  function touchPair(e){const a=e.touches[0],b=e.touches[1];return{a,b,d:Math.max(1,Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)),cx:(a.clientX+b.clientX)/2,cy:(a.clientY+b.clientY)/2}}
  document.addEventListener('touchstart',e=>{
    if(!editor()||!mobile()||e.touches.length!==2||!VP()?.contains(e.target))return;
    e.preventDefault();e.stopImmediatePropagation();const vp=VP(),r=vp.getBoundingClientRect(),q=touchPair(e),z=scaleNow(),g=Number(SF()?.dataset.gutter)||gutter();
    const fx=q.cx-r.left,fy=q.cy-r.top;
    pinch={d:q.d,z,worldX:(vp.scrollLeft+fx-g)/z,worldY:(vp.scrollTop+fy-g)/z};
    document.body.classList.add('v121Pinching');
  },{capture:true,passive:false});
  document.addEventListener('touchmove',e=>{
    if(!pinch||e.touches.length!==2)return;
    e.preventDefault();e.stopImmediatePropagation();const vp=VP(),r=vp.getBoundingClientRect(),q=touchPair(e),z=clamp(pinch.z*(q.d/pinch.d),.18,4),g=gutter(),fx=q.cx-r.left,fy=q.cy-r.top;
    v121ApplyZoom(z,false);requestAnimationFrame(()=>{vp.scrollLeft=Math.max(0,g+pinch.worldX*z-fx);vp.scrollTop=Math.max(0,g+pinch.worldY*z-fy)});
  },{capture:true,passive:false});
  const endPinch=e=>{if(!e.touches||e.touches.length<2){pinch=null;document.body.classList.remove('v121Pinching')}};
  document.addEventListener('touchend',endPinch,{capture:true,passive:true});document.addEventListener('touchcancel',()=>{pinch=null;document.body.classList.remove('v121Pinching')},{capture:true,passive:true});

  /* Robust direct object drag on phone AND laptop. */
  window.v121StartObjectDrag=function(e,oid){
    const o=canvasState.objects.find(x=>x.id===oid);if(!o||o.locked||document.body.classList.contains('v121Pinching'))return;
    e.preventDefault();e.stopPropagation();const z=scaleNow(),sx=e.clientX,sy=e.clientY,ox=o.x,oy=o.y;let moved=false;
    const el=document.querySelector(`.cobj[data-id="${CSS.escape(oid)}"]`);el?.classList.add('v121Dragging');
    const move=ev=>{if(document.body.classList.contains('v121Pinching'))return;const dx=(ev.clientX-sx)/z,dy=(ev.clientY-sy)/z;if(!moved&&Math.hypot(dx,dy)<2.5)return;moved=true;ev.preventDefault();
      o.x=clamp(ox+dx,0,Math.max(0,canvasPageWidth()-o.w));o.y=clamp(oy+dy,0,Math.max(0,canvasPageHeight()-o.h));const n=document.querySelector(`.cobj[data-id="${CSS.escape(oid)}"]`);if(n){n.style.left=o.x+'px';n.style.top=o.y+'px'};markCanvasDirty(false)};
    const up=ev=>{window.removeEventListener('pointermove',move,true);window.removeEventListener('pointerup',up,true);window.removeEventListener('pointercancel',up,true);document.querySelectorAll('.v121Dragging').forEach(x=>x.classList.remove('v121Dragging'));if(moved){pushHistory();renderLayerList();renderCanvasInspector()}else{selectCanvasObject(oid)}};
    window.addEventListener('pointermove',move,{capture:true,passive:false});window.addEventListener('pointerup',up,true);window.addEventListener('pointercancel',up,true);
  };
  window.startDragObject=window.v121StartObjectDrag;try{startDragObject=window.v121StartObjectDrag}catch(_){ }

  window.attachCanvasObjectEvents=function(){
    document.querySelectorAll('#canvasObjects .cobj').forEach(el=>{
      const oid=el.dataset.id;if(!oid)return;let lastTap=0;
      el.addEventListener('pointerdown',e=>{
        const o=canvasState.objects.find(x=>x.id===oid);if(!o)return;
        if(e.target.closest('.resizeHandle')){if(!o.locked){e.preventDefault();e.stopPropagation();startResizeObject(e,oid)}return}
        if(e.target.closest('.rotateHandle')){if(!o.locked){e.preventDefault();e.stopPropagation();startRotateObject(e,oid)}return}
        if(e.target.tagName==='TD'||e.target.closest('input,select,textarea,button'))return;
        if(o.editing)return;
        if(canvasState.multiMode||e.shiftKey){e.preventDefault();e.stopPropagation();toggleObjectInMultiSelection(oid);return}
        if(!(canvasState.selectedIds||[]).includes(oid)){canvasState.selectedType='object';canvasState.selectedId=oid;canvasState.selectedIds=[oid];canvasState.selectedVectorIds=[];renderCanvasInspector();renderLayerList()}
        window.v121StartObjectDrag(e,oid);
      },{passive:false});
      el.addEventListener('dblclick',e=>{const o=canvasState.objects.find(x=>x.id===oid);if(!o||o.locked||!['text','block','task','merke'].includes(o.kind))return;e.preventDefault();o.editing=true;renderCanvasObjects();setTimeout(()=>document.querySelector(`.cobj[data-id="${CSS.escape(oid)}"]`)?.focus({preventScroll:true}),0)});
      el.addEventListener('pointerup',()=>{lastTap=Date.now()});
      if(el.isContentEditable)el.addEventListener('input',()=>{const o=canvasState.objects.find(x=>x.id===oid);if(o)o.text=el.innerHTML;markCanvasDirty()});
      el.querySelectorAll('td').forEach(td=>td.addEventListener('input',()=>{const o=canvasState.objects.find(x=>x.id===oid);if(o)o.cells[+td.dataset.r][+td.dataset.c]=td.innerText;markCanvasDirty()}));
    });
  };
  try{attachCanvasObjectEvents=window.attachCanvasObjectEvents}catch(_){ }

  /* Robust shape drag. Directly grabbing any visible shape moves it. */
  window.v121StartVectorDrag=function(e,vid){
    const v=canvasState.vectors.find(x=>x.id===vid);if(!v||v.locked||document.body.classList.contains('v121Pinching'))return;
    e.preventDefault();e.stopPropagation();const z=scaleNow(),sx=e.clientX,sy=e.clientY,snap=JSON.parse(JSON.stringify(v));let moved=false;
    document.querySelector(`.vectorObj[data-vector-wrap="${CSS.escape(vid)}"]`)?.classList.add('v121Dragging');
    const move=ev=>{if(document.body.classList.contains('v121Pinching'))return;const dx=(ev.clientX-sx)/z,dy=(ev.clientY-sy)/z;if(!moved&&Math.hypot(dx,dy)<2.5)return;moved=true;ev.preventDefault();
      if(v.type==='rect'){v.x=snap.x+dx;v.y=snap.y+dy}else if(v.type==='ellipse'){v.cx=snap.cx+dx;v.cy=snap.cy+dy}else if(v.points)v.points=snap.points.map(p=>[p[0]+dx,p[1]+dy]);renderVectors();markCanvasDirty(false)};
    const up=()=>{window.removeEventListener('pointermove',move,true);window.removeEventListener('pointerup',up,true);window.removeEventListener('pointercancel',up,true);document.querySelectorAll('.v121Dragging').forEach(x=>x.classList.remove('v121Dragging'));if(moved){pushHistory();renderLayerList();renderCanvasInspector()}else selectVector(vid)};
    window.addEventListener('pointermove',move,{capture:true,passive:false});window.addEventListener('pointerup',up,true);window.addEventListener('pointercancel',up,true);
  };
  window.startVectorDrag=window.v121StartVectorDrag;try{startVectorDrag=window.v121StartVectorDrag}catch(_){ }

  window.attachVectorEvents=function(){
    const root=document.getElementById('canvasObjects');if(!root)return;
    root.querySelectorAll('.vectorTouchProxy,.shapeHit').forEach(el=>{
      if(el.dataset.v121Bound)return;el.dataset.v121Bound='1';
      el.addEventListener('pointerdown',e=>{const vid=el.dataset.vid,v=canvasState.vectors.find(x=>x.id===vid);if(!v)return;if(canvasState.multiMode||e.shiftKey){e.preventDefault();e.stopPropagation();toggleVectorInMultiSelection(vid);return}canvasState.selectedType='vector';canvasState.selectedId=vid;canvasState.selectedIds=[];canvasState.selectedVectorIds=[vid];renderCanvasInspector();renderLayerList();v121StartVectorDrag(e,vid)},{passive:false});
    });
    root.querySelectorAll('.vectorResizeHandle').forEach(el=>el.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();selectVector(el.dataset.vid);startVectorResize(e,el.dataset.vid)}));
    root.querySelectorAll('.vectorRotateHandle').forEach(el=>el.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();selectVector(el.dataset.vid);startVectorRotate(e,el.dataset.vid)}));
    root.querySelectorAll('.pathNode').forEach(el=>el.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();startNodeDrag(e,+el.dataset.index)}));
  };
  try{attachVectorEvents=window.attachVectorEvents}catch(_){ }

  /* Layers: no stale global drag state, direct lock, reliable touch DnD. */
  window.v121ToggleLayerLock=function(kind,id){const ref=layerItemRef(kind,id);if(!ref)return;ref.locked=!ref.locked;renderCanvasObjects();renderVectors();renderCanvasInspector();renderLayerList();markCanvasDirty();pushHistory()};
  window.v121DeleteLayer=function(kind,id){try{deleteLayerItem(kind,id)}catch(_){const arr=kind==='object'?canvasState.objects:canvasState.vectors;const i=arr.findIndex(x=>x.id===id);if(i>=0)arr.splice(i,1);renderCanvasObjects();renderVectors();renderLayerList();pushHistory()}};
  window.layerPointerStart=function(e,kind,id){
    if(e.pointerType==='mouse'&&e.button!==0)return;e.preventDefault();e.stopPropagation();const handle=e.currentTarget,pid=e.pointerId;handle.setPointerCapture?.(pid);document.body.classList.add('layerDragging');let target=null;
    const move=ev=>{if(ev.pointerId!==pid)return;ev.preventDefault();document.querySelectorAll('.v121LayerRow.v121Drop').forEach(x=>x.classList.remove('v121Drop'));const hit=document.elementFromPoint(ev.clientX,ev.clientY)?.closest?.('.v121LayerRow');if(hit&&!(hit.dataset.layerKind===kind&&hit.dataset.layerId===id)){hit.classList.add('v121Drop');target={kind:hit.dataset.layerKind,id:hit.dataset.layerId}}};
    const end=ev=>{if(ev.pointerId!==pid)return;window.removeEventListener('pointermove',move,true);window.removeEventListener('pointerup',end,true);window.removeEventListener('pointercancel',end,true);document.body.classList.remove('layerDragging');document.querySelectorAll('.v121LayerRow.v121Drop').forEach(x=>x.classList.remove('v121Drop'));if(target)reorderLayerItem(kind,id,target.kind,target.id)};
    window.addEventListener('pointermove',move,{capture:true,passive:false});window.addEventListener('pointerup',end,true);window.addEventListener('pointercancel',end,true);
  };
  function layerHTML(){const all=layerEntries();return `<div class="v121LayerList">${all.length?all.map(a=>`<div class="v121LayerRow ${canvasState.selectedType===a.kind&&canvasState.selectedId===a.id?'active':''}" data-layer-kind="${a.kind}" data-layer-id="${a.id}"><button class="v121LayerHandle" title="Ziehen" onpointerdown="layerPointerStart(event,'${a.kind}','${a.id}')">⠿</button><button class="v121LayerTitle" onclick="${a.kind==='object'?`selectCanvasObject('${a.id}')`:`selectVector('${a.id}')`}">${escAttr(a.name)}</button><div class="v121LayerTools"><button title="Umbenennen" onclick="event.stopPropagation();renameLayerItem('${a.kind}','${a.id}')">✎</button><button title="${a.locked?'Entsperren':'Sperren'}" onclick="event.stopPropagation();v121ToggleLayerLock('${a.kind}','${a.id}')">${a.locked?'🔒':'🔓'}</button><button class="danger" title="Löschen" onclick="event.stopPropagation();v121DeleteLayer('${a.kind}','${a.id}')">×</button></div></div>`).join(''):'<div class="small">Noch keine Elemente.</div>'}</div>`}
  window.renderLayerList=function(){const el=document.getElementById('layerList');if(el)el.innerHTML=layerHTML();const m=document.querySelector('#canvasQuickDrawer.open .mobileLayerList');if(m)m.innerHTML=layerHTML()};
  try{renderLayerList=window.renderLayerList}catch(_){ }

  /* Desktop = same drawers/functions as phone, plus font upload. */
  function addDesktopExtras(group){if(mobile())return;const d=document.getElementById('canvasQuickDrawer');if(!d)return;d.classList.add('v121DesktopParity');
    if(group==='textLibrary'||group==='textEdit'||group==='text'){
      let actions=d.querySelector('.v121DesktopFontActions');if(!actions){actions=document.createElement('div');actions.className='v121DesktopFontActions';actions.innerHTML='<button onclick="v91PickFont()">Aa＋ Eigene Schrift hinzufügen</button><button onclick="openTextFormatManager()">Textformate verwalten</button><button onclick="createCustomStylePreset()">＋ Eigenes Textformat</button>';d.prepend(actions)}
      const o=typeof mobileSelectedText==='function'?mobileSelectedText():null;if(o&&!d.querySelector('.mobileTextEditor'))d.insertAdjacentHTML('beforeend',mobileTextControlsHTML());
    }
    if(group==='elements'){const grid=d.querySelector('.mobileToolGrid');if(grid&&!grid.querySelector('[data-v121-line]')){const line=document.createElement('button');line.dataset.v121Line='1';line.innerHTML='<b>—</b><span>Linie</span>';line.onclick=()=>addVectorLine();const curve=document.createElement('button');curve.innerHTML='<b>⌁</b><span>Kurve</span>';curve.onclick=()=>addVectorCurve();grid.append(line,curve)}}
  }
  window.v113DesktopPanel=function(mode,btn){if(mobile())return;const map={text:'textLibrary',elements:'elements',templates:'templates',pages:'pages',layers:'layers'},group=map[mode]||'elements';openEditorGroup=null;window.editorOpenGroup(group,btn);requestAnimationFrame(()=>addDesktopExtras(group));localStorage.setItem('studia-v113-desktop-panel',mode)};

  const oldOpen=window.editorOpenGroup;
  window.editorOpenGroup=function(group,btn){const r=oldOpen(group,btn);requestAnimationFrame(()=>{if(!mobile())addDesktopExtras(group);if(group==='layers')renderLayerList()});return r};
  try{editorOpenGroup=window.editorOpenGroup}catch(_){ }

  /* Existing renderers call the global attach* hooks; V121 replaced those hooks above. */

  function init(){if(!editor())return;document.body.classList.remove('layerDragging');ensureSurface();v121ApplyZoom(scaleNow(),false);renderCanvasObjects();renderVectors();renderLayerList();if(!mobile()){const mode=localStorage.getItem('studia-v113-desktop-panel')||'elements',btn=document.querySelector(`.canvasQuickNav [data-v113-mode="${mode}"]`)||document.querySelector('.canvasQuickNav button');if(btn)v113DesktopPanel(mode,btn)}}
  setTimeout(init,280);window.addEventListener('resize',()=>setTimeout(()=>{if(editor())v121ApplyZoom(scaleNow(),false)},70));
  const eyebrow=document.getElementById('headerEyebrow');if(eyebrow)eyebrow.textContent='VERSION 202';
})();
