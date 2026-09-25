
(function(){
if(window.__STUDIA_V129_INPUT__)return;

'use strict';
const activeEditor=()=>document.body.classList.contains('editorMode')&&!!document.querySelector('#view-sheet-editor.active');
let drag=null;
function clone(v){return JSON.parse(JSON.stringify(v))}
function moveFrom(v,s,dx,dy){
 if(v.type==='rect'){v.x=s.x+dx;v.y=s.y+dy}
 else if(v.type==='ellipse'){v.cx=s.cx+dx;v.cy=s.cy+dy}
 else if(Array.isArray(v.points)){v.points=s.points.map(p=>[p[0]+dx,p[1]+dy])}
}
function onDown(e){
 if(!activeEditor()||e.button>0||drag)return;
 const t=e.target instanceof Element?e.target:null;
 const hit=t?.closest('#canvasObjects .vectorTouchProxy,#canvasObjects .shapeHit');
 if(!hit||t.closest('.vectorResizeHandle,.vectorRotateHandle,.pathNode'))return;
 const vid=hit.dataset.vid;
 const v=(window.canvasState?.vectors||[]).find(x=>x.id===vid);
 if(!v||v.locked)return;
 e.preventDefault();e.stopImmediatePropagation();
 if(window.canvasState.multiMode||e.shiftKey){try{toggleVectorInMultiSelection(vid)}catch(_){};return}
 // Do NOT call selectVector here: it rerenders/removes the node during pointerdown.
 window.canvasState.selectedType='vector';window.canvasState.selectedId=vid;
 window.canvasState.selectedIds=[];window.canvasState.selectedVectorIds=[vid];
 const p=canvasPoint(e);
 drag={vid,pid:e.pointerId,start:p,snap:clone(v),moved:false};
 document.body.classList.add('v127ShapeDragging');
 try{hit.setPointerCapture?.(e.pointerId)}catch(_){}
 try{renderCanvasInspector();renderLayerList();updateMultiSelectStatus?.();updateMobileSelectionTools?.()}catch(_){}
}
function onMove(e){
 if(!drag||e.pointerId!==drag.pid)return;
 const v=(window.canvasState?.vectors||[]).find(x=>x.id===drag.vid);if(!v){drag=null;return}
 const p=canvasPoint(e),dx=p.x-drag.start.x,dy=p.y-drag.start.y;
 if(!drag.moved&&Math.hypot(dx,dy)<.4)return;
 drag.moved=true;e.preventDefault();e.stopImmediatePropagation();
 moveFrom(v,drag.snap,dx,dy);
 // update only SVG geometry during drag; avoid destroying the active pointer target every frame
 const wrap=document.querySelector(`#canvasObjects .vectorObj[data-vector-wrap="${CSS.escape(drag.vid)}"]`);
 if(wrap){
   const vis=wrap.querySelector('.shapeVisible'),hit=wrap.querySelector('.vectorTouchProxy,.shapeHit');
   if(v.type==='rect'){for(const el of [vis,hit])if(el){el.setAttribute('x',v.x);el.setAttribute('y',v.y)}}
   else if(v.type==='ellipse'){for(const el of [vis,hit])if(el){el.setAttribute('cx',v.cx);el.setAttribute('cy',v.cy)}}
   else if(v.type==='triangle'){const pts=v.points.map(q=>q.join(',')).join(' ');for(const el of [vis,hit])if(el)el.setAttribute('points',pts)}
   else if(v.type==='path'){const d=pathD(v.points);for(const el of [vis,hit])if(el)el.setAttribute('d',d)}
 }
 try{markCanvasDirty(false)}catch(_){}
}
function onUp(e){
 if(!drag||e.pointerId!==drag.pid)return;
 e.preventDefault();e.stopImmediatePropagation();const d=drag;drag=null;document.body.classList.remove('v127ShapeDragging');
 try{renderVectors();renderCanvasInspector();renderLayerList();if(d.moved)pushHistory()}catch(_){}
}
document.addEventListener('pointerdown',onDown,true);
window.addEventListener('pointermove',onMove,{capture:true,passive:false});
window.addEventListener('pointerup',onUp,true);window.addEventListener('pointercancel',onUp,true);
setTimeout(()=>{document.querySelectorAll('.v126VectorDragProxy').forEach(n=>n.remove());const e=document.getElementById('headerEyebrow');if(e)e.textContent='VERSION 202'},250);
})();
