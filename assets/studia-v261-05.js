
(function(){
  const mobile=()=>window.innerWidth<900;
  const inEditor=()=>document.body.classList.contains('editorMode')&&!!document.querySelector('#view-sheet-editor.active');
  const activeTouchPointers=new Set();
  let shapeDrag=null;

  function setTextPanel(on){
    document.body.classList.toggle('v117TextPanel',!!on);
    if(!on){const nav=document.querySelector('.canvasQuickNav');if(nav){nav.style.removeProperty('display');nav.style.removeProperty('visibility');nav.style.removeProperty('pointer-events')}}
  }
  function syncTextPanel(){
    if(!inEditor()||!mobile()){setTextPanel(false);return}
    const d=document.getElementById('canvasQuickDrawer');
    const open=!!d?.classList.contains('open');
    setTextPanel(open&&!!d.querySelector('.mobileTextEditor,.mobileTextLibrary'));
  }

  const baseOpen=window.editorOpenGroup||((typeof editorOpenGroup==='function')?editorOpenGroup:null);
  if(baseOpen){window.editorOpenGroup=function(){const r=baseOpen.apply(this,arguments);requestAnimationFrame(syncTextPanel);return r};try{editorOpenGroup=window.editorOpenGroup}catch(_){}}
  const baseClose=window.closeEditorDrawer||((typeof closeEditorDrawer==='function')?closeEditorDrawer:null);
  if(baseClose){window.closeEditorDrawer=function(){setTextPanel(false);const r=baseClose.apply(this,arguments);requestAnimationFrame(syncTextPanel);return r};try{closeEditorDrawer=window.closeEditorDrawer}catch(_){}}

  function patchLayers(){document.querySelectorAll('.mobileLayerList .layerDeleteBtn').forEach(btn=>{btn.textContent='×';btn.title='Löschen';btn.setAttribute('aria-label','Ebene löschen')})}

  document.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')activeTouchPointers.add(e.pointerId)},true);
  const clearPointer=e=>{if(e.pointerType==='touch')activeTouchPointers.delete(e.pointerId);if(shapeDrag&&shapeDrag.pid===e.pointerId)finishShapeDrag()};
  document.addEventListener('pointerup',clearPointer,true);document.addEventListener('pointercancel',clearPointer,true);

  function copyVector(v){return JSON.parse(JSON.stringify(v))}
  function moveVector(v,s,dx,dy){if(v.type==='rect'){v.x=s.x+dx;v.y=s.y+dy}else if(v.type==='ellipse'){v.cx=s.cx+dx;v.cy=s.cy+dy}else if(v.points){v.points=s.points.map(pt=>[pt[0]+dx,pt[1]+dy])}}
  function finishShapeDrag(){const d=shapeDrag;if(!d)return;shapeDrag=null;window.removeEventListener('pointermove',shapeMove,true);if(d.raf)cancelAnimationFrame(d.raf);if(d.moved){try{pushHistory()}catch(_){}}}
  function shapeMove(e){
    const d=shapeDrag;if(!d||e.pointerId!==d.pid)return;
    if(e.pointerType==='touch'&&activeTouchPointers.size>1){finishShapeDrag();return}
    e.preventDefault();d.latest=e;if(d.raf)return;
    d.raf=requestAnimationFrame(()=>{if(!shapeDrag)return;const ev=d.latest;d.raf=0;if(!ev)return;const q=canvasPoint(ev),dx=q.x-d.p.x,dy=q.y-d.p.y;if(Math.hypot(dx,dy)<1.5&&!d.moved)return;d.moved=true;const v=(window.canvasState?.vectors||[]).find(x=>x.id===d.vid);if(!v)return;moveVector(v,d.snap,dx,dy);try{renderVectors()}catch(_){}try{markCanvasDirty(false)}catch(_){}})
  }
  function startDirectShapeDrag(e,vid){const v=(window.canvasState?.vectors||[]).find(x=>x.id===vid);if(!v||v.locked)return;shapeDrag={vid,pid:e.pointerId,p:canvasPoint(e),snap:copyVector(v),latest:null,raf:0,moved:false};window.addEventListener('pointermove',shapeMove,{capture:true,passive:false})}

  document.addEventListener('pointerdown',e=>{
    if(innerWidth>=900||!inEditor())return;const t=e.target instanceof Element?e.target:null,hit=t?.closest('.vectorTouchProxy,.shapeHit');
    if(!hit||t.closest('.vectorResizeHandle,.vectorRotateHandle,.pathNode')||(e.button!=null&&e.button!==0))return;
    if(e.pointerType==='touch'&&activeTouchPointers.size>1)return;
    const vid=hit.getAttribute('data-vid'),v=(window.canvasState?.vectors||[]).find(x=>x.id===vid);if(!vid||!v)return;
    e.preventDefault();e.stopImmediatePropagation();
    if(window.canvasState?.multiMode||e.shiftKey){try{toggleVectorInMultiSelection(vid)}catch(_){};return}
    try{selectVector(vid)}catch(_){}if(!v.locked)startDirectShapeDrag(e,vid)
  },true);

  function cleanShapeHandles(){document.querySelectorAll('.v116ShapeMoveHandle,.v108VectorMoveHandle').forEach(x=>x.remove())}
  const oldRenderVectors=window.renderVectors||((typeof renderVectors==='function')?renderVectors:null);
  if(oldRenderVectors){window.renderVectors=function(){const r=oldRenderVectors.apply(this,arguments);requestAnimationFrame(cleanShapeHandles);return r};try{renderVectors=window.renderVectors}catch(_){}}

  const drawer=document.getElementById('canvasQuickDrawer');
  if(drawer)new MutationObserver(()=>requestAnimationFrame(()=>{syncTextPanel();patchLayers()})).observe(drawer,{subtree:true,childList:true,attributes:true});
  document.addEventListener('click',()=>requestAnimationFrame(()=>{syncTextPanel();patchLayers()}),true);
  window.addEventListener('resize',()=>setTimeout(syncTextPanel,60));
  setTimeout(()=>{cleanShapeHandles();patchLayers();syncTextPanel();const e=document.getElementById('headerEyebrow');if(e)e.textContent='VERSION 202';document.title='Studia'},260);
})();
