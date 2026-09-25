
(function(){
if(window.__STUDIA_V129_INPUT__)return;

 'use strict';
 const isEditor=()=>document.body.classList.contains('editorMode')&&!!document.querySelector('#view-sheet-editor.active');
 const isMobile=()=>innerWidth<900;
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const vp=()=>document.getElementById('canvasViewport');
 const stage=()=>document.getElementById('canvasStage');
 const scale=()=>Number(stage()?.dataset.scale||window.canvasZoom||1)||1;

 /* ---------- SHAPES: one capture handler, independent of all legacy binders ---------- */
 let activeShapeDrag=null;
 function moveVectorFromSnapshot(v,s,dx,dy){
   if(v.type==='rect'){v.x=s.x+dx;v.y=s.y+dy;return}
   if(v.type==='ellipse'){v.cx=s.cx+dx;v.cy=s.cy+dy;return}
   if(Array.isArray(v.points))v.points=s.points.map(p=>[p[0]+dx,p[1]+dy]);
 }
 function shapeDown(e){
   if(!isEditor()||e.button>0||document.body.classList.contains('v123Pinching'))return;
   const t=e.target instanceof Element?e.target:null;
   const hit=t?.closest('.vectorTouchProxy,.shapeHit');
   if(!hit||t.closest('.vectorResizeHandle,.vectorRotateHandle,.pathNode'))return;
   const id=hit.getAttribute('data-vid');
   const v=(window.canvasState?.vectors||[]).find(x=>x.id===id);
   if(!id||!v||v.locked)return;
   e.preventDefault();e.stopImmediatePropagation();
   if(canvasState.multiMode||e.shiftKey){toggleVectorInMultiSelection(id);return}
   canvasState.selectedType='vector';canvasState.selectedId=id;canvasState.selectedIds=[];canvasState.selectedVectorIds=[id];
   try{renderCanvasInspector();renderLayerList()}catch(_){}
   activeShapeDrag={id,pid:e.pointerId,startX:e.clientX,startY:e.clientY,z:scale(),snap:JSON.parse(JSON.stringify(v)),moved:false};
   try{hit.setPointerCapture?.(e.pointerId)}catch(_){}
 }
 function shapeMove(e){
   const d=activeShapeDrag;if(!d||e.pointerId!==d.pid||document.body.classList.contains('v123Pinching'))return;
   const v=(window.canvasState?.vectors||[]).find(x=>x.id===d.id);if(!v){activeShapeDrag=null;return}
   const dx=(e.clientX-d.startX)/d.z,dy=(e.clientY-d.startY)/d.z;
   if(!d.moved&&Math.hypot(dx,dy)<1.5)return;
   d.moved=true;e.preventDefault();e.stopImmediatePropagation();
   moveVectorFromSnapshot(v,d.snap,dx,dy);
   try{renderVectors();markCanvasDirty(false)}catch(_){}
 }
 function shapeUp(e){
   const d=activeShapeDrag;if(!d||e.pointerId!==d.pid)return;
   e.preventDefault();e.stopImmediatePropagation();activeShapeDrag=null;
   try{if(d.moved){pushHistory();renderLayerList();renderCanvasInspector()}else selectVector(d.id)}catch(_){}
 }
 document.addEventListener('pointerdown',shapeDown,true);
 document.addEventListener('pointermove',shapeMove,{capture:true,passive:false});
 document.addEventListener('pointerup',shapeUp,true);document.addEventListener('pointercancel',shapeUp,true);

 /* ---------- MOBILE PINCH: anchor to the ACTUAL stage point under the two fingers ---------- */
 let pinch=null;
 const pair=e=>{const a=e.touches[0],b=e.touches[1];return{cx:(a.clientX+b.clientX)/2,cy:(a.clientY+b.clientY)/2,d:Math.max(1,Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY))}};
 function rawScale(z){
   const st=stage();if(!st)return;z=clamp(z,.18,4);window.canvasZoom=z;st.dataset.scale=String(z);st.style.zoom='';st.style.transformOrigin='0 0';st.style.transform=`scale(${z})`;
   const sf=document.getElementById('v96PanSurface')||st.parentElement;if(sf){const g=Number(sf.dataset.gutter)||28;sf.style.width=(canvasPageWidth()*z+g*2)+'px';sf.style.height=(canvasPageHeight()*z+g*2)+'px'}
   const a=document.getElementById('canvasZoomLabel');if(a)a.textContent=Math.round(z*100)+'%';const b=document.getElementById('v91ZoomLabel');if(b)b.textContent=Math.round(z*100)+'%';
 }
 document.addEventListener('touchstart',e=>{
   if(!isEditor()||!isMobile()||e.touches.length!==2||!vp()?.contains(e.target))return;
   e.preventDefault();e.stopImmediatePropagation();activeShapeDrag=null;
   const q=pair(e),st=stage(),r=st.getBoundingClientRect(),z=scale();
   pinch={d:q.d,z,worldX:(q.cx-r.left)/z,worldY:(q.cy-r.top)/z};document.body.classList.add('v123Pinching');
 },{capture:true,passive:false});
 document.addEventListener('touchmove',e=>{
   if(!pinch||e.touches.length!==2)return;
   e.preventDefault();e.stopImmediatePropagation();
   const q=pair(e),z=clamp(pinch.z*q.d/pinch.d,.18,4),V=vp(),st=stage();
   rawScale(z);
   /* Measure where the same page point landed, then scroll exactly by that error. */
   const r=st.getBoundingClientRect();
   const actualX=r.left+pinch.worldX*z,actualY=r.top+pinch.worldY*z;
   V.scrollLeft+=actualX-q.cx;V.scrollTop+=actualY-q.cy;
 },{capture:true,passive:false});
 const pinchEnd=e=>{if(!e.touches||e.touches.length<2){pinch=null;document.body.classList.remove('v123Pinching')}};
 document.addEventListener('touchend',pinchEnd,true);document.addEventListener('touchcancel',pinchEnd,true);

 /* ---------- DESKTOP: exact same five drawers as phone ---------- */
 const icon=(name)=>({text:'T',elements:'◇',templates:'▧',pages:'▤',layers:'☷'}[name]||'•');
 function desktopNav(){
   if(window.__STUDIA_V134_REFERENCE_ONLY__&&!isMobile())return;
   if(isMobile()||!isEditor())return;
   const nav=document.querySelector('.canvasQuickNav');if(!nav)return;
   const defs=[['text','Text'],['elements','Elemente'],['templates','Vorlagen'],['pages','Seiten'],['layers','Ebenen']];
   nav.innerHTML=defs.map(([m,l])=>`<button data-v123-mode="${m}" onclick="v123DesktopOpen('${m}',this)"><span class="editorNavIcon">${icon(m)}</span><span>${l}</span></button>`).join('');
   const wanted=localStorage.getItem('studia-v123-desktop-panel')||'elements';
   const b=nav.querySelector(`[data-v123-mode="${wanted}"]`)||nav.querySelector('button');
   if(b)window.v123DesktopOpen(b.dataset.v123Mode,b);
 }
 window.v123DesktopOpen=function(mode,btn){
   if(isMobile())return;
   const map={text:'textLibrary',elements:'elements',templates:'templates',pages:'pages',layers:'layers'};
   const group=map[mode]||'elements';
   try{openEditorGroup=null}catch(_){}
   window.editorOpenGroup(group,btn);
   localStorage.setItem('studia-v123-desktop-panel',mode);
   requestAnimationFrame(()=>{desktopExtras(group);if(group==='layers')renderLayerList()});
 };
 function desktopExtras(group){
   if(isMobile())return;const d=document.getElementById('canvasQuickDrawer');if(!d)return;
   d.classList.add('v121DesktopParity');
   if(group==='textLibrary'||group==='textEdit'||group==='text'){
     if(!d.querySelector('.v123DesktopExtras')){
       const x=document.createElement('div');x.className='v123DesktopExtras';
       x.innerHTML=`<label class="v123FontUpload">Aa＋ Eigene Schrift hinzufügen<input type="file" accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2" onchange="v123FontFile(this)"></label><button onclick="openTextFormatManager()">Textformate verwalten</button><button onclick="createCustomStylePreset()">＋ Eigenes Textformat</button>`;
       d.prepend(x);
     }
   }
 }
 window.v123FontFile=function(inp){
   const f=inp?.files?.[0];if(!f)return;if(f.size>1600000){alert('Die Schrift ist zu groß. Bitte unter ca. 1,6 MB.');inp.value='';return}
   const reader=new FileReader();reader.onload=()=>{
     const key='schoolbloom-v91-custom-fonts',name=(f.name||'Eigene Schrift').replace(/\.(ttf|otf|woff2?)$/i,'').trim()||'Eigene Schrift';
     let arr=[];try{arr=JSON.parse(localStorage.getItem(key)||'[]')}catch(_){}arr=arr.filter(x=>x.name!==name);arr.push({name,data:String(reader.result)});
     try{localStorage.setItem(key,JSON.stringify(arr));
       const sid='v123-font-'+name.replace(/[^a-z0-9_-]/gi,'-');document.getElementById(sid)?.remove();const st=document.createElement('style');st.id=sid;st.textContent=`@font-face{font-family:${JSON.stringify(name)};src:url(${JSON.stringify(String(reader.result))});font-display:swap}`;document.head.appendChild(st);
       try{v91LoadFonts?.();renderCanvasInspector?.()}catch(_){}cuteToast?.('Schrift hinzugefügt ♡');
     }catch(_){alert('Schrift konnte nicht gespeichert werden.')}inp.value='';
   };reader.readAsDataURL(f);
 };

 /* Rebuild desktop parity whenever the editor really opens, not only once on page boot. */
 let last=false;function sync(){const now=isEditor();if(now&&!isMobile()){desktopNav();try{renderVectors();renderLayerList()}catch(_){}}last=now}
 new MutationObserver(()=>{if(isEditor()!==last)setTimeout(sync,0)}).observe(document.body,{attributes:true,attributeFilter:['class'],subtree:false});
 const oldOpenStudy=window.openStudySheetEditor;if(typeof oldOpenStudy==='function')window.openStudySheetEditor=function(){const r=oldOpenStudy.apply(this,arguments);setTimeout(sync,120);return r};
 window.addEventListener('resize',()=>setTimeout(()=>{if(isEditor()&&!isMobile())desktopNav()},100));
 setTimeout(sync,350);
 const eyebrow=document.getElementById('headerEyebrow');if(eyebrow)eyebrow.textContent='VERSION 202';
})();
