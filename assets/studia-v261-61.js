
(()=>{
'use strict';
if(window.__STUDIA_V230__) return; window.__STUDIA_V230__=true;
const q=(s,r=document)=>r?.querySelector?.(s)||null;
const qa=(s,r=document)=>r?.querySelectorAll?[...r.querySelectorAll(s)]:[];
let lastFormulaRange=null;

function formulaEditor(){return q('#formulaVisualEditor')}
function rangeInside(ed,r){
  if(!ed||!r)return false;
  try{return ed.contains(r.commonAncestorContainer)}catch(_){return false}
}
function rememberFormulaCaret(){
  const ed=formulaEditor(),s=getSelection();
  if(!ed||!s?.rangeCount)return false;
  const r=s.getRangeAt(0);
  if(!rangeInside(ed,r))return false;
  try{lastFormulaRange=r.cloneRange();return true}catch(_){return false}
}
function usableFormulaRange(ed){
  const s=getSelection();
  if(s?.rangeCount){const r=s.getRangeAt(0);if(rangeInside(ed,r))return r.cloneRange()}
  if(lastFormulaRange&&rangeInside(ed,lastFormulaRange)){try{return lastFormulaRange.cloneRange()}catch(_){}}
  const r=document.createRange();r.selectNodeContents(ed);r.collapse(false);return r;
}
function setSelectionRange(r){
  const s=getSelection();if(!s)return;
  s.removeAllRanges();s.addRange(r);
  try{lastFormulaRange=r.cloneRange()}catch(_){ }
}
function selectSlot(slot){
  if(!slot)return;
  const r=document.createRange();r.selectNodeContents(slot);setSelectionRange(r);slot.focus?.();
}
function trailingTextAtom(text,offset){
  const before=String(text||'').slice(0,offset);
  const m=before.match(/([A-Za-zÄÖÜäöüß]+|\d+(?:[.,]\d+)?|π)\s*$/);
  return m?{token:m[1],start:before.lastIndexOf(m[1])}:null;
}
function makePower(baseHTML){
  const wrap=document.createElement('span');wrap.className='vfPower';
  const base=document.createElement('span');base.className='vfPowerBase';base.innerHTML=baseHTML||'x';
  const sup=document.createElement('sup');sup.className='vfEditable vfExponentSlot';sup.contentEditable='true';sup.textContent='n';
  wrap.append(base,sup);return {wrap,sup};
}
function insertPowerAtSavedCaret(){
  const ed=formulaEditor();if(!ed)return false;
  ed.focus({preventScroll:true});
  const r=usableFormulaRange(ed);
  let baseHTML='';

  /* Markierte Formel = exakt diese Auswahl wird die Basis. */
  if(!r.collapsed){
    const d=document.createElement('div');d.appendChild(r.cloneContents());baseHTML=d.innerHTML;
    r.deleteContents();
  }else{
    let sc=r.startContainer,off=r.startOffset;
    if(sc.nodeType===Node.TEXT_NODE){
      const hit=trailingTextAtom(sc.nodeValue,off);
      if(hit){
        baseHTML=sc.ownerDocument.createElement('div').appendChild(document.createTextNode(hit.token)).parentNode?.innerHTML||hit.token;
        const old=String(sc.nodeValue||'');
        sc.nodeValue=old.slice(0,hit.start)+old.slice(off);
        r.setStart(sc,hit.start);r.collapse(true);
      }else{
        const prev=sc.previousSibling;
        if(prev?.nodeType===Node.ELEMENT_NODE && !prev.matches('br')){
          baseHTML=prev.outerHTML;prev.remove();
        }
      }
    }else if(sc.nodeType===Node.ELEMENT_NODE){
      const prev=sc.childNodes[Math.max(0,off-1)];
      if(prev?.nodeType===Node.TEXT_NODE){
        const hit=trailingTextAtom(prev.nodeValue,String(prev.nodeValue||'').length);
        if(hit){
          baseHTML=hit.token;
          prev.nodeValue=String(prev.nodeValue||'').slice(0,hit.start);
          r.setStartAfter(prev);r.collapse(true);
        }
      }else if(prev?.nodeType===Node.ELEMENT_NODE && !prev.matches('br')){
        baseHTML=prev.outerHTML;prev.remove();
      }
    }
  }

  /* Ohne vorherige Basis bleibt das bisherige sinnvolle Default x – aber exakt AM Cursor. */
  if(!String(baseHTML).trim())baseHTML='x';
  const {wrap,sup}=makePower(baseHTML);
  r.insertNode(wrap);
  const space=document.createTextNode('\u00a0');wrap.after(space);
  selectSlot(sup);
  try{installFormulaSlotProtection?.(ed)}catch(_){ }
  try{window.v228EnhanceSlots?.(ed)}catch(_){ }
  ed.dispatchEvent(new Event('input',{bubbles:true}));
  rememberFormulaCaret();
  return true;
}

/* Cursorposition dauerhaft merken. Buttons dürfen den Caret nicht klauen. */
document.addEventListener('selectionchange',rememberFormulaCaret);
document.addEventListener('keyup',e=>{if(e.target instanceof Element&&e.target.closest('#formulaVisualEditor'))rememberFormulaCaret()},true);
document.addEventListener('pointerup',e=>{if(e.target instanceof Element&&e.target.closest('#formulaVisualEditor'))setTimeout(rememberFormulaCaret,0)},true);
document.addEventListener('pointerdown',e=>{
  const b=e.target instanceof Element?e.target.closest('.visualFormulaModal button,.formulaModal button'):null;
  if(!b||!formulaEditor())return;
  rememberFormulaCaret();
  /* Mousedown-Fokus auf Toolbar verhindern; click/onclick läuft trotzdem. */
  e.preventDefault();
},true);

/* Letzter Override: Power benutzt NICHT mehr die alten gestapelten Fallbacks. */
const prevInsert=window.insertVisualFormula;
window.insertVisualFormula=function(type){
  if(type==='power')return insertPowerAtSavedCaret();
  return prevInsert?.apply(this,arguments);
};
try{insertVisualFormula=window.insertVisualFormula}catch(_){ }

/* ---------------- Textgröße oben: sofort reagieren, ohne Auswahl zu verlieren ---------------- */
let topSizeObjectId=null,topSizeRange=null,topSizeTimer=0;
function selectedTextObject(){
  try{
    if(canvasState?.selectedType!=='object')return null;
    const o=canvasState.objects?.find(x=>String(x.id)===String(canvasState.selectedId));
    return o&&['text','block','task','merke'].includes(o.kind)&&!o.isChecklist?o:null;
  }catch(_){return null}
}
function rememberTopSizeContext(){
  const o=selectedTextObject();topSizeObjectId=o?.id||null;topSizeRange=null;
  const s=getSelection();const el=o&&q(`#canvasObjects .cobj[data-id="${CSS.escape(String(o.id))}"]`);
  if(el&&s?.rangeCount&&!s.isCollapsed){
    const r=s.getRangeAt(0),n=r.commonAncestorContainer.nodeType===1?r.commonAncestorContainer:r.commonAncestorContainer.parentNode;
    if(n&&(n===el||el.contains(n)))try{topSizeRange=r.cloneRange()}catch(_){ }
  }
  try{window.v152RememberRange?.()}catch(_){ }
}
function applyTopSize(input,final=false){
  const px=Math.max(6,Math.min(180,Number(input?.value)||16));if(input)input.value=String(px);
  let o=selectedTextObject();
  if(!o&&topSizeObjectId)try{o=canvasState.objects?.find(x=>String(x.id)===String(topSizeObjectId))||null}catch(_){ }
  if(!o)return;
  /* Bei markiertem Teil: Range wiederherstellen und bestehende Textformatierung benutzen. */
  if(topSizeRange){
    const el=q(`#canvasObjects .cobj[data-id="${CSS.escape(String(o.id))}"]`);
    try{if(el&&el.contains(topSizeRange.commonAncestorContainer)){el.focus({preventScroll:true});const s=getSelection();s.removeAllRanges();s.addRange(topSizeRange.cloneRange());window.applyTextProperty?.('fontSize',px);return}}catch(_){ }
  }
  /* Ganzes Textfeld: live ändern, ohne Toolbar/Input durch komplettes Rendern zu zerstören. */
  o.style||={};o.style.fontSize=px;
  const el=q(`#canvasObjects .cobj[data-id="${CSS.escape(String(o.id))}"]`);if(el)el.style.fontSize=px+'px';
  try{markCanvasDirty?.(false)}catch(_){ }
  clearTimeout(topSizeTimer);topSizeTimer=setTimeout(()=>{try{renderCanvasInspector?.();syncToolbar?.()}catch(_){ }},80);
  if(final)try{markCanvasDirty?.();pushHistory?.();renderCanvasInspector?.()}catch(_){ }
}
document.addEventListener('pointerdown',e=>{
  const inp=e.target instanceof Element?e.target.closest('.v134FormatTools input.size'):null;
  if(inp)rememberTopSizeContext();
},true);
document.addEventListener('input',e=>{
  const inp=e.target instanceof Element?e.target.closest('.v134FormatTools input.size'):null;
  if(inp)applyTopSize(inp,false);
},true);
document.addEventListener('change',e=>{
  const inp=e.target instanceof Element?e.target.closest('.v134FormatTools input.size'):null;
  if(inp)applyTopSize(inp,true);
},true);
document.addEventListener('keydown',e=>{
  const inp=e.target instanceof Element?e.target.closest('.v134FormatTools input.size'):null;
  if(inp&&e.key==='Enter'){e.preventDefault();applyTopSize(inp,true);inp.blur()}
},true);

/* ---------------- Desktop-Shortcuts: eigener letzter Capture-Handler ---------------- */
function editorShortcutActive(){return innerWidth>=900&&document.body.classList.contains('editorMode')&&!!q('#view-sheet-editor.active')}
function typingTarget(t){
  const el=t instanceof Element?t:null;
  return !!el&&(!!el.closest('input,textarea,select,[contenteditable="true"]'));
}
function handleShortcut(e){
  if(!editorShortcutActive())return;
  const key=String(e.key||'').toLowerCase(),mod=e.ctrlKey||e.metaKey,typing=typingTarget(e.target);
  /* Speichern soll überall im Editor funktionieren. Alles andere lässt Texteingabe in Ruhe. */
  if(mod&&key==='s'){
    e.preventDefault();e.stopImmediatePropagation();try{saveSheetNow?.();cuteToast?.('Gespeichert ✓')}catch(_){ }return;
  }
  if(typing)return;
  const run=fn=>{e.preventDefault();e.stopImmediatePropagation();try{fn?.()}catch(_){ }};
  if(mod&&key==='z'&&e.shiftKey)return run(window.redoCanvas||window.redo);
  if(mod&&key==='z')return run(window.undoCanvas||window.undo);
  if(mod&&key==='y')return run(window.redoCanvas||window.redo);
  if(mod&&key==='c')return run(window.copySelectedCanvasItems);
  if(mod&&key==='v')return run(window.pasteCanvasItems);
  if(mod&&key==='d')return run(window.duplicateSelected);
  if(mod&&key==='a')return run(window.selectAllCanvasItems);
  if(mod&&key==='g'&&!e.shiftKey)return run(window.groupSelectedItems);
  if(mod&&key==='g'&&e.shiftKey)return run(window.ungroupSelectedItems);
  if(mod&&key==='0')return run(window.fitCanvasStage);
  if((e.key==='Delete'||e.key==='Backspace'))return run(window.deleteSelectedCanvasItem);
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
    const n=e.shiftKey?10:1;
    return run(()=>{const dx=e.key==='ArrowLeft'?-n:e.key==='ArrowRight'?n:0,dy=e.key==='ArrowUp'?-n:e.key==='ArrowDown'?n:0;if(typeof window.nudgeSelection==='function')return window.nudgeSelection(dx,dy);try{return nudgeSelection(dx,dy)}catch(_){}});
  }
  if(e.key==='?')return run(window.openShortcutHelp);
}
document.addEventListener('keydown',handleShortcut,true);

const setVer=()=>{const e=q('#headerEyebrow');if(e)e.textContent='VERSION 231'};
[0,250,900,1800].forEach(t=>setTimeout(setVer,t));
})();
