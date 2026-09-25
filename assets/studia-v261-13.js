
(function(){
  function inEditor(){ return document.body.classList.contains('editorMode') && document.querySelector('#view-sheet-editor.active'); }
  function vp(){ return document.getElementById('canvasViewport'); }
  function fillDesktopDrawer(){if(window.__STUDIA_DESKTOP_UI_OWNER&&innerWidth>=900)return;
    if(window.innerWidth<900 || !inEditor()) return;
    const drawer=document.getElementById('canvasQuickDrawer');
    if(!drawer) return;
    if(!drawer.innerHTML.trim()){
      const html=(window.v103PaletteHTML||window.v102PaletteHTML)?.() || '';
      drawer.innerHTML=html;
      drawer.classList.add('open');
    }
  }
  function currentSheet(){ return (data.studySheets||[]).find(x=>x.id===selectedSheetId); }
  window.v107RenameCurrentResource=function(){
    const sh=currentSheet();
    const fallback=window.v102PendingResource?.name || 'Lernblatt';
    const prev=(sh?.title||fallback||'Lernblatt');
    const value=prompt('Neuer Name', prev);
    if(value===null) return;
    const next=String(value||'').trim();
    if(!next) return;
    if(sh) sh.title=next;
    if(window.v102PendingResource) window.v102PendingResource.name=next;
    const candidate=(canvasState.objects||[])
      .filter(o=>['text','block'].includes(o.kind) && typeof o.text==='string')
      .sort((a,b)=>(b.style?.fontSize||0)-(a.style?.fontSize||0))[0];
    if(candidate && String(candidate.text||'').trim()===String(prev).trim()) candidate.text=next;
    try{ save(); }catch(_){ }
    try{ renderCanvasObjects(); }catch(_){ }
    try{ markCanvasDirty(false); }catch(_){ }
    const title=document.querySelector('.canvasTopbar .editorTitle b');
    if(title) title.textContent=next;
  };
  function enhanceTopbar(){
    const top=document.querySelector('.canvasTopbar');
    if(!top) return;
    const titleWrap=top.querySelector('.editorTitle');
    if(titleWrap){
      titleWrap.classList.add('v107Renamable');
      titleWrap.title='Name ändern';
      titleWrap.onclick=(e)=>{ if(!e.target.closest('button')) window.v107RenameCurrentResource(); };
    }
    const actions=top.querySelector('.editorActions');
    if(actions && !actions.querySelector('.v107RenameBtn')){
      const btn=document.createElement('button');
      btn.className='v107RenameBtn';
      btn.title='Umbenennen';
      btn.innerHTML=(window.icon||window.v103Icon||window.v102Icon)?.('edit') || '✎';
      btn.onclick=window.v107RenameCurrentResource;
      actions.insertBefore(btn, actions.lastElementChild || null);
    }
  }
  let pan=null;
  function endPan(){
    pan=null;
    const v=vp();
    if(v) v.classList.remove('v107-panning');
  }
  document.addEventListener('wheel', function(e){
    if(!(window.innerWidth>=900 && inEditor() && e.altKey)) return;
    const v=vp(); if(!v || !v.contains(e.target)) return;
    e.preventDefault();
    const r=v.getBoundingClientRect();
    const focus={x:e.clientX-r.left,y:e.clientY-r.top};
    if(typeof v96ApplyZoom==='function') v96ApplyZoom((canvasZoom||1)*(e.deltaY<0?1.1:.9), true, focus);
  }, {passive:false, capture:true});
  document.addEventListener('mousedown', function(e){
    if(!(window.innerWidth>=900 && inEditor() && e.button===1)) return;
    const v=vp(); if(!v || !v.contains(e.target)) return;
    e.preventDefault();
    pan={x:e.clientX,y:e.clientY,l:v.scrollLeft,t:v.scrollTop};
    v.classList.add('v107-panning');
  }, true);
  window.addEventListener('mousemove', function(e){
    if(!pan) return;
    const v=vp(); if(!v) return;
    v.scrollLeft=pan.l-(e.clientX-pan.x);
    v.scrollTop=pan.t-(e.clientY-pan.y);
  }, true);
  window.addEventListener('mouseup', endPan, true);
  window.addEventListener('blur', endPan);
  document.addEventListener('auxclick', function(e){ if(pan && e.button===1) e.preventDefault(); }, true);

  const oldRender=renderSheetEditor;
  renderSheetEditor=function(){
    oldRender();
    setTimeout(()=>{ fillDesktopDrawer(); enhanceTopbar(); if(window.innerWidth>=900 && typeof v102RightTab==='function') v102RightTab(canvasState.selectedId?'design':'page'); }, 80);
    setTimeout(()=>{ fillDesktopDrawer(); enhanceTopbar(); }, 240);
  };
  document.addEventListener('click', ()=>setTimeout(()=>{ fillDesktopDrawer(); enhanceTopbar(); }, 0), true);
  window.addEventListener('resize', ()=>setTimeout(()=>{ fillDesktopDrawer(); enhanceTopbar(); }, 80));
})();
