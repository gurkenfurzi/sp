
(function(){
  const isEditor=()=>document.body.classList.contains('editorMode') && !!document.querySelector('#view-sheet-editor.active');
  const viewport=()=>document.getElementById('canvasViewport');
  const stage=()=>document.getElementById('canvasStage');
  const surface=()=>document.getElementById('v96PanSurface') || (typeof v96EnsurePanSurface==='function'?v96EnsurePanSurface():null);
  const isMobile=()=>window.innerWidth<900;
  const gutter=()=>isMobile()?150:90;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const moveIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3"/></svg>';

  // -------- Free page workspace + reliable zoom --------
  window.v108ApplyZoom=function(value,preserve=true,focus=null){
    const vp=viewport(),st=stage(),sf=surface();if(!vp||!st||!sf)return;
    const old=clamp(Number(st.dataset.scale)||Number(canvasZoom)||1,.2,4);
    const z=clamp(Number(value)||1,.22,3.2),g=gutter();
    const fx=focus?.x ?? vp.clientWidth/2, fy=focus?.y ?? vp.clientHeight/2;
    let pageX=null,pageY=null;
    if(preserve){
      const oldG=Number(sf.dataset.gutter)||g;
      pageX=(vp.scrollLeft+fx-oldG)/old;
      pageY=(vp.scrollTop+fy-oldG)/old;
    }
    canvasZoom=z;canvasState.userZoomTouched=true;
    st.dataset.scale=String(z);sf.dataset.gutter=String(g);
    st.style.zoom='';st.style.transform=`scale(${z})`;st.style.transformOrigin='0 0';st.style.left=g+'px';st.style.top=g+'px';
    sf.style.width=(canvasPageWidth()*z+g*2)+'px';sf.style.height=(canvasPageHeight()*z+g*2)+'px';
    const label=document.getElementById('canvasZoomLabel');if(label)label.textContent=Math.round(z*100)+'%';
    const pill=document.getElementById('v91ZoomLabel');if(pill)pill.textContent=Math.round(z*100)+'%';
    if(preserve&&pageX!=null){requestAnimationFrame(()=>{vp.scrollLeft=Math.max(0,g+pageX*z-fx);vp.scrollTop=Math.max(0,g+pageY*z-fy)})}
  };
  v96ApplyZoom=window.v108ApplyZoom;
  window.setCanvasZoom=function(v){v108ApplyZoom(v,true)};
  window.canvasZoomBy=function(d){v108ApplyZoom((canvasZoom||1)+Number(d||0),true)};
  window.v108FitCanvas=function(markUser=false){
    const vp=viewport();if(!vp)return;
    if(canvasState.userZoomTouched&&!markUser){v108ApplyZoom(canvasZoom||1,false);return}
    const z=clamp((vp.clientWidth-28)/canvasPageWidth(),.22,1),g=gutter();
    const was=canvasState.userZoomTouched;v108ApplyZoom(z,false);canvasState.userZoomTouched=markUser?true:was;
    requestAnimationFrame(()=>{vp.scrollLeft=Math.max(0,g-14);vp.scrollTop=Math.max(0,g-14)});
  };
  v96FitCanvas=window.v108FitCanvas;
  fitCanvasToScreen=function(){canvasState.userZoomTouched=false;v108FitCanvas(true)};window.fitCanvasToScreen=fitCanvasToScreen;
  fitCanvasStage=fitCanvasToScreen;window.fitCanvasStage=fitCanvasToScreen;
  shouldAutoFitCanvas=function(){return false};

  // Alt + mouse wheel zooms at the pointer. Window capture runs before old document handlers.
  window.addEventListener('wheel',function(e){if(window.__STUDIA_V115_OWNS_GESTURES)return;
    if(true)return;
    const vp=viewport();if(!vp)return;
    const t=e.target instanceof Element?e.target:null;
    if(t && !t.closest('#canvasViewport,#v96PanSurface,#canvasStage'))return;
    e.preventDefault();e.stopImmediatePropagation();
    const r=vp.getBoundingClientRect(),focus={x:e.clientX-r.left,y:e.clientY-r.top};
    const factor=Math.exp(-e.deltaY*0.0018);
    v108ApplyZoom((canvasZoom||1)*factor,true,focus);
  },{capture:true,passive:false});

  // Middle mouse button = Adobe-style hand/pan.
  let mousePan=null;
  window.addEventListener('mousedown',function(e){if(window.__STUDIA_V115_OWNS_GESTURES)return;
    if(!isEditor()||e.button!==1)return;const vp=viewport();if(!vp)return;
    const t=e.target instanceof Element?e.target:null;if(t&&!t.closest('#canvasViewport,#v96PanSurface,#canvasStage'))return;
    e.preventDefault();e.stopImmediatePropagation();mousePan={x:e.clientX,y:e.clientY,l:vp.scrollLeft,t:vp.scrollTop};vp.classList.add('v108Pan');
  },true);
  window.addEventListener('mousemove',function(e){if(!mousePan)return;const vp=viewport();if(!vp)return;vp.scrollLeft=mousePan.l-(e.clientX-mousePan.x);vp.scrollTop=mousePan.t-(e.clientY-mousePan.y)},true);
  const stopMousePan=()=>{mousePan=null;viewport()?.classList.remove('v108Pan')};
  window.addEventListener('mouseup',stopMousePan,true);window.addEventListener('blur',stopMousePan);
  window.addEventListener('auxclick',e=>{if(isEditor()&&e.button===1)e.preventDefault()},true);

  // Two-finger pinch AND pan. It never edits/moves page objects.
  let pinch=null;
  function touchMid(a,b,vp){const r=vp.getBoundingClientRect();return{x:(a.clientX+b.clientX)/2-r.left,y:(a.clientY+b.clientY)/2-r.top}}
  window.addEventListener('touchstart',function(e){if(window.__STUDIA_V115_OWNS_GESTURES)return;
    if(true)return;const vp=viewport();if(!vp||!vp.contains(e.target))return;
    e.preventDefault();e.stopImmediatePropagation();const a=e.touches[0],b=e.touches[1],m=touchMid(a,b,vp),z=canvasZoom||1,g=Number(surface()?.dataset.gutter)||gutter();
    pinch={dist:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY),zoom:z,pageX:(vp.scrollLeft+m.x-g)/z,pageY:(vp.scrollTop+m.y-g)/z};canvasState.userZoomTouched=true;
  },{capture:true,passive:false});
  window.addEventListener('touchmove',function(e){if(window.__STUDIA_V115_OWNS_GESTURES)return;
    if(true)return;const vp=viewport();if(!vp)return;e.preventDefault();e.stopImmediatePropagation();
    const a=e.touches[0],b=e.touches[1],m=touchMid(a,b,vp),dist=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY),z=clamp(pinch.zoom*(dist/pinch.dist),.22,3.2),g=gutter();
    v108ApplyZoom(z,false);requestAnimationFrame(()=>{vp.scrollLeft=Math.max(0,g+pinch.pageX*z-m.x);vp.scrollTop=Math.max(0,g+pinch.pageY*z-m.y)});
  },{capture:true,passive:false});
  window.addEventListener('touchend',e=>{if(e.touches.length<2)pinch=null},{capture:true,passive:true});
  window.addEventListener('touchcancel',()=>{pinch=null},{capture:true,passive:true});

  // -------- Selection/movement: tap selects on mobile, dedicated handle moves. Desktop drag works immediately. --------
  function selectedObject(id){return canvasState.selectedType==='object'&&canvasState.selectedId===id&&((canvasState.selectedIds||[]).includes(id));}
  function decorateObjects(){
    if(!isEditor())return;
    document.querySelectorAll('#canvasObjects .cobj').forEach(el=>{
      const id=el.dataset.id,o=canvasState.objects.find(x=>x.id===id);if(!o)return;
      if(o.isChecklist)el.classList.add('v108ChecklistObject');
      if(el.classList.contains('selected')&&!o.locked&&!o.editing&&!el.querySelector(':scope > .v108MoveHandle')){
        const b=document.createElement('button');b.type='button';b.className='v108MoveHandle';b.dataset.oid=id;b.title='Verschieben';b.setAttribute('aria-label','Element verschieben');b.innerHTML=moveIcon;el.appendChild(b);
      }
    });
  }
  function decorateVector(){
    const root=document.getElementById('canvasObjects');if(!root)return;root.querySelectorAll(':scope > .v108VectorMoveHandle').forEach(x=>x.remove());
    if(!isEditor()||canvasState.selectedType!=='vector'||!canvasState.selectedId)return;
    const v=canvasState.vectors.find(x=>x.id===canvasState.selectedId);if(!v||v.locked)return;const b=vectorBounds(v),btn=document.createElement('button');
    btn.type='button';btn.className='v108VectorMoveHandle';btn.dataset.vid=v.id;btn.title='Form verschieben';btn.innerHTML=moveIcon;btn.style.left=(b.cx-19)+'px';btn.style.top=(b.y+b.h+15)+'px';root.appendChild(btn);
  }
  const oldRenderObjects=renderCanvasObjects;
  renderCanvasObjects=function(){oldRenderObjects();decorateObjects();decorateVector()};
  const oldRenderVectors=renderVectors;
  renderVectors=function(){oldRenderVectors();decorateVector();decorateObjects()};

  let lastMobileTap={id:null,time:0};
  window.addEventListener('pointerdown',function(e){
    if(true)return;
    if(!isEditor())return;const target=e.target instanceof Element?e.target:null;if(!target)return;
    const move=target.closest('.v108MoveHandle,.v108VectorMoveHandle');
    if(move){
      e.preventDefault();e.stopImmediatePropagation();
      if(move.dataset.oid){const id=move.dataset.oid;if(!selectedObject(id))selectCanvasObject(id);if((selectedObjectIds().length+selectedVectorIds().length)>1)startDragSelection(e);else startDragObject(e,id)}
      else if(move.dataset.vid){selectVector(move.dataset.vid);startVectorDrag(e,move.dataset.vid)}
      return;
    }
    if(target.closest('.studiaCheck'))return;
    if(isMobile()){
      const c=target.closest('.cobj');
      if(c&&!target.closest('.resizeHandle,.rotateHandle,.tableMoveHandle,td')){
        const id=c.dataset.id,o=canvasState.objects.find(x=>x.id===id);if(!o)return;e.preventDefault();e.stopImmediatePropagation();
        const now=Date.now(),double=lastMobileTap.id===id&&now-lastMobileTap.time<330;lastMobileTap={id,time:now};selectCanvasObject(id);
        if(double&&['text','block','task','merke'].includes(o.kind)&&!o.isChecklist){o.editing=true;renderCanvasObjects();setTimeout(()=>{const el=document.querySelector(`.cobj[data-id="${id}"]`);try{el?.focus({preventScroll:true})}catch(_){el?.focus()}},0)}
        return;
      }
      const proxy=target.closest('.vectorTouchProxy');
      if(proxy){e.preventDefault();e.stopImmediatePropagation();selectVector(proxy.dataset.vid);return}
    }else{
      const c=target.closest('.cobj');
      if(c&&e.button===0&&!target.closest('.resizeHandle,.rotateHandle,.tableMoveHandle,td')&&!c.isContentEditable){
        const id=c.dataset.id,o=canvasState.objects.find(x=>x.id===id);if(!o||o.locked)return;e.preventDefault();e.stopImmediatePropagation();
        if(e.shiftKey){toggleObjectInMultiSelection(id);return}
        if(!selectedObject(id))selectCanvasObject(id);
        if((selectedObjectIds().length+selectedVectorIds().length)>1)startDragSelection(e);else startDragObject(e,id);return;
      }
    }
  },true);
  window.addEventListener('dblclick',function(e){
    if(window.__STUDIA_DESKTOP_STABILITY_REPAIR__||!isEditor())return;const c=e.target instanceof Element?e.target.closest('.cobj'):null;if(!c)return;const o=canvasState.objects.find(x=>x.id===c.dataset.id);if(!o||!['text','block','task','merke'].includes(o.kind)||o.isChecklist)return;
    e.preventDefault();o.editing=true;renderCanvasObjects();setTimeout(()=>{const el=document.querySelector(`.cobj[data-id="${o.id}"]`);try{el?.focus({preventScroll:true})}catch(_){el?.focus()}},0);
  },true);

  // -------- Canvas deletes: instant for ordinary editor elements; important library deletes keep their warnings. --------
  window.deleteLayerItem=function(kind,itemId){performDeleteLayerItem(kind,itemId)};
  window.deleteSelectedCanvasItem=function(){performDeleteSelectedCanvasItem()};

  // -------- Compact text box --------
  window.addCanvasTextBox=function(){
    const o=newCanvasObject('body');o.text='Textfeld';o.w=220;o.h=58;o.style.padding=8;o.style.fontSize=o.style.fontSize||16;o.style.borderWidth=1;o.style.borderColor='#e4d2cc';
    canvasState.objects.push(o);renderCanvasObjects();selectCanvasObject(o.id);markCanvasDirty();cuteToast('Textfeld eingefügt ♡');
  };

  // -------- Real round checkboxes --------
  function checklistHTML(labels=['Punkt 1','Punkt 2','Punkt 3']){
    return `<div class="v108ChecklistBody">${labels.map(x=>`<div class="v108ChecklistRow"><button type="button" class="studiaCheck" contenteditable="false" aria-checked="false"></button><span class="v108ChecklistText">${esc(x)}</span></div>`).join('')}</div>`;
  }
  window.addCanvasChecklist=function(){
    const o=newCanvasObject('body');o.text=checklistHTML();o.isChecklist=true;o.w=300;o.h=116;o.style.padding=10;o.style.borderWidth=0;o.style.background='transparent';
    canvasState.objects.push(o);renderCanvasObjects();selectCanvasObject(o.id);markCanvasDirty();cuteToast('Checkliste eingefügt ♡');
  };
  function migrateChecklists(){
    let changed=false;(canvasState.objects||[]).forEach(o=>{if(!o.isChecklist&&typeof o.text==='string'&&/☐\s*Punkt\s*1/i.test(o.text)){o.text=checklistHTML(['Punkt 1','Punkt 2','Punkt 3']);o.isChecklist=true;o.editing=false;changed=true}});if(changed)renderCanvasObjects();
  }
  window.addEventListener('pointerdown',function(e){const b=e.target instanceof Element?e.target.closest('.studiaCheck'):null;if(!b||!isEditor())return;e.preventDefault();e.stopImmediatePropagation()},true);
  window.addEventListener('click',function(e){
    const b=e.target instanceof Element?e.target.closest('.studiaCheck'):null;if(!b||!isEditor())return;e.preventDefault();e.stopImmediatePropagation();b.classList.toggle('done');b.setAttribute('aria-checked',b.classList.contains('done')?'true':'false');
    const c=b.closest('.cobj'),o=c?canvasState.objects.find(x=>x.id===c.dataset.id):null,body=c?.querySelector('.v108ChecklistBody');if(o&&body){o.text=body.outerHTML;markCanvasDirty();pushHistory()}
  },true);

  // Ensure the free workspace is restored whenever the editor is opened.
  const oldSheetRender=renderSheetEditor;
  renderSheetEditor=function(){
    oldSheetRender();setTimeout(()=>{migrateChecklists();surface();decorateObjects();decorateVector();v108FitCanvas(false)},120);
  };
  window.addEventListener('resize',()=>{if(isEditor())setTimeout(()=>{surface();v108ApplyZoom(canvasZoom||1,false)},40)});
})();
