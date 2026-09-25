
(function(){
  const isEditor=()=>document.body.classList.contains('editorMode')&&!!document.querySelector('#view-sheet-editor.active');
  const vp=()=>document.getElementById('canvasViewport');
  const svg=(d)=>`<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const icons={
    duplicate:svg('<rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>'),
    lock:svg('<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>'),
    trash:svg('<path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/>'),
    more:svg('<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>')
  };

  // Main selection pill: never cover the editing sheet; SVG only, no emoji.
  window.updateMobileSelectionTools=function(){
    const el=document.getElementById('mobileSelectionTools');if(!el)return;
    const has=canvasState.selectedId||canvasState.selectedIds?.length||canvasState.selectedVectorIds?.length;
    if(window.innerWidth>=900||!isEditor()||!has||document.body.classList.contains('editorDrawerOpen')){el.classList.remove('show');el.innerHTML='';return}
    el.classList.add('show');
    el.innerHTML=`<button onclick="duplicateSelected()" title="Duplizieren">${icons.duplicate}</button><button onclick="toggleSelectedLock()" title="Sperren">${icons.lock}</button><button onclick="deleteSelectedCanvasItem()" title="Löschen">${icons.trash}</button><button onclick="editorOpenGroup('selection')" title="Mehr">${icons.more}</button>`;
  };

  // Make drawer content scrollable after every drawer render, also on iOS Safari.
  const oldOpenGroup=window.editorOpenGroup;
  window.editorOpenGroup=function(group,btn){
    const r=oldOpenGroup(group,btn);
    requestAnimationFrame(()=>{
      const d=document.getElementById('canvasQuickDrawer');if(!d)return;
      d.scrollTop=0;
      const scroll=d.querySelector('.mobileTextModeContent,.mobileTextLibrary,.mobileDrawerSection,.mobilePagePanel');
      if(scroll) scroll.scrollTop=0;
      updateMobileSelectionTools();
    });
    return r;
  };
  const oldClose=window.closeEditorDrawer;
  window.closeEditorDrawer=function(){const r=oldClose();requestAnimationFrame(updateMobileSelectionTools);return r};

  // Compact layer rows with protected text overflow. Reuse the existing data + actions.
  window.renderLayerList=function(){
    const el=document.getElementById('layerList');if(!el)return;
    const all=layerEntries();const ic=window.v103Icon||window.v102Icon||(()=>"");
    el.innerHTML=all.length?all.map(a=>`<div class="layerItem v103LayerItem ${canvasState.selectedType===a.kind&&canvasState.selectedId===a.id?'active':''}" data-layer-kind="${a.kind}" data-layer-id="${a.id}" draggable="true" ondragstart="layerNativeDragStart(event,'${a.kind}','${a.id}')" ondragover="event.preventDefault()" ondrop="layerNativeDrop(event,'${a.kind}','${a.id}')"><div class="layerRow"><button class="layerDragHandle" title="Ziehen" onpointerdown="layerPointerStart(event,'${a.kind}','${a.id}')">${ic('drag')}</button><button class="layerTitleBtn" title="${esc(a.name)}" onclick="${a.kind==='object'?`selectCanvasObject('${a.id}')`:`selectVector('${a.id}')`}"><span class="v103LayerKind">${a.kind==='object'?ic('sheet'):ic('rect')}</span><span class="layerName">${esc(a.name)}</span></button><div class="layerTools"><button title="Umbenennen" onclick="event.stopPropagation();renameLayerItem('${a.kind}','${a.id}')">${ic('edit')}</button><button title="${a.locked?'Entsperren':'Sperren'}" onclick="event.stopPropagation();${a.kind==='object'?`selectCanvasObject('${a.id}')`:`selectVector('${a.id}')`};toggleSelectedLock()">${ic(a.locked?'unlock':'lock')}</button><button class="layerDeleteBtn" title="Löschen" onclick="event.stopPropagation();deleteLayerItem('${a.kind}','${a.id}')">${ic('trash')}</button></div></div></div>`).join(''):'<div class="v103EmptyState">Noch keine Elemente.</div>';
    const mobile=document.querySelector('#canvasQuickDrawer.open .mobileLayerList');if(mobile)mobile.innerHTML=el.innerHTML;
  };

  // Existing + new text boxes may never paint outside their own box.
  const oldRenderObjects=window.renderCanvasObjects;
  window.renderCanvasObjects=function(){
    oldRenderObjects();
    document.querySelectorAll('#canvasObjects .cobj').forEach(el=>{el.style.maxWidth='none';if(el.matches('.textObj,.calloutObj,.taskObj,.merkeObj')){el.style.overflow=el.isContentEditable?'auto':'hidden';}});
  };
  window.addCanvasTextBox=function(){
    const o=newCanvasObject('body');o.text='Textfeld';o.w=210;o.h=54;o.style.padding=7;o.style.fontSize=16;o.style.borderWidth=0;o.style.background='transparent';
    canvasState.objects.push(o);renderCanvasObjects();selectCanvasObject(o.id);markCanvasDirty();cuteToast('Textfeld eingefügt ♡');
  };

  // Reliable laptop Alt+wheel zoom: based on pointer coordinates, not event target.
  window.addEventListener('wheel',function(e){if(window.__STUDIA_V115_OWNS_GESTURES)return;
    if(true)return;
    if(!isEditor()||window.innerWidth<900||!e.altKey)return;const v=vp();if(!v)return;const r=v.getBoundingClientRect();
    if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)return;
    e.preventDefault();e.stopImmediatePropagation();const factor=Math.exp(-e.deltaY*0.0022);
    const focus={x:e.clientX-r.left,y:e.clientY-r.top};
    (window.v108ApplyZoom||window.v96ApplyZoom)?.((canvasZoom||1)*factor,true,focus);
  },{capture:true,passive:false});

  // Safari gesture events + direct touch fallback for two-finger pinch/pan.
  let gestureStart=null,touchStart=null;
  function zoomAt(z,clientX,clientY){const v=vp();if(!v)return;const r=v.getBoundingClientRect();(window.v108ApplyZoom||window.v96ApplyZoom)?.(z,true,{x:clientX-r.left,y:clientY-r.top})}
  window.addEventListener('gesturestart',function(e){if(true)return;if(!isEditor()||window.innerWidth>=900)return;const v=vp();if(!v)return;const r=v.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)return;e.preventDefault();gestureStart=canvasZoom||1},{capture:true,passive:false});
  window.addEventListener('gesturechange',function(e){if(true)return;if(gestureStart==null||!isEditor())return;e.preventDefault();e.stopImmediatePropagation();zoomAt(Math.max(.22,Math.min(3.2,gestureStart*e.scale)),e.clientX,e.clientY)},{capture:true,passive:false});
  window.addEventListener('gestureend',()=>{gestureStart=null},{capture:true,passive:true});
  window.addEventListener('touchstart',function(e){if(window.__STUDIA_V115_OWNS_GESTURES)return;
    if(true)return;
    if(!isEditor()||window.innerWidth>=900||e.touches.length!==2)return;const v=vp();if(!v)return;const a=e.touches[0],b=e.touches[1],r=v.getBoundingClientRect(),mx=(a.clientX+b.clientX)/2,my=(a.clientY+b.clientY)/2;if(mx<r.left||mx>r.right||my<r.top||my>r.bottom)return;
    e.preventDefault();e.stopImmediatePropagation();touchStart={d:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY),z:canvasZoom||1,mx,my,sl:v.scrollLeft,st:v.scrollTop};canvasState.userZoomTouched=true;
  },{capture:true,passive:false});
  window.addEventListener('touchmove',function(e){if(window.__STUDIA_V115_OWNS_GESTURES)return;
    if(true)return;
    if(!touchStart||e.touches.length!==2||!isEditor())return;const v=vp();if(!v)return;e.preventDefault();e.stopImmediatePropagation();const a=e.touches[0],b=e.touches[1],mx=(a.clientX+b.clientX)/2,my=(a.clientY+b.clientY)/2,d=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY),z=Math.max(.22,Math.min(3.2,touchStart.z*(d/touchStart.d)));
    zoomAt(z,mx,my);requestAnimationFrame(()=>{v.scrollLeft+=touchStart.mx-mx;v.scrollTop+=touchStart.my-my;touchStart.mx=mx;touchStart.my=my});
  },{capture:true,passive:false});
  window.addEventListener('touchend',e=>{if(e.touches.length<2)touchStart=null},{capture:true,passive:true});
  window.addEventListener('touchcancel',()=>{touchStart=null},{capture:true,passive:true});

  // Desktop vector/form dragging: intercept the transparent hit-shape before older handlers.
  document.addEventListener('pointerdown',function(e){
    if(true)return;
    if(!isEditor()||window.innerWidth<900||e.button!==0)return;const t=e.target instanceof Element?e.target:null;if(!t)return;
    if(t.closest('.vectorResizeHandle,.vectorRotateHandle,.pathNode'))return;
    const hit=t.closest('.vectorTouchProxy,.shapeHit');if(!hit)return;const vid=hit.dataset.vid;if(!vid)return;const v=canvasState.vectors.find(x=>x.id===vid);if(!v||v.locked)return;
    e.preventDefault();e.stopImmediatePropagation();if(e.shiftKey){toggleVectorInMultiSelection(vid);return}selectVector(vid);startVectorDrag(e,vid);
  },true);

  // Keep mobile layer drawer refreshed after any selection/render change.
  const oldInspector=window.renderCanvasInspector;
  window.renderCanvasInspector=function(){oldInspector();if(document.querySelector('#canvasQuickDrawer.open .mobileLayerList'))requestAnimationFrame(renderLayerList)};

  // Version marker.
  setTimeout(()=>{const e=document.getElementById('headerEyebrow');if(e)e.textContent='VERSION 202';document.title='Studia'},40);
})();
