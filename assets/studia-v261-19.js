
(function(){
  window.__STUDIA_V115_OWNS_GESTURES=true;
  const mobile=()=>window.innerWidth<900;
  const editor=()=>document.body.classList.contains('editorMode')&&!!document.querySelector('#view-sheet-editor.active');
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const stage=()=>document.getElementById('canvasStage');
  const surface=()=>document.getElementById('v96PanSurface')||document.getElementById('canvasStage')?.parentElement;
  const pageW=()=>typeof canvasPageWidth==='function'?canvasPageWidth():794;
  const pageH=()=>typeof canvasPageHeight==='function'?canvasPageHeight():1123;
  let mobileView={x:0,y:12,z:.45,touched:false},pinch=null,desktopPan=null;

  function replaceViewport(){
    const old=document.getElementById('canvasViewport');if(!old||old.dataset.v115clean==='1')return old;
    const neo=old.cloneNode(false);neo.dataset.v115clean='1';while(old.firstChild)neo.appendChild(old.firstChild);old.replaceWith(neo);return neo;
  }
  const viewport=()=>document.getElementById('canvasViewport');
  function label(z){const a=document.getElementById('canvasZoomLabel');if(a)a.textContent=Math.round(z*100)+'%';const b=document.getElementById('v91ZoomLabel');if(b)b.textContent=Math.round(z*100)+'%'}
  function applyMobile(){const st=stage(),sf=surface();if(!st)return;window.canvasZoom=mobileView.z;st.dataset.scale=String(mobileView.z);st.style.setProperty('left','0px','important');st.style.setProperty('top','0px','important');st.style.setProperty('transform',`translate3d(${mobileView.x}px,${mobileView.y}px,0) scale(${mobileView.z})`,'important');st.style.setProperty('transform-origin','0 0','important');if(sf&&sf!==st){sf.style.setProperty('width','100%','important');sf.style.setProperty('height','100%','important')}label(mobileView.z)}
  function fitMobile(force=false){const v=viewport();if(!v)return;if(mobileView.touched&&!force){applyMobile();return}const z=clamp(Math.min((v.clientWidth-24)/pageW(),(v.clientHeight-24)/pageH()),.18,1);mobileView={x:(v.clientWidth-pageW()*z)/2,y:12,z,touched:false};applyMobile()}
  function zoomMobile(z,focus){const v=viewport();if(!v)return;z=clamp(z,.18,3.5);const f=focus||{x:v.clientWidth/2,y:v.clientHeight/2},wx=(f.x-mobileView.x)/mobileView.z,wy=(f.y-mobileView.y)/mobileView.z;mobileView.x=f.x-wx*z;mobileView.y=f.y-wy*z;mobileView.z=z;mobileView.touched=true;applyMobile()}

  function applyDesktop(z,preserve=true,focus=null){const v=viewport(),st=stage(),sf=surface();if(!v||!st||!sf)return;const old=clamp(Number(st.dataset.scale)||window.canvasZoom||1,.15,4),g=44;z=clamp(Number(z)||1,.18,3.5);const fx=focus?.x??v.clientWidth/2,fy=focus?.y??v.clientHeight/2;let wx=null,wy=null;if(preserve){wx=(v.scrollLeft+fx-g)/old;wy=(v.scrollTop+fy-g)/old}window.canvasZoom=z;st.dataset.scale=String(z);st.style.setProperty('left',g+'px','important');st.style.setProperty('top',g+'px','important');st.style.setProperty('transform',`scale(${z})`,'important');st.style.setProperty('transform-origin','0 0','important');sf.style.width=(pageW()*z+g*2)+'px';sf.style.height=(pageH()*z+g*2)+'px';label(z);if(preserve&&wx!=null)requestAnimationFrame(()=>{v.scrollLeft=Math.max(0,g+wx*z-fx);v.scrollTop=Math.max(0,g+wy*z-fy)})}
  function fitDesktop(){const v=viewport();if(!v)return;const z=clamp(Math.min((v.clientWidth-88)/pageW(),(v.clientHeight-88)/pageH()),.18,1);applyDesktop(z,false);requestAnimationFrame(()=>{v.scrollLeft=0;v.scrollTop=0})}
  window.v115ApplyZoom=function(z,preserve=true,focus=null){innerWidth>=900&&window.__STUDIA_DESKTOP_UI_OWNER&&window.canvasZoomAt?window.canvasZoomAt(z,(viewport()?.getBoundingClientRect().left||0)+(focus?.x??viewport()?.clientWidth/2),(viewport()?.getBoundingClientRect().top||0)+(focus?.y??viewport()?.clientHeight/2)):mobile()?zoomMobile(z,focus):applyDesktop(z,preserve,focus)};
  window.setCanvasZoom=z=>window.v115ApplyZoom(z,true);
  window.canvasZoomBy=d=>window.v115ApplyZoom((window.canvasZoom||1)+Number(d||0),true);
  window.fitCanvasStage=window.fitCanvasToScreen=function(){mobileView.touched=false;mobile()?fitMobile(true):fitDesktop()};
  try{fitCanvasStage=window.fitCanvasStage;fitCanvasToScreen=window.fitCanvasToScreen;v96ApplyZoom=window.v115ApplyZoom;v108ApplyZoom=window.v115ApplyZoom;v112ApplyZoom=window.v115ApplyZoom}catch(_){ }

  function bindViewport(){
    const v=replaceViewport();if(!v||v.dataset.v115bound==='1')return;v.dataset.v115bound='1';
    // Phone: exactly two fingers own canvas zoom/pan. One finger is left to object selection/editing.
    v.addEventListener('touchstart',e=>{if(window.__STUDIA_V131_INPUT__||!editor()||!mobile()||e.touches.length!==2)return;const r=v.getBoundingClientRect(),a=e.touches[0],b=e.touches[1],mx=(a.clientX+b.clientX)/2-r.left,my=(a.clientY+b.clientY)/2-r.top;if(mx<0||my<0||mx>v.clientWidth||my>v.clientHeight)return;e.preventDefault();e.stopImmediatePropagation();const d=Math.max(1,Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY));pinch={d,z:mobileView.z,wx:(mx-mobileView.x)/mobileView.z,wy:(my-mobileView.y)/mobileView.z};mobileView.touched=true},{capture:true,passive:false});
    v.addEventListener('touchmove',e=>{if(window.__STUDIA_V131_INPUT__||!pinch||!editor()||!mobile()||e.touches.length!==2)return;const r=v.getBoundingClientRect(),a=e.touches[0],b=e.touches[1],mx=(a.clientX+b.clientX)/2-r.left,my=(a.clientY+b.clientY)/2-r.top,d=Math.max(1,Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)),z=clamp(pinch.z*d/pinch.d,.18,3.5);e.preventDefault();e.stopImmediatePropagation();mobileView.z=z;mobileView.x=mx-pinch.wx*z;mobileView.y=my-pinch.wy*z;applyMobile()},{capture:true,passive:false});
    const end=e=>{if(!e.touches||e.touches.length<2)pinch=null};v.addEventListener('touchend',end,{capture:true,passive:true});v.addEventListener('touchcancel',()=>{pinch=null},{capture:true,passive:true});
    // Laptop: Alt + wheel zooms around pointer; middle mouse pans like Adobe.
    v.addEventListener('wheel',e=>{if(window.__STUDIA_V131_INPUT__||!editor()||mobile()||!e.altKey)return;e.preventDefault();e.stopImmediatePropagation();const r=v.getBoundingClientRect(),focus={x:e.clientX-r.left,y:e.clientY-r.top};applyDesktop((window.canvasZoom||1)*Math.exp(-e.deltaY*.0022),true,focus)},{capture:true,passive:false});
    v.addEventListener('mousedown',e=>{if(window.__STUDIA_V131_INPUT__||!editor()||mobile()||e.button!==1)return;e.preventDefault();e.stopImmediatePropagation();desktopPan={x:e.clientX,y:e.clientY,l:v.scrollLeft,t:v.scrollTop};v.style.cursor='grabbing'},{capture:true});
    window.addEventListener('mousemove',e=>{if(!desktopPan)return;v.scrollLeft=desktopPan.l-(e.clientX-desktopPan.x);v.scrollTop=desktopPan.t-(e.clientY-desktopPan.y)},true);
    const stop=()=>{desktopPan=null;if(v)v.style.cursor=''};window.addEventListener('mouseup',stop,true);window.addEventListener('blur',stop);v.addEventListener('auxclick',e=>{if(e.button===1)e.preventDefault()});
  }

  // Desktop vector shapes: direct drag always works from the transparent hit target.
  document.addEventListener('pointerdown',e=>{if(window.__STUDIA_V131_INPUT__||!editor()||mobile()||e.button!==0)return;const t=e.target instanceof Element?e.target:null,hit=t?.closest('.vectorTouchProxy,.shapeHit');if(!hit||t.closest('.vectorResizeHandle,.vectorRotateHandle,.pathNode'))return;const vid=hit.dataset.vid,v=(window.canvasState?.vectors||[]).find(x=>x.id===vid);if(!vid||!v||v.locked)return;e.preventDefault();e.stopImmediatePropagation();if(e.shiftKey&&typeof toggleVectorInMultiSelection==='function'){toggleVectorInMultiSelection(vid);return}selectVector(vid);startVectorDrag(e,vid)},true);

  function syncDrawerState(){if(!editor()||!mobile())return;const d=document.getElementById('canvasQuickDrawer'),text=!!d?.querySelector('.mobileTextEditor')&&d.classList.contains('open');document.body.classList.toggle('v115TextEdit',text);const nav=document.querySelector('.canvasQuickNav');if(nav){nav.style.removeProperty('left');nav.style.removeProperty('right');nav.style.removeProperty('width');nav.style.removeProperty('transform')}}
  function init(forceFit=false){if(!editor())return;bindViewport();syncDrawerState();if(mobile())setTimeout(()=>fitMobile(forceFit),40);else setTimeout(fitDesktop,40)}

  const oldOpen=window.editorOpenGroup;window.editorOpenGroup=function(){const r=oldOpen.apply(this,arguments);requestAnimationFrame(syncDrawerState);return r};try{editorOpenGroup=window.editorOpenGroup}catch(_){ }
  const oldClose=window.closeEditorDrawer;window.closeEditorDrawer=function(){const r=oldClose.apply(this,arguments);document.body.classList.remove('v115TextEdit');requestAnimationFrame(syncDrawerState);return r};try{closeEditorDrawer=window.closeEditorDrawer}catch(_){ }
  const oldRender=window.renderSheetEditor||renderSheetEditor;window.renderSheetEditor=function(){const r=oldRender.apply(this,arguments);setTimeout(()=>init(true),360);return r};try{renderSheetEditor=window.renderSheetEditor}catch(_){ }
  const mo=new MutationObserver(()=>requestAnimationFrame(syncDrawerState));setTimeout(()=>{const d=document.getElementById('canvasQuickDrawer');if(d)mo.observe(d,{attributes:true,childList:true,subtree:true});if(editor())init(true)},180);
  window.addEventListener('resize',()=>{if(!editor())return;setTimeout(()=>{bindViewport();mobile()?fitMobile(false):fitDesktop()},100)});
  setTimeout(()=>{const e=document.getElementById('headerEyebrow');if(e)e.textContent='VERSION 202';document.title='Studia'},80);
})();
