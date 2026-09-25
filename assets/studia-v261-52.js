
(function(){
  'use strict';
  if(window.__STUDIA_V219__)return;
  window.__STUDIA_V219__=true;

  const q=(s,r=document)=>r?.querySelector?.(s)||null;
  const qa=(s,r=document)=>r?.querySelectorAll?[...r.querySelectorAll(s)]:[];
  const DRAFT_PREFIX='studia-v219-editor-draft:';
  const FORMULA_DRAFT_PREFIX='studia-v219-formula-draft:';
  let editorTouched=false;
  let canvasLive=false;
  let pendingCloud=false;
  let formulaAlign='center';
  let formulaEditId='';
  let formulaDraftTimer=0;

  function editorActive(){return document.body.classList.contains('editorMode')&&!!q('#view-sheet-editor.active')}
  function contextId(){
    let sid='';try{sid=String(selectedSheetId||'')}catch(_){sid=String(window.selectedSheetId||'')}
    if(sid)return 'sheet:'+sid;
    let sub='',topic='';try{sub=String(selectedSubjectId||'');topic=String(selectedTopicId||'')}catch(_){sub=String(window.selectedSubjectId||'');topic=String(window.selectedTopicId||'')}
    return 'new:'+sub+':'+topic;
  }
  function draftKey(){return DRAFT_PREFIX+contextId()}
  function formulaDraftKey(editId=formulaEditId){return FORMULA_DRAFT_PREFIX+contextId()+':'+String(editId||'new')}
  function currentCanvasPayload(){
    try{return {ts:Date.now(),context:contextId(),sheetId:String(selectedSheetId||''),snapshot:canvasSnapshot()}}catch(_){return null}
  }
  function writeCanvasDraft(){
    if(!editorActive())return;
    const payload=currentCanvasPayload();if(!payload)return;
    const raw=JSON.stringify(payload);
    try{sessionStorage.setItem(draftKey(),raw)}catch(_){}
    try{if(raw.length<1800000)localStorage.setItem(draftKey(),raw)}catch(_){}
    const st=q('#autosaveState');if(st&&editorTouched){st.textContent='Lokal geschützt · Autosave an';st.classList.add('v219ProtectedState')}
  }
  function readCanvasDraft(){
    const key=draftKey();let raw='';
    try{raw=sessionStorage.getItem(key)||localStorage.getItem(key)||''}catch(_){}
    if(!raw)return null;
    try{
      const d=JSON.parse(raw);if(!d?.snapshot||Date.now()-Number(d.ts||0)>24*60*60*1000)return null;
      let sid='';try{sid=String(selectedSheetId||'')}catch(_){sid=String(window.selectedSheetId||'')}
      const sh=sid?(data.studySheets||[]).find(x=>String(x.id)===sid):null;
      const savedAt=Number(sh?.v219LocalSavedAt||0);
      if(savedAt&&Number(d.ts||0)<=savedAt){try{sessionStorage.removeItem(key);localStorage.removeItem(key)}catch(_){};return null}
      return d;
    }catch(_){return null}
  }
  function restoreCanvasDraft(){
    const d=readCanvasDraft();if(!d)return false;
    try{
      const x=JSON.parse(d.snapshot);
      canvasState.objects=x.objects||[];canvasState.vectors=x.vectors||[];canvasState.orientation=x.orientation||'portrait';
      canvasState.pageStyle=x.pageStyle||canvasState.pageStyle;canvasState.layerGroups=x.layerGroups||[];
      canvasState.selectedType=null;canvasState.selectedId=null;canvasState.selectedIds=[];canvasState.selectedVectorIds=[];
      applyCanvasPageSize();renderCanvasObjects();renderVectors();renderCanvasInspector();renderLayerList?.();
      canvasState.lastSavedHash=canvasSnapshot();
      const st=q('#autosaveState');if(st){st.textContent='Letzten lokalen Stand wiederhergestellt ✓';st.className='autosaveState saved v219ProtectedState'}
      return true;
    }catch(err){console.warn('Studia V219 Draft konnte nicht wiederhergestellt werden',err);return false}
  }

  /* Every editor mutation gets a crash/sync-safe local draft immediately. */
  try{
    const baseSchedule=window.scheduleAutosave||scheduleAutosave;
    const wrappedSchedule=function(){editorTouched=true;writeCanvasDraft();return baseSchedule.apply(this,arguments)};
    window.scheduleAutosave=wrappedSchedule;try{scheduleAutosave=wrappedSchedule}catch(_){}
  }catch(_){}
  try{
    const baseMark=window.markCanvasDirty||markCanvasDirty;
    const wrappedMark=function(){editorTouched=true;writeCanvasDraft();return baseMark.apply(this,arguments)};
    window.markCanvasDirty=wrappedMark;try{markCanvasDirty=wrappedMark}catch(_){}
  }catch(_){}
  /* Stamp every completed local worksheet save. A draft is restored only when it is newer than this stamp. */
  try{
    const baseCanvasSave=window.saveCanvasSheetCore||saveCanvasSheetCore;
    const wrappedCanvasSave=function(){
      const out=baseCanvasSave.apply(this,arguments);
      try{
        const sid=String(selectedSheetId||'');const sh=(data.studySheets||[]).find(x=>String(x.id)===sid);
        if(sh){sh.v219LocalSavedAt=Date.now();localStorage.setItem(KEY,JSON.stringify(data))}
      }catch(_){}
      return out;
    };
    window.saveCanvasSheetCore=wrappedCanvasSave;try{saveCanvasSheetCore=wrappedCanvasSave}catch(_){}
  }catch(_){}

  /* A spontaneous rerender must never replace the live canvas while editing. */
  try{
    const baseRender=window.renderSheetEditor||renderSheetEditor;
    const safeRender=function(){
      if(editorActive()&&canvasLive&&!window.__v219ForceEditorRender)return;
      const out=baseRender.apply(this,arguments);
      canvasLive=true;
      setTimeout(()=>restoreCanvasDraft(),0);
      return out;
    };
    window.renderSheetEditor=safeRender;try{renderSheetEditor=safeRender}catch(_){}
  }catch(_){}
  try{
    const baseOpen=window.openStudySheetEditor;
    if(typeof baseOpen==='function'){
      window.openStudySheetEditor=function(){canvasLive=false;editorTouched=false;window.__v219ForceEditorRender=true;const r=baseOpen.apply(this,arguments);setTimeout(()=>{window.__v219ForceEditorRender=false;canvasLive=true;restoreCanvasDraft()},220);return r};
      try{openStudySheetEditor=window.openStudySheetEditor}catch(_){}
    }
  }catch(_){}

  /* Device sync: never pull/reconcile over an actively edited worksheet. */
  function installCloudGuard(){
    const fn=window.v171CloudNow;
    if(typeof fn!=='function'||fn.__v219Guarded)return;
    function guardedCloud(){
      if(editorActive()){
        pendingCloud=true;writeCanvasDraft();
        try{if(typeof saveCanvasSheetCore==='function')saveCanvasSheetCore(true)}catch(_){}
        const st=q('#autosaveState');if(st){st.textContent='Gespeichert · Geräte-Sync nach Editor';st.className='autosaveState saved v219ProtectedState'}
        return Promise.resolve({deferred:true});
      }
      return fn.apply(this,arguments);
    }
    guardedCloud.__v219Guarded=true;guardedCloud.__v219Original=fn;window.v171CloudNow=guardedCloud;
  }
  installCloudGuard();setInterval(installCloudGuard,1200);

  function flushBeforeLeave(){
    if(!editorActive())return;
    writeCanvasDraft();
    try{if(typeof saveCanvasSheetCore==='function')saveCanvasSheetCore(true)}catch(err){console.warn('Studia V219 local save',err)}
    try{window.v150MarkDirty?.(0)}catch(_){}
  }
  try{
    const baseOpenView=window.openView;
    if(typeof baseOpenView==='function'){
      window.openView=function(name){
        const leaving=editorActive()&&name!=='sheet-editor';if(leaving)flushBeforeLeave();
        const r=baseOpenView.apply(this,arguments);
        if(leaving){canvasLive=false;setTimeout(()=>{installCloudGuard();if(pendingCloud){pendingCloud=false;try{window.v150MarkDirty?.(0)}catch(_){}}},120)}
        return r;
      };
      try{openView=window.openView}catch(_){}
    }
  }catch(_){}
  window.addEventListener('beforeunload',()=>{if(editorActive())writeCanvasDraft()});

  /* Formula UI: ⋅ instead of ×, f(x)= shortcut, local formula draft and alignment. */
  function saveFormulaDraft(){
    const ed=q('#formulaVisualEditor');if(!ed)return;
    const payload={ts:Date.now(),html:ed.innerHTML,align:formulaAlign,editId:String(formulaEditId||'')};
    try{sessionStorage.setItem(formulaDraftKey(),JSON.stringify(payload));localStorage.setItem(formulaDraftKey(),JSON.stringify(payload))}catch(_){}
  }
  function readFormulaDraft(editId){
    let raw='';try{raw=sessionStorage.getItem(formulaDraftKey(editId))||localStorage.getItem(formulaDraftKey(editId))||''}catch(_){}
    if(!raw)return null;try{const d=JSON.parse(raw);return Date.now()-Number(d.ts||0)<24*60*60*1000?d:null}catch(_){return null}
  }
  function clearFormulaDraft(editId){try{sessionStorage.removeItem(formulaDraftKey(editId));localStorage.removeItem(formulaDraftKey(editId))}catch(_){}}
  window.v219SetFormulaAlign=function(align){
    if(!['left','center','right'].includes(align))return;formulaAlign=align;
    const ed=q('#formulaVisualEditor');if(ed)ed.style.textAlign=align;
    qa('.v219FormulaAlign button').forEach(b=>b.classList.toggle('active',b.dataset.align===align));
    saveFormulaDraft();
  };
  function enhanceFormulaDialog(editId){
    const ed=q('#formulaVisualEditor');if(!ed)return;
    formulaEditId=String(editId||'');
    let old=null;try{old=editId?canvasState.objects.find(x=>String(x.id)===String(editId)):null}catch(_){}
    formulaAlign=old?.style?.textAlign||'center';

    const ops=q('.formulaInlineOps');
    if(ops){
      const times=qa('button',ops).find(b=>(b.textContent||'').trim()==='×');
      if(times){times.textContent='⋅';times.title='Mal';times.onclick=()=>insertHTMLAtCaret('⋅')}
      if(!q('.v219FxBtn',ops)){
        const fx=document.createElement('button');fx.type='button';fx.className='v219FxBtn';fx.textContent='f(x)=';fx.title='f(x)=';fx.onclick=()=>insertHTMLAtCaret('f(x) = ');ops.appendChild(fx);
      }
    }
    if(!q('.v219FormulaAlign')){
      const bar=document.createElement('div');bar.className='v219FormulaAlign';
      bar.innerHTML='<span>Ausrichtung</span><button type="button" data-align="left" onclick="v219SetFormulaAlign(\'left\')" title="Links">≡</button><button type="button" data-align="center" onclick="v219SetFormulaAlign(\'center\')" title="Zentriert">≣</button><button type="button" data-align="right" onclick="v219SetFormulaAlign(\'right\')" title="Rechts">≡</button>';
      ops?.insertAdjacentElement('afterend',bar);
    }
    const draft=readFormulaDraft(editId);
    if(draft?.html){ed.innerHTML=draft.html;formulaAlign=draft.align||formulaAlign}
    ed.innerHTML=ed.innerHTML.replace(/×/g,'⋅');
    ed.style.textAlign=formulaAlign;
    qa('.v219FormulaAlign button').forEach(b=>b.classList.toggle('active',b.dataset.align===formulaAlign));
    ed.addEventListener('input',()=>{clearTimeout(formulaDraftTimer);formulaDraftTimer=setTimeout(saveFormulaDraft,60)});
    saveFormulaDraft();
  }
  try{
    const baseFormula=window.openFormulaDialog;
    if(typeof baseFormula==='function'){
      window.openFormulaDialog=function(editId=''){const r=baseFormula.apply(this,arguments);setTimeout(()=>enhanceFormulaDialog(editId),95);return r};
      try{openFormulaDialog=window.openFormulaDialog}catch(_){}
    }
  }catch(_){}
  try{
    const baseInsert=window.insertVisualFormula;
    if(typeof baseInsert==='function'){
      window.insertVisualFormula=function(type){if(type==='times'){insertHTMLAtCaret('⋅');return}return baseInsert.apply(this,arguments)};
      try{insertVisualFormula=window.insertVisualFormula}catch(_){}
    }
  }catch(_){}
  try{
    const baseFormulaToHTML=window.formulaToHTML||formulaToHTML;
    const newFormulaToHTML=function(expr){return String(baseFormulaToHTML.apply(this,arguments)).replace(/×/g,'⋅')};
    window.formulaToHTML=newFormulaToHTML;try{formulaToHTML=newFormulaToHTML}catch(_){}
  }catch(_){}
  try{
    const baseSaveFormula=window.saveFormulaObject;
    if(typeof baseSaveFormula==='function'){
      window.saveFormulaObject=function(editId=''){
        const align=formulaAlign;const targetId=String(editId||'');
        const out=baseSaveFormula.apply(this,arguments);
        try{
          let o=targetId?canvasState.objects.find(x=>String(x.id)===targetId):canvasState.objects.find(x=>String(x.id)===String(canvasState.selectedId)&&x.kind==='formula');
          if(o){o.style=o.style||{};o.style.textAlign=align;o.formulaHTML=String(o.formulaHTML||'').replace(/×/g,'⋅');renderCanvasObjects();renderCanvasInspector();markCanvasDirty();pushHistory()}
        }catch(_){}
        clearFormulaDraft(editId);formulaEditId='';return out;
      };
      try{saveFormulaObject=window.saveFormulaObject}catch(_){}
    }
  }catch(_){}

  function paintFormulaAlignment(){
    try{
      for(const el of qa('.formulaObj')){
        const o=canvasState.objects.find(x=>String(x.id)===String(el.dataset.id));if(!o)continue;
        const a=o.style?.textAlign||'center';el.style.justifyContent=a==='left'?'flex-start':a==='right'?'flex-end':'center';
        const c=q('.formulaContent',el);if(c){c.style.width='100%';c.style.textAlign=a}
      }
      const insp=q('#canvasInspector .formulaInspector');
      if(insp&&!q('.v219InspectorAlign',insp)){
        const o=canvasState.objects.find(x=>String(x.id)===String(canvasState.selectedId));const a=o?.style?.textAlign||'center';
        const row=document.createElement('div');row.className='v219FormulaAlign v219InspectorAlign';
        row.innerHTML='<span>Formel ausrichten</span><button type="button" data-align="left" onclick="updateFormulaStyle(\'textAlign\',\'left\')">≡</button><button type="button" data-align="center" onclick="updateFormulaStyle(\'textAlign\',\'center\')">≣</button><button type="button" data-align="right" onclick="updateFormulaStyle(\'textAlign\',\'right\')">≡</button>';
        qa('button',row).forEach(b=>b.classList.toggle('active',b.dataset.align===a));insp.appendChild(row);
      }
    }catch(_){}
  }
  try{
    const baseObjects=window.renderCanvasObjects||renderCanvasObjects;
    window.renderCanvasObjects=function(){const r=baseObjects.apply(this,arguments);requestAnimationFrame(paintFormulaAlignment);return r};try{renderCanvasObjects=window.renderCanvasObjects}catch(_){}
  }catch(_){}
  try{
    const baseInspector=window.renderCanvasInspector||renderCanvasInspector;
    window.renderCanvasInspector=function(){const r=baseInspector.apply(this,arguments);requestAnimationFrame(paintFormulaAlignment);return r};try{renderCanvasInspector=window.renderCanvasInspector}catch(_){}
  }catch(_){}

  /* Show current version without changing app content. */
  const setVersion=()=>{const e=q('#headerEyebrow');if(e)e.textContent='VERSION 220'};
  [0,250,900,1800].forEach(t=>setTimeout(setVersion,t));
})();
