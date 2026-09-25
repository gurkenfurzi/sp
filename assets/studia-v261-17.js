
(function(){
  const mobile=()=>window.innerWidth<900;
  const inEditor=()=>document.body.classList.contains('editorMode')&&!!document.querySelector('#view-sheet-editor.active');
  const VP=()=>document.getElementById('canvasViewport');
  const ST=()=>document.getElementById('canvasStage');
  const SF=()=>document.getElementById('v96PanSurface');
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const MOVE='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18M3 12h18M12 3 9 6M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3"/></svg>';
  let pinch=null,pinching=false,altDown=false,desktopPan=null;
  let phoneView={x:0,y:12,z:1,touched:false};

  function localMid(a,b,v){const r=v.getBoundingClientRect();return{x:(a.clientX+b.clientX)/2-r.left,y:(a.clientY+b.clientY)/2-r.top}}
  function applyPhoneView(){
    const st=ST(),sf=SF();if(!st||!sf)return;
    canvasZoom=phoneView.z;st.dataset.scale=String(phoneView.z);st.style.zoom='';
    st.style.left='0px';st.style.top='0px';st.style.transform=`translate3d(${phoneView.x}px,${phoneView.y}px,0) scale(${phoneView.z})`;st.style.transformOrigin='0 0';
    sf.style.width='100%';sf.style.height='100%';
    const a=document.getElementById('canvasZoomLabel');if(a)a.textContent=Math.round(phoneView.z*100)+'%';
    const b=document.getElementById('v91ZoomLabel');if(b)b.textContent=Math.round(phoneView.z*100)+'%';
  }
  function fitPhone(force=true){
    const v=VP();if(!v)return;const z=clamp(Math.min((v.clientWidth-24)/canvasPageWidth(),(v.clientHeight-30)/canvasPageHeight()),.18,1);
    phoneView.z=z;phoneView.x=(v.clientWidth-canvasPageWidth()*z)/2;phoneView.y=12;phoneView.touched=!force;applyPhoneView();
  }
  function zoomPhone(z,focus){
    const v=VP();if(!v)return;z=clamp(z,.16,3.5);const f=focus||{x:v.clientWidth/2,y:v.clientHeight/2};
    const wx=(f.x-phoneView.x)/phoneView.z,wy=(f.y-phoneView.y)/phoneView.z;
    phoneView.x=f.x-wx*z;phoneView.y=f.y-wy*z;phoneView.z=z;phoneView.touched=true;applyPhoneView();
  }
  function applyDesktopZoom(value,preserve=true,focus=null){
    const v=VP(),st=ST(),sf=SF();if(!v||!st||!sf)return;const old=clamp(Number(st.dataset.scale)||canvasZoom||1,.15,4),z=clamp(Number(value)||1,.18,3.5),g=36;
    const fx=focus?.x??v.clientWidth/2,fy=focus?.y??v.clientHeight/2;
    let wx=null,wy=null;if(preserve){wx=(v.scrollLeft+fx-g)/old;wy=(v.scrollTop+fy-g)/old}
    canvasZoom=z;canvasState.userZoomTouched=true;st.dataset.scale=String(z);st.style.zoom='';st.style.left=g+'px';st.style.top=g+'px';st.style.transform=`scale(${z})`;st.style.transformOrigin='0 0';
    sf.style.width=(canvasPageWidth()*z+g*2)+'px';sf.style.height=(canvasPageHeight()*z+g*2)+'px';
    if(preserve&&wx!=null)requestAnimationFrame(()=>{v.scrollLeft=Math.max(0,g+wx*z-fx);v.scrollTop=Math.max(0,g+wy*z-fy)});
  }
  function fitDesktop(){const v=VP();if(!v)return;const z=clamp(Math.min((v.clientWidth-72)/canvasPageWidth(),(v.clientHeight-72)/canvasPageHeight()),.18,1);applyDesktopZoom(z,false);requestAnimationFrame(()=>{v.scrollLeft=0;v.scrollTop=0})}

  window.v112ApplyZoom=function(v,preserve=true,focus=null){if(mobile())zoomPhone(v,focus);else applyDesktopZoom(v,preserve,focus)};
  window.v108ApplyZoom=window.v112ApplyZoom;window.v96ApplyZoom=window.v112ApplyZoom;
  window.setCanvasZoom=function(v){window.v112ApplyZoom(v,true)};
  window.canvasZoomBy=function(d){window.v112ApplyZoom((canvasZoom||1)+Number(d||0),true)};
  window.fitCanvasStage=window.fitCanvasToScreen=function(){canvasState.userZoomTouched=false;if(mobile())fitPhone(true);else fitDesktop()};
  try{fitCanvasStage=window.fitCanvasStage;fitCanvasToScreen=window.fitCanvasToScreen;v96ApplyZoom=window.v112ApplyZoom}catch(_){}

  // Real two-finger zoom + pan on iPhone. Single-finger object taps are deliberately left alone.
  window.addEventListener('touchstart',function(e){if(window.__STUDIA_V115_OWNS_GESTURES)return;
    if(!inEditor()||!mobile()||e.touches.length!==2)return;const v=VP();if(!v)return;const a=e.touches[0],b=e.touches[1],m=localMid(a,b,v);if(m.x<0||m.y<0||m.x>v.clientWidth||m.y>v.clientHeight)return;
    e.preventDefault();e.stopImmediatePropagation();pinching=true;const z=phoneView.z||canvasZoom||1;pinch={d:Math.max(1,Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)),z,x:phoneView.x,y:phoneView.y,wx:(m.x-phoneView.x)/z,wy:(m.y-phoneView.y)/z};canvasState.userZoomTouched=true;
  },{capture:true,passive:false});
  window.addEventListener('touchmove',function(e){if(window.__STUDIA_V115_OWNS_GESTURES)return;
    if(!pinch||!inEditor()||e.touches.length!==2)return;const v=VP();if(!v)return;e.preventDefault();e.stopImmediatePropagation();const a=e.touches[0],b=e.touches[1],m=localMid(a,b,v),d=Math.max(1,Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)),z=clamp(pinch.z*(d/pinch.d),.16,3.5);
    phoneView.z=z;phoneView.x=m.x-pinch.wx*z;phoneView.y=m.y-pinch.wy*z;phoneView.touched=true;applyPhoneView();
  },{capture:true,passive:false});
  const endPinch=e=>{if(e.touches&&e.touches.length>=2)return;pinch=null;setTimeout(()=>{pinching=false},80)};
  window.addEventListener('touchend',endPinch,{capture:true,passive:true});window.addEventListener('touchcancel',()=>{pinch=null;pinching=false},{capture:true,passive:true});
  ['gesturestart','gesturechange','gestureend'].forEach(n=>window.addEventListener(n,e=>{if(inEditor()&&mobile()){e.preventDefault();e.stopImmediatePropagation()}},{capture:true,passive:false}));

  // Adobe-like desktop navigation.
  window.addEventListener('keydown',e=>{if(e.key==='Alt')altDown=true},true);window.addEventListener('keyup',e=>{if(e.key==='Alt')altDown=false},true);window.addEventListener('blur',()=>{altDown=false;desktopPan=null});
  window.addEventListener('wheel',function(e){if(window.__STUDIA_V115_OWNS_GESTURES)return;
    if(!inEditor()||mobile()||!(e.altKey||altDown))return;const v=VP();if(!v)return;const r=v.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)return;
    e.preventDefault();e.stopImmediatePropagation();const focus={x:e.clientX-r.left,y:e.clientY-r.top},factor=Math.exp(-e.deltaY*.0024);applyDesktopZoom((canvasZoom||1)*factor,true,focus);
  },{capture:true,passive:false});
  window.addEventListener('mousedown',function(e){if(window.__STUDIA_V115_OWNS_GESTURES)return;if(!inEditor()||mobile()||e.button!==1)return;const v=VP();if(!v)return;const r=v.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)return;e.preventDefault();e.stopImmediatePropagation();desktopPan={x:e.clientX,y:e.clientY,l:v.scrollLeft,t:v.scrollTop};v.classList.add('v108Pan')},true);
  window.addEventListener('mousemove',function(e){if(!desktopPan)return;const v=VP();if(!v)return;v.scrollLeft=desktopPan.l-(e.clientX-desktopPan.x);v.scrollTop=desktopPan.t-(e.clientY-desktopPan.y)},true);
  const endDesk=()=>{desktopPan=null;VP()?.classList.remove('v108Pan')};window.addEventListener('mouseup',endDesk,true);window.addEventListener('auxclick',e=>{if(inEditor()&&e.button===1)e.preventDefault()},true);

  // Clean object event model: mobile tap selects, move ONLY via the four-arrow handle; desktop drag moves directly.
  window.attachCanvasObjectEvents=function(){
    document.querySelectorAll('#canvasObjects .cobj').forEach(el=>{
      const oid=el.dataset.id;if(!oid)return;let down=null,lastTap=0;
      el.addEventListener('pointerdown',e=>{
        const o=canvasState.objects.find(x=>x.id===oid);if(!o)return;
        if(e.target.closest('.v108MoveHandle'))return;
        if(e.target.classList.contains('rotateHandle')){if(o.locked)return;e.preventDefault();e.stopPropagation();startRotateObject(e,oid);return}
        if(e.target.classList.contains('resizeHandle')){if(o.locked)return;e.preventDefault();e.stopPropagation();startResizeObject(e,oid);return}
        if(e.target.classList.contains('tableMoveHandle')){if(o.locked)return;e.preventDefault();e.stopPropagation();selectCanvasObject(oid);startDragObject(e,oid);return}
        if(e.target.tagName==='TD'){if(!(canvasState.selectedType==='object'&&canvasState.selectedId===oid))selectCanvasObject(oid);o.activeCell={r:+e.target.dataset.r||0,c:+e.target.dataset.c||0};renderCanvasInspector();return}
        if(canvasState.multiMode||e.shiftKey){e.preventDefault();e.stopPropagation();toggleObjectInMultiSelection(oid);return}
        if(mobile()){
          if(o.editing)return;down={id:e.pointerId,x:e.clientX,y:e.clientY};return;
        }
        if(o.locked)return;e.preventDefault();e.stopPropagation();if(!(canvasState.selectedIds||[]).includes(oid))selectCanvasObject(oid);
        if((canvasState.selectedIds.length+canvasState.selectedVectorIds.length)>1)startDragSelection(e);else startDragObject(e,oid);
      });
      el.addEventListener('pointerup',e=>{
        if(!mobile()||!down||down.id!==e.pointerId){down=null;return}const o=canvasState.objects.find(x=>x.id===oid),m=Math.hypot(e.clientX-down.x,e.clientY-down.y);down=null;if(!o||pinching||m>8)return;
        const now=Date.now(),dbl=now-lastTap<330;lastTap=now;selectCanvasObject(oid);
        if(dbl&&['text','block','task','merke'].includes(o.kind)&&!o.isChecklist){o.editing=true;renderCanvasObjects();setTimeout(()=>{const x=document.querySelector(`.cobj[data-id="${oid}"]`);try{x?.focus({preventScroll:true})}catch(_){x?.focus()}},0)}
      });
      if(el.isContentEditable)el.addEventListener('input',()=>{const o=canvasState.objects.find(x=>x.id===oid);if(o)o.text=el.innerHTML;markCanvasDirty()});
      el.querySelectorAll('td').forEach(td=>td.addEventListener('input',()=>{const o=canvasState.objects.find(x=>x.id===oid);if(o)o.cells[+td.dataset.r][+td.dataset.c]=td.innerText;markCanvasDirty()}));
    });
  };
  try{attachCanvasObjectEvents=window.attachCanvasObjectEvents}catch(_){}

  window.attachVectorEvents=function(){
    const root=document.getElementById('canvasObjects');if(!root)return;
    root.querySelectorAll('.vectorTouchProxy').forEach(el=>{let down=null;el.addEventListener('pointerdown',e=>{const id=el.dataset.vid,v=canvasState.vectors.find(x=>x.id===id);if(!v)return;e.preventDefault();e.stopPropagation();if(canvasState.multiMode||e.shiftKey){toggleVectorInMultiSelection(id);return}if(mobile()){down={id:e.pointerId,x:e.clientX,y:e.clientY};return}selectVector(id);if(!v.locked)startVectorDrag(e,id)});el.addEventListener('pointerup',e=>{if(!mobile()||!down||down.id!==e.pointerId){down=null;return}const m=Math.hypot(e.clientX-down.x,e.clientY-down.y),id=el.dataset.vid;down=null;if(!pinching&&m<8)selectVector(id)})});
    root.querySelectorAll('.vectorResizeHandle').forEach(el=>el.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();selectVector(el.dataset.vid);startVectorResize(e,el.dataset.vid)}));
    root.querySelectorAll('.vectorRotateHandle').forEach(el=>el.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();selectVector(el.dataset.vid);startVectorRotate(e,el.dataset.vid)}));
    root.querySelectorAll('.pathNode').forEach(el=>el.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();startNodeDrag(e,+el.dataset.index)}));
  };
  try{attachVectorEvents=window.attachVectorEvents}catch(_){}

  // Delegated move handles survive every render and are the only mobile drag affordance.
  document.addEventListener('pointerdown',function(e){
    if(!inEditor()||!mobile())return;const t=e.target instanceof Element?e.target:null,handle=t?.closest('.v108MoveHandle,.v108VectorMoveHandle');if(!handle)return;e.preventDefault();e.stopImmediatePropagation();
    if(handle.dataset.oid){const id=handle.dataset.oid;if(!(canvasState.selectedIds||[]).includes(id))selectCanvasObject(id);startDragObject(e,id)}
    else if(handle.dataset.vid){selectVector(handle.dataset.vid);startVectorDrag(e,handle.dataset.vid)}
  },true);

  // Keep the text/actions drawer and the persistent bottom toolbar in a deterministic state.
  const baseOpen=window.editorOpenGroup;
  window.editorOpenGroup=function(group,btn){const r=baseOpen(group,btn);const editing=(group==='textEdit'||group==='text')&&!!mobileSelectedText();document.body.classList.toggle('v112TextEditing',editing);requestAnimationFrame(()=>{const d=document.getElementById('canvasQuickDrawer');if(d){const s=d.querySelector('.mobileTextModeContent,.mobileTextLibrary,.mobileDrawerSection,.mobilePagePanel');if(s)s.style.touchAction='pan-y'}});return r};
  try{editorOpenGroup=window.editorOpenGroup}catch(_){}
  const baseClose=window.closeEditorDrawer;
  window.closeEditorDrawer=function(){document.body.classList.remove('v112TextEditing');const r=baseClose();requestAnimationFrame(()=>{const n=document.querySelector('.canvasQuickNav');if(n){n.style.removeProperty('display');n.style.removeProperty('visibility');n.style.removeProperty('opacity')}});return r};
  try{closeEditorDrawer=window.closeEditorDrawer}catch(_){}

  // Shrink only obviously over-wide single-line heading text boxes; never touch paragraphs/callouts.
  function tidyTextBoxes(){
    let changed=false;for(const o of canvasState.objects||[]){if(o.kind!=='text')continue;const raw=String(o.text||'').replace(/<[^>]*>/g,'').trim(),fs=Number(o.style?.fontSize)||16;if(!raw||raw.length>48||/[\n\r]/.test(raw)||fs<22)continue;const pad=Number(o.style?.padding??7),est=clamp(raw.length*fs*.61+pad*2+16,90,canvasPageWidth()-30),h=clamp(fs*(Number(o.style?.lineHeight)||1.25)+pad*2+8,36,140);if(o.w>est*1.35){o.w=Math.round(est);changed=true}if(o.h>h*1.7){o.h=Math.round(h);changed=true}}
    if(changed){renderCanvasObjects();markCanvasDirty(false)}
  }

  const baseSheet=window.renderSheetEditor||renderSheetEditor;
  window.renderSheetEditor=function(){
    baseSheet();setTimeout(()=>{if(mobile()){phoneView={x:0,y:12,z:1,touched:false};fitPhone(true)}else fitDesktop();tidyTextBoxes();document.body.classList.remove('v112TextEditing');},180);
  };
  try{renderSheetEditor=window.renderSheetEditor}catch(_){}
  window.addEventListener('resize',()=>{if(!inEditor())return;setTimeout(()=>{if(mobile()&&!phoneView.touched)fitPhone(true);else if(!mobile())applyDesktopZoom(canvasZoom||1,false)},60)});

  // Force final compact layer render after earlier wrappers.
  const baseLayers=window.renderLayerList||renderLayerList;
  window.renderLayerList=function(){baseLayers();const m=document.querySelector('#canvasQuickDrawer.open .mobileLayerList');if(m){m.querySelectorAll('button').forEach(b=>{b.style.minWidth='0';b.style.maxWidth='none'})}};
  try{renderLayerList=window.renderLayerList}catch(_){}

  setTimeout(()=>{const e=document.getElementById('headerEyebrow');if(e)e.textContent='VERSION 202';document.title='Studia'},40);
})();
