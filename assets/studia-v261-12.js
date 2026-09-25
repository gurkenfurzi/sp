
(function(){
  function afterPaint(fn){setTimeout(fn,0)}

  window.fitCanvasStage=function(){
    try{ v96FitCanvas(false); }
    catch(_){ try{ fitCanvasToScreen?.(); }catch(__){} }
  };

  // Mobile selection toolbar: add a dedicated drag handle like Canva.
  const _oldMobileTools = window.updateMobileSelectionTools;
  window.v106MoveSelectedStart=function(e){
    e.preventDefault();
    e.stopPropagation();
    if(canvasState.selectedType==='object' && canvasState.selectedId){
      startDragObject(e, canvasState.selectedId);
      return;
    }
    if(canvasState.selectedVectorIds?.length){
      startVectorDrag(e, canvasState.selectedVectorIds[0]);
    }
  };
  updateMobileSelectionTools=function(){
    if(typeof _oldMobileTools==='function') _oldMobileTools();
    const el=document.getElementById('mobileSelectionTools');
    if(!el || !el.classList.contains('show')) return;
    if(!el.querySelector('.v106MoveBtn')){
      const btn=document.createElement('button');
      btn.className='v106MoveBtn';
      btn.title='Verschieben';
      btn.innerHTML='↔';
      btn.onpointerdown=window.v106MoveSelectedStart;
      el.insertBefore(btn, el.firstChild);
    }
  };

  // Font preview in the desktop properties select.
  function v106EnhanceFontPreview(){
    document.querySelectorAll('#desktopEditorSidebar select.fontSelect').forEach(sel=>{
      if(!sel.dataset.v106Bound){
        sel.dataset.v106Bound='1';
        sel.addEventListener('change',()=>afterPaint(v106EnhanceFontPreview));
      }
      [...sel.options].forEach(opt=>{ const ff=opt.value||opt.textContent||'Arial'; opt.style.fontFamily=ff; });
      const ff=sel.value||sel.options[sel.selectedIndex]?.value||'Arial';
      sel.style.fontFamily=ff;
    });
  }

  // Drag & drop page reordering.
  let v106PageDragFrom=null;
  function clearDragState(){ document.querySelectorAll('.v96PageThumb,.v106PageButton').forEach(x=>x.classList.remove('dragging','dropTarget')); }
  window.v106PageDragStart=function(e,index){ v106PageDragFrom=Number(index); e.dataTransfer?.setData('text/plain', String(index)); e.dataTransfer && (e.dataTransfer.effectAllowed='move'); e.currentTarget.classList.add('dragging'); };
  window.v106PageDragOver=function(e){ e.preventDefault(); e.currentTarget.classList.add('dropTarget'); };
  window.v106PageDragLeave=function(e){ e.currentTarget.classList.remove('dropTarget'); };
  window.v106PageDragEnd=function(){ v106PageDragFrom=null; clearDragState(); };
  window.v106ReorderPages=function(from,to){
    v96SyncPage();
    from=Number(from); to=Number(to);
    if(!canvasState.pages?.length || from===to || from<0 || to<0 || from>=canvasState.pages.length || to>=canvasState.pages.length) return;
    const moving=canvasState.pages.splice(from,1)[0];
    canvasState.pages.splice(to,0,moving);
    if(canvasState.activePage===from) canvasState.activePage=to;
    else if(from<canvasState.activePage && to>=canvasState.activePage) canvasState.activePage--;
    else if(from>canvasState.activePage && to<=canvasState.activePage) canvasState.activePage++;
    v96LoadPageData(canvasState.pages[canvasState.activePage]);
    v96RenderPageStrip();
    if(window.innerWidth>=900 && typeof v102RightTab==='function') setTimeout(()=>v102RightTab('page'),20);
    markCanvasDirty();
  };
  window.v106PageDrop=function(e,index){
    e.preventDefault();
    const from=v106PageDragFrom;
    clearDragState();
    v106PageDragFrom=null;
    if(from==null) return;
    window.v106ReorderPages(from,index);
  };

  const _oldPageStrip=v96RenderPageStrip;
  v96RenderPageStrip=function(){
    const strip=v96EnsurePageStrip();
    if(!strip) return;
    canvasState.pages ||= [v96CurrentPageData()];
    strip.innerHTML=`<div class="v96PageThumbs v103PageThumbs">${canvasState.pages.map((p,i)=>`<button class="v96PageThumb ${i===canvasState.activePage?'active':''}" draggable="true" onclick="v96SwitchPage(${i})" ondragstart="v106PageDragStart(event,${i})" ondragover="v106PageDragOver(event,${i})" ondragleave="v106PageDragLeave(event)" ondrop="v106PageDrop(event,${i})" ondragend="v106PageDragEnd()"><span>${i+1}</span><small>Seite ${i+1}</small></button>`).join('')}<button class="v96PageAdd v103PageAdd" onclick="v96AddPage()">${(window.icon||window.v103Icon||window.v102Icon)?.('plus')||'+'}<small>Seite hinzufügen</small></button></div><div class="v96PageActions"><button title="Duplizieren" onclick="v96DuplicatePage()">${(window.icon||window.v103Icon||window.v102Icon)?.('duplicate')||'⧉'}</button><button title="Löschen" onclick="v96DeletePage()">${(window.icon||window.v103Icon||window.v102Icon)?.('trash')||'⌫'}</button></div>`;
  };

  const _oldRightTab = window.v102RightTab;
  window.v102RightTab=function(mode){
    if(typeof _oldRightTab==='function') _oldRightTab(mode);
    if(mode==='page'){
      const list=document.querySelector('#v102PagePanel .v102SidePages');
      if(list){
        [...list.querySelectorAll('button')].forEach((btn,i)=>{
          btn.classList.add('v106PageButton');
          btn.setAttribute('draggable','true');
          btn.ondragstart=(e)=>v106PageDragStart(e,i);
          btn.ondragover=(e)=>v106PageDragOver(e,i);
          btn.ondragleave=(e)=>v106PageDragLeave(e);
          btn.ondrop=(e)=>v106PageDrop(e,i);
          btn.ondragend=()=>v106PageDragEnd();
        });
        if(!list.parentElement.querySelector('.v106DragHint')){
          const hint=document.createElement('div');
          hint.className='v106DragHint';
          hint.textContent='Seitenreihenfolge ändern: Seite ziehen und loslassen.';
          list.insertAdjacentElement('afterend', hint);
        }
      }
    }
    afterPaint(v106EnhanceFontPreview);
  };

  const _oldRenderSheetEditor = renderSheetEditor;
  renderSheetEditor=function(){
    _oldRenderSheetEditor();
    setTimeout(()=>{
      if(window.innerWidth>=900){
        const drawer=document.getElementById('canvasQuickDrawer');
        if(drawer && !drawer.innerHTML.trim() && window.v102PaletteHTML) drawer.innerHTML=window.v102PaletteHTML();
        v102RightTab(canvasState.selectedId?'design':'page');
      }
      v106EnhanceFontPreview();
      updateMobileSelectionTools();
    },160);
  };

  document.addEventListener('click',()=>afterPaint(v106EnhanceFontPreview),true);
  window.addEventListener('resize',()=>afterPaint(v106EnhanceFontPreview));
})();
