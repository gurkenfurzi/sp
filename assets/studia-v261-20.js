
(function(){
  const isMobile=()=>window.innerWidth<900;
  const inEditor=()=>document.body.classList.contains('editorMode')&&!!document.querySelector('#view-sheet-editor.active');
  const NS='http://www.w3.org/2000/svg';

  function killFloatingSelectionTools(){
    const el=document.getElementById('mobileSelectionTools');
    if(!el)return;
    el.classList.remove('show');
    el.innerHTML='';
    el.style.setProperty('display','none','important');
  }
  window.updateMobileSelectionTools=function(){killFloatingSelectionTools()};
  try{updateMobileSelectionTools=window.updateMobileSelectionTools}catch(_){ }

  function polishLayerUI(root=document){
    if(!isMobile())return;
    root.querySelectorAll?.('.mobileLayerList .layerDeleteBtn').forEach(btn=>{
      btn.innerHTML='×';
      btn.setAttribute('aria-label','Ebene löschen');
      btn.title='Löschen';
    });
    root.querySelectorAll?.('.mobileLayerList .layerTools button').forEach(btn=>{
      btn.style.removeProperty('flex');
      btn.style.removeProperty('width');
    });
  }

  const oldLayers=window.renderLayerList||((typeof renderLayerList==='function')?renderLayerList:null);
  if(oldLayers){
    window.renderLayerList=function(){
      const r=oldLayers.apply(this,arguments);
      requestAnimationFrame(()=>polishLayerUI(document));
      return r;
    };
    try{renderLayerList=window.renderLayerList}catch(_){ }
  }

  function addShapeMoveHandles(){
    if(!inEditor()||!isMobile())return;
    const selectedIds=new Set([...(window.canvasState?.selectedVectorIds||[]),window.canvasState?.selectedType==='vector'?window.canvasState?.selectedId:null].filter(Boolean));
    document.querySelectorAll('.vectorObj').forEach(svg=>{
      svg.querySelectorAll('.v116ShapeMoveHandle').forEach(x=>x.remove());
      const vid=svg.getAttribute('data-vector-wrap');
      if(!selectedIds.has(vid))return;
      const v=(window.canvasState?.vectors||[]).find(x=>x.id===vid);if(!v||v.locked)return;
      const b=typeof vectorBounds==='function'?vectorBounds(v):null;if(!b)return;
      const pageW=typeof canvasPageWidth==='function'?canvasPageWidth():794;
      const x=Math.max(24,Math.min(pageW-24,b.x+b.w/2));
      const y=Math.max(24,b.y-28);
      const g=document.createElementNS(NS,'g');
      g.setAttribute('class','v116ShapeMoveHandle');
      g.setAttribute('data-vid',vid);
      g.setAttribute('transform',`translate(${x} ${y})`);
      g.innerHTML='<circle r="19"></circle><path d="M0 -10V10M-10 0H10M0 -10l-4 4M0 -10l4 4M0 10l-4-4M0 10l4-4M-10 0l4-4M-10 0l4 4M10 0l-4-4M10 0l-4 4"></path>';
      g.addEventListener('pointerdown',e=>{
        e.preventDefault();e.stopPropagation();
        try{selectVector(vid)}catch(_){ }
        try{startVectorDrag(e,vid)}catch(_){ }
      },{passive:false});
      svg.appendChild(g);
    });
  }

  const oldVectors=window.renderVectors||((typeof renderVectors==='function')?renderVectors:null);
  if(oldVectors){
    window.renderVectors=function(){
      const r=oldVectors.apply(this,arguments);
      requestAnimationFrame(addShapeMoveHandles);
      return r;
    };
    try{renderVectors=window.renderVectors}catch(_){ }
  }

  /* Desktop: reinforce direct shape dragging without touching phone pinch gestures. */
  document.addEventListener('pointerdown',e=>{
    if(!inEditor()||isMobile()||e.button!==0)return;
    const hit=e.target instanceof Element?e.target.closest('.vectorTouchProxy,.shapeHit'):null;
    if(!hit)return;
    const vid=hit.getAttribute('data-vid');
    const v=(window.canvasState?.vectors||[]).find(x=>x.id===vid);
    if(!vid||!v||v.locked)return;
    e.preventDefault();e.stopImmediatePropagation();
    try{selectVector(vid);startVectorDrag(e,vid)}catch(_){ }
  },true);

  function sweep(){
    killFloatingSelectionTools();
    polishLayerUI(document);
    addShapeMoveHandles();
  }

  const drawer=document.getElementById('canvasQuickDrawer');
  if(drawer)new MutationObserver(()=>requestAnimationFrame(sweep)).observe(drawer,{subtree:true,childList:true,attributes:true});
  document.addEventListener('click',()=>requestAnimationFrame(sweep),true);
  window.addEventListener('resize',()=>setTimeout(sweep,40));
  setTimeout(()=>{
    sweep();
    const e=document.getElementById('headerEyebrow');if(e)e.textContent='VERSION 202';
    document.title='Studia';
  },220);
})();
