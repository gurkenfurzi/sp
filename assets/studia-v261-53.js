
(()=>{
'use strict';
if(window.__STUDIA_V221__)return;window.__STUDIA_V221__=true;
const q=(s,r=document)=>r?.querySelector?.(s)||null,qa=(s,r=document)=>r?.querySelectorAll?[...r.querySelectorAll(s)]:[];
const esc221=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

/* ---------- 1. Formeleditor: Minus und robuste leere Slots ---------- */
function mathEditorFrom(node){return node?.closest?.('#formulaVisualEditor,#graphFunctionVisual')||null}
function selectionSlot(ed){
  const sel=getSelection();if(!ed||!sel||!sel.rangeCount)return null;
  const n=sel.anchorNode;let el=n?.nodeType===1?n:n?.parentElement;
  const slot=el?.closest?.('sup[contenteditable="true"],sub[contenteditable="true"],.vfEditable[contenteditable="true"]');
  return slot&&ed.contains(slot)?slot:null;
}
function setCaretIn(el,atEnd=true){
  if(!el)return;el.focus?.();const r=document.createRange(),s=getSelection();r.selectNodeContents(el);r.collapse(!atEnd?true:false);s.removeAllRanges();s.addRange(r);
}
function slotText(slot){return (slot?.textContent||'').replace(/\u200b/g,'')}
function markEmptySlots(ed){
  if(!ed)return;qa('sup[contenteditable="true"],sub[contenteditable="true"],.vfEditable[contenteditable="true"]',ed).forEach(x=>x.classList.toggle('v221EmptySlot',slotText(x)===''));
}
function bindMathEditor(ed){
  if(!ed||ed.dataset.v221MathBound==='1')return;ed.dataset.v221MathBound='1';
  /* Old slot protector is skipped for this newly created editor. */
  ed.dataset.slotProtection='1';
  markEmptySlots(ed);
  ed.addEventListener('beforeinput',e=>{
    if(e.inputType==='insertText'&&e.data==='-'){
      e.preventDefault();const sel=getSelection();if(!sel||!sel.rangeCount)return;const r=sel.getRangeAt(0);if(!ed.contains(r.commonAncestorContainer))return;r.deleteContents();const n=document.createTextNode('−');r.insertNode(n);r.setStartAfter(n);r.collapse(true);sel.removeAllRanges();sel.addRange(r);ed.dispatchEvent(new Event('input',{bubbles:true}));return;
    }
  },true);
  ed.addEventListener('keydown',e=>{
    if(e.key!=='Backspace'&&e.key!=='Delete')return;
    const slot=selectionSlot(ed);if(!slot)return;
    const sel=getSelection();if(!sel||!sel.rangeCount)return;const r=sel.getRangeAt(0),txt=slotText(slot);
    /* Deleting the final character empties the slot, but never deletes the slot itself. */
    if(r.collapsed&&txt.length<=1){
      e.preventDefault();e.stopImmediatePropagation();slot.textContent='';slot.classList.add('v221EmptySlot');setCaretIn(slot,true);ed.dispatchEvent(new Event('input',{bubbles:true}));return;
    }
    if(!r.collapsed&&slot.contains(r.commonAncestorContainer)){
      const all=document.createRange();all.selectNodeContents(slot);
      const coversStart=r.compareBoundaryPoints(Range.START_TO_START,all)<=0;
      const coversEnd=r.compareBoundaryPoints(Range.END_TO_END,all)>=0;
      if(coversStart&&coversEnd){e.preventDefault();e.stopImmediatePropagation();slot.textContent='';slot.classList.add('v221EmptySlot');setCaretIn(slot,true);ed.dispatchEvent(new Event('input',{bubbles:true}))}
    }
  },true);
  ed.addEventListener('input',()=>{
    /* Same-length replacement keeps the current caret offsets stable. */
    const w=document.createTreeWalker(ed,NodeFilter.SHOW_TEXT);let n;
    while((n=w.nextNode()))if((n.nodeValue||'').includes('-'))n.nodeValue=n.nodeValue.replace(/-/g,'−');
    markEmptySlots(ed);
  });
  ed.addEventListener('focusin',()=>markEmptySlots(ed));
}
/* Prevent the historical protector from being installed on future formula editors. */
try{
  window.installFormulaSlotProtection=function(ed){bindMathEditor(ed)};
  installFormulaSlotProtection=window.installFormulaSlotProtection;
}catch(_){}

function bindOpenMathEditors(){bindMathEditor(q('#formulaVisualEditor'));bindMathEditor(q('#graphFunctionVisual'))}
const mathObs=new MutationObserver(bindOpenMathEditors);mathObs.observe(document.body,{childList:true,subtree:true});
[0,80,200].forEach(t=>setTimeout(bindOpenMathEditors,t));

/* ---------- 2. Lernblatt-Text: stabiler Zeilenumbruch ---------- */
function stableLineBreak(root){
  root.focus();
  try{if(document.execCommand('insertLineBreak',false,null))return true}catch(_){}
  const sel=getSelection();if(!sel||!sel.rangeCount)return false;const r=sel.getRangeAt(0);if(!root.contains(r.commonAncestorContainer))return false;
  r.deleteContents();const br=document.createElement('br');r.insertNode(br);r.setStartAfter(br);r.collapse(true);sel.removeAllRanges();sel.addRange(r);return true;
}
document.addEventListener('beforeinput',e=>{
  if(e.inputType!=='insertParagraph'&&e.inputType!=='insertLineBreak')return;
  const root=e.target instanceof Element?e.target.closest('#view-sheet-editor .cobj[contenteditable="true"]'):null;
  if(!root||root.classList.contains('tableObj')||root.classList.contains('formulaObj'))return;
  const sel=getSelection(),node=sel?.anchorNode,el=node?.nodeType===1?node:node?.parentElement;
  /* Real HTML lists keep their native Enter behavior. */
  if(el?.closest?.('li'))return;
  e.preventDefault();if(stableLineBreak(root))root.dispatchEvent(new Event('input',{bubbles:true}));
},true);

/* ---------- 3. Gleichmäßige Abstände / eigener Abstand ---------- */
function vectorBox221(v){
  try{return vectorBounds(v)}catch(_){
    if(v.type==='rect')return{x:+v.x||0,y:+v.y||0,w:+v.w||1,h:+v.h||1};
    if(v.type==='ellipse')return{x:(+v.cx||0)-(+v.rx||0),y:(+v.cy||0)-(+v.ry||0),w:(+v.rx||1)*2,h:(+v.ry||1)*2};
    const pts=v.points||[];if(!pts.length)return{x:0,y:0,w:1,h:1};const xs=pts.map(p=>+p[0]||0),ys=pts.map(p=>+p[1]||0);return{x:Math.min(...xs),y:Math.min(...ys),w:Math.max(1,Math.max(...xs)-Math.min(...xs)),h:Math.max(1,Math.max(...ys)-Math.min(...ys))};
  }
}
function chosen221(){
  let oi=[...(canvasState?.selectedIds||[])],vi=[...(canvasState?.selectedVectorIds||[])];
  if(!oi.length&&!vi.length&&canvasState?.selectedId){(canvasState.selectedType==='object'?oi:vi).push(canvasState.selectedId)}
  return [
    ...((canvasState?.objects||[]).filter(o=>oi.includes(o.id)&&!o.locked).map(o=>({kind:'object',ref:o,box:()=>({x:o.x,y:o.y,w:o.w,h:o.h})}))),
    ...((canvasState?.vectors||[]).filter(v=>vi.includes(v.id)&&!v.locked).map(v=>({kind:'vector',ref:v,box:()=>vectorBox221(v)})))
  ];
}
function moveEntry(it,dx,dy){
  if(it.kind==='object'){it.ref.x+=dx;it.ref.y+=dy;return}
  const v=it.ref;if(v.type==='rect'){v.x+=dx;v.y+=dy}else if(v.type==='ellipse'){v.cx+=dx;v.cy+=dy}else if(Array.isArray(v.points))v.points=v.points.map(p=>[p[0]+dx,p[1]+dy]);
}
function finishDistribution(label){
  try{renderCanvasObjects();renderVectors();renderCanvasInspector();renderLayerList?.();markCanvasDirty();pushHistory();window.v132SyncHits?.();cuteToast(label+' ♡')}catch(_){ }
}
window.v221Distribute=function(axis,custom=false){
  const items=chosen221();if(items.length<2){try{cuteToast('Wähle mindestens 2 Elemente ♡')}catch(_){}return}
  const horizontal=axis==='x',sorted=items.slice().sort((a,b)=>{const A=a.box(),B=b.box();return(horizontal?A.x:A.y)-(horizontal?B.x:B.y)});
  if(custom){
    const gap=Math.max(-500,Math.min(1000,Number(q('#v221GapInput')?.value)||0));
    let cursor=horizontal?sorted[0].box().x+sorted[0].box().w:sorted[0].box().y+sorted[0].box().h;
    for(let i=1;i<sorted.length;i++){
      const b=sorted[i].box(),target=cursor+gap,delta=target-(horizontal?b.x:b.y);moveEntry(sorted[i],horizontal?delta:0,horizontal?0:delta);const nb=sorted[i].box();cursor=(horizontal?nb.x+nb.w:nb.y+nb.h);
    }
  }else{
    if(items.length<3){try{cuteToast('Für gleichmäßiges Verteilen mindestens 3 Elemente auswählen ♡')}catch(_){}return}
    const first=sorted[0].box(),last=sorted.at(-1).box();
    const start=horizontal?first.x:first.y,end=horizontal?last.x+last.w:last.y+last.h;
    const total=sorted.reduce((sum,it)=>sum+(horizontal?it.box().w:it.box().h),0),gap=(end-start-total)/(sorted.length-1);
    let cursor=start;
    sorted.forEach((it,i)=>{const b=it.box(),delta=cursor-(horizontal?b.x:b.y);if(i>0&&i<sorted.length-1)moveEntry(it,horizontal?delta:0,horizontal?0:delta);const nb=it.box();cursor=(horizontal?nb.x+nb.w:nb.y+nb.h)+gap});
  }
  finishDistribution(custom?'Abstand gesetzt':'Gleichmäßig verteilt');
};
function injectDistribution(){
  const host=q('#canvasInspector');if(!host)return;const count=(canvasState?.selectedIds?.length||0)+(canvasState?.selectedVectorIds?.length||0);if(count<2||q('.v221DistributePanel',host))return;
  const panel=document.createElement('div');panel.className='v221DistributePanel';panel.innerHTML=`<div class="v221DistributeHead"><b>Abstand verteilen</b><span>wie Illustrator</span></div><div class="v221DistributeButtons"><button onclick="v221Distribute('x',false)">↔ Horizontal gleichmäßig</button><button onclick="v221Distribute('y',false)">↕ Vertikal gleichmäßig</button></div><div class="v221GapRow"><label>Eigener Abstand (px)<input id="v221GapInput" type="number" value="20" step="1"></label><button onclick="v221Distribute('x',true)">↔ Anwenden</button><button onclick="v221Distribute('y',true)">↕ Anwenden</button></div>`;host.appendChild(panel);
}
try{
  const prevInspector=window.renderCanvasInspector||renderCanvasInspector;
  window.renderCanvasInspector=function(){const r=prevInspector.apply(this,arguments);requestAnimationFrame(injectDistribution);return r};renderCanvasInspector=window.renderCanvasInspector;
}catch(_){}
const inspObs=new MutationObserver(()=>requestAnimationFrame(injectDistribution));const insp=q('#canvasInspector');if(insp)inspObs.observe(insp,{childList:true,subtree:true});

/* ---------- 4. Derselbe visuelle Formeleditor für Graph-Funktionen ---------- */
function graphSelectedHTML(){
  const ed=q('#graphFunctionVisual'),sel=getSelection();if(!ed||!sel||!sel.rangeCount)return '';const r=sel.getRangeAt(0);if(!ed.contains(r.commonAncestorContainer)||r.collapsed)return '';const d=document.createElement('div');d.appendChild(r.cloneContents());return d.innerHTML;
}
function graphInsert221(html,focus=''){
  const ed=q('#graphFunctionVisual');if(!ed)return;ed.focus();const sel=getSelection();let r=sel?.rangeCount?sel.getRangeAt(0):null;if(!r||!ed.contains(r.commonAncestorContainer)){r=document.createRange();r.selectNodeContents(ed);r.collapse(false)}r.deleteContents();const t=document.createElement('div');t.innerHTML=html;const f=document.createDocumentFragment();let n,last;while((n=t.firstChild))last=f.appendChild(n);r.insertNode(f);let target=null;if(focus){const root=last?.nodeType===1?last:last?.parentElement;target=(root?.matches?.(focus)?root:root?.querySelector?.(focus))||ed.querySelector(focus)}const nr=document.createRange();if(target)nr.selectNodeContents(target);else if(last){nr.setStartAfter(last);nr.collapse(true)}else{nr.selectNodeContents(ed);nr.collapse(false)}sel.removeAllRanges();sel.addRange(nr);ed.dispatchEvent(new Event('input',{bubbles:true}));
}
window.v221GraphInsert=function(kind){
  const selected=graphSelectedHTML(),editable='<span class="vfEditable" contenteditable="true">x</span>';
  if(kind==='plus')graphInsert221('+');
  else if(kind==='minus')graphInsert221('−');
  else if(kind==='times')graphInsert221('⋅');
  else if(kind==='divide')graphInsert221('÷');
  else if(kind==='equals')graphInsert221('=');
  else if(kind==='x')graphInsert221('x');
  else if(kind==='fx')graphInsert221('f(x) = ');
  else if(kind==='sqrt')graphInsert221(`<span class="vfRoot">√<span class="vfEditable" contenteditable="true">${selected||'x'}</span></span>&nbsp;`,'.vfEditable');
  else if(kind==='frac')graphInsert221(selected?`<span class="vfFrac"><span>${selected}</span><span class="vfEditable" contenteditable="true">b</span></span>&nbsp;`:`<span class="vfFrac"><span class="vfEditable" contenteditable="true">a</span><span class="vfEditable" contenteditable="true">b</span></span>&nbsp;`,'.vfEditable');
  else if(kind==='power')graphInsert221(`${selected||'x'}<sup class="vfEditable vfExponentSlot" contenteditable="true">n</sup>&nbsp;`,'sup.vfEditable');
  else if(kind==='sub')graphInsert221(`${selected||''}<sub class="vfEditable" contenteditable="true">n</sub>&nbsp;`,'sub.vfEditable');
  else if(kind==='paren')graphInsert221(`<span class="vfParen">(<span class="vfEditable" contenteditable="true">${selected||'x'}</span>)</span>&nbsp;`,'.vfEditable');
  else if(kind==='abs')graphInsert221(`<span class="vfAbs">|<span class="vfEditable" contenteditable="true">${selected||'x'}</span>|</span>&nbsp;`,'.vfEditable');
  else if(kind==='sin'||kind==='cos'||kind==='tan')graphInsert221(`<span class="vfFunction">${kind}(<span class="vfEditable" contenteditable="true">${selected||'x'}</span>)</span>&nbsp;`,'.vfEditable');
  else if(kind==='exp')graphInsert221(`e<sup class="vfEditable" contenteditable="true">${selected||'x'}</sup>&nbsp;`,'sup.vfEditable');
  else if(kind==='pi')graphInsert221('π');
  else if(kind==='pm')graphInsert221('±');
  else if(kind==='infinity')graphInsert221('∞');
  bindMathEditor(q('#graphFunctionVisual'));
};
window.v221GraphExample=function(type){
  const ed=q('#graphFunctionVisual');if(!ed)return;
  if(type==='square')ed.innerHTML='x<sup class="vfEditable" contenteditable="true">2</sup>';
  else if(type==='decay')ed.innerHTML='0,5<sup class="vfEditable" contenteditable="true">x</sup>';
  else if(type==='sin')ed.innerHTML='<span class="vfFunction">sin(<span class="vfEditable" contenteditable="true">x</span>)</span>';
  bindMathEditor(ed);setCaretIn(ed,true);ed.dispatchEvent(new Event('input',{bubbles:true}));
};
window.openGraphFunctionEditor=function(i){
  graphActiveCurve=i;const current=graphDraft.curves[i]?.expr||'';
  openModal(`<div class="formulaModal visualFormulaModal v221GraphFormulaModal">
    <div class="presetModalHead"><div><span class="eyebrow">MATHEMATIK · GRAPH</span><h2>Funktion ${i+1} bearbeiten</h2></div><button class="miniIcon" onclick="closeModal()">×</button></div>
    <p class="formulaEasyHint"><b>Genau wie im Formel-Editor:</b> markieren bestimmt den Bereich. Exponent, Wurzel, Bruch, Klammer usw. werden direkt mathematisch bearbeitet.</p>
    <div class="formulaEditToolbar"><div class="formulaHistoryBtns"><button onclick="graphFormulaUndo()" title="Rückgängig">↶</button><button onclick="graphFormulaRedo()" title="Wiederholen">↷</button></div><span>Direkt mathematisch bearbeiten</span></div>
    <div class="v221GraphPrefix"><span>f(x) =</span></div>
    <div id="graphFunctionVisual" class="formulaVisualEditor graphFunctionVisual" contenteditable="true" spellcheck="false" data-placeholder="z. B. 0,5ˣ">${graphExprToVisual(current).replace(/×/g,'⋅')}</div>
    <div class="formulaInlineOps">
      <button onclick="v221GraphInsert('plus')">＋</button><button onclick="v221GraphInsert('minus')">−</button><button onclick="v221GraphInsert('times')">⋅</button><button onclick="v221GraphInsert('divide')">÷</button><button onclick="v221GraphInsert('equals')">＝</button><button onclick="v221GraphInsert('x')">x</button><button onclick="v221GraphInsert('fx')">f(x)=</button>
    </div>
    <div class="formulaToolSections">
      <section class="formulaToolSection"><div class="formulaToolTitle">Bausteine</div><div class="formulaTemplateGrid visualOnly compactFormulaGrid">
        <button onclick="v221GraphInsert('sqrt')"><b>√x</b><span>Wurzel</span></button><button onclick="v221GraphInsert('frac')"><b>½</b><span>Bruch</span></button><button onclick="v221GraphInsert('power')"><b>xⁿ</b><span>Exponent</span></button><button onclick="v221GraphInsert('sub')"><b>ₙ</b><span>Index</span></button><button onclick="v221GraphInsert('paren')"><b>(x)</b><span>Klammer</span></button><button onclick="v221GraphInsert('abs')"><b>|x|</b><span>Betrag</span></button>
      </div></section>
      <section class="formulaToolSection"><div class="formulaToolTitle">Funktionen & Symbole</div><div class="formulaTemplateGrid visualOnly compactFormulaGrid">
        <button onclick="v221GraphInsert('sin')"><b>sin</b><span>Sinus</span></button><button onclick="v221GraphInsert('cos')"><b>cos</b><span>Cosinus</span></button><button onclick="v221GraphInsert('tan')"><b>tan</b><span>Tangens</span></button><button onclick="v221GraphInsert('exp')"><b>eˣ</b><span>Exponential</span></button><button onclick="v221GraphInsert('pi')"><b>π</b><span>Pi</span></button><button onclick="v221GraphInsert('pm')"><b>±</b><span>Plus/Minus</span></button><button onclick="v221GraphInsert('infinity')"><b>∞</b><span>Unendlich</span></button>
      </div></section>
    </div>
    <div class="v221GraphExamples"><button onclick="v221GraphExample('square')">x²</button><button onclick="v221GraphExample('decay')">0,5ˣ</button><button onclick="v221GraphExample('sin')">sin(x)</button></div>
    <div class="graphFnFooter"><button class="ghost" onclick="closeModal()">Abbrechen</button><button class="primary" onclick="saveGraphFunctionEditor(${i})">Übernehmen</button></div>
  </div>`);
  const ed=q('#graphFunctionVisual');bindMathEditor(ed);if(ed){graphFormulaHistory=[ed.innerHTML];graphFormulaIndex=0;ed.addEventListener('input',()=>{try{normalizeGraphVisualMath(ed);normalizeAllVisualRoots(ed);pushLocalVisualHistory('graph',ed)}catch(_){}});ed.focus();setCaretIn(ed,true)}
};
try{openGraphFunctionEditor=window.openGraphFunctionEditor}catch(_){}

/* Graph-Speicherung: ⋅ und Dezimalkomma sicher in auswertbare Syntax überführen. */
try{
  const prevSaveGraphFn=window.saveGraphFunctionEditor||saveGraphFunctionEditor;
  window.saveGraphFunctionEditor=function(i){
    const ed=q('#graphFunctionVisual');if(ed){
      /* Existing converter understands ×; normalize visual ⋅ before conversion without changing what user sees. */
      qa('*',ed).forEach(()=>{});
    }
    const oldGraphVisual=window.graphVisualNodeExpr||null;
    const out=prevSaveGraphFn.apply(this,arguments);
    try{const c=graphDraft.curves[i];if(c)c.expr=String(c.expr||'').replace(/^f\(x\)=/i,'').replace(/⋅/g,'*').replace(/(\d),(\d)/g,'$1.$2')}catch(_){}
    try{renderGraphCurveRows();renderGraphPreview()}catch(_){}
    return out;
  };
  saveGraphFunctionEditor=window.saveGraphFunctionEditor;
}catch(_){}
/* The original visual-node parser maps × but not ⋅. Replace ⋅ in text nodes before it sees them. */
document.addEventListener('click',e=>{if(e.target?.closest?.('#graphFunctionVisual'))bindMathEditor(q('#graphFunctionVisual'))},true);

/* Version label. */
const setVer=()=>{const e=q('#headerEyebrow');if(e)e.textContent='VERSION 221'};[0,250,900,1800].forEach(t=>setTimeout(setVer,t));
})();
