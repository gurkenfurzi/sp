
(()=>{
'use strict';
if(window.__STUDIA_V225_SAFE__) return; window.__STUDIA_V225_SAFE__ = true;
const q=(s,r=document)=>r?.querySelector?.(s)||null;
const qa=(s,r=document)=>r?.querySelectorAll?[...r.querySelectorAll(s)]:[];
const esc=s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

function v225TakeTrailingTokenFromTextNode(node, offset){
  if(!node || node.nodeType!==Node.TEXT_NODE) return '';
  const text=String(node.nodeValue||'');
  const cut=typeof offset==='number' ? offset : text.length;
  const before=text.slice(0,cut), after=text.slice(cut);
  const m=before.match(/([A-Za-z]+|\d+(?:[.,]\d+)?|π)\s*$/);
  if(!m) return '';
  const token=m[1];
  const start=before.lastIndexOf(token);
  node.nodeValue = before.slice(0,start) + after;
  return esc(token);
}
function v225TakePrevAtom(ed){
  const sel=window.getSelection?.();
  if(!ed || !sel || !sel.rangeCount) return '';
  const r=sel.getRangeAt(0);
  if(!ed.contains(r.commonAncestorContainer) || !r.collapsed) return '';
  let sc=r.startContainer, so=r.startOffset;
  if(sc.nodeType===Node.TEXT_NODE){
    const token=v225TakeTrailingTokenFromTextNode(sc, so);
    if(token) return token;
    const prev=sc.previousSibling;
    if(prev?.nodeType===Node.ELEMENT_NODE && prev.tagName!=='BR'){
      prev.remove();
      return prev.outerHTML;
    }
  }
  if(sc.nodeType===Node.ELEMENT_NODE){
    const prev=sc.childNodes[Math.max(0,so-1)];
    if(prev){
      if(prev.nodeType===Node.TEXT_NODE){
        const token=v225TakeTrailingTokenFromTextNode(prev);
        if(token) return token;
      }
      if(prev.nodeType===Node.ELEMENT_NODE && prev.tagName!=='BR'){
        prev.remove();
        return prev.outerHTML;
      }
    }
  }
  return '';
}

/* Exponent: bei leerer Auswahl die vorherige Zahl / Variable als Basis nehmen, kein automatisches x. */
try{
  const prevInsert=window.insertVisualFormula;
  window.insertVisualFormula=function(type){
    if(type==='power'){
      const ed=q('#formulaVisualEditor');
      if(ed && typeof replaceSelectionWithHTML==='function'){
        ed.focus();
        let base=(typeof selectedFormulaHTML==='function' ? selectedFormulaHTML() : '') || '';
        if(!String(base).trim()) base=v225TakePrevAtom(ed) || '';
        if(!String(base).trim()) base='x';
        replaceSelectionWithHTML(`<span class="vfPower"><span class="vfPowerBase">${base}</span><sup class="vfEditable vfExponentSlot" contenteditable="true">n</sup></span>&nbsp;`, 'sup.vfExponentSlot');
        try{ installFormulaSlotProtection?.(ed); }catch(_){ }
        try{ ed.dispatchEvent(new Event('input',{bubbles:true})); }catch(_){ }
        return;
      }
    }
    return prevInsert?.apply(this, arguments);
  };
  try{ insertVisualFormula = window.insertVisualFormula; }catch(_){ }
}catch(_){ }

function v225PickGraphVisual(curve){
  const exprVisual = (typeof window.graphExprToVisual==='function') ? window.graphExprToVisual(curve?.expr||'') : (curve?.expr||'');
  const candidate = String(curve?.formulaHTML||'').trim();
  if(!candidate) return exprVisual;
  try{
    const tmp=document.createElement('div');
    tmp.innerHTML=candidate;
    const expr=window.v224FormulaToGraphExpr ? window.v224FormulaToGraphExpr(tmp) : '';
    if(!expr) throw new Error('leer');
    if(typeof window.normalizeGraphExpr==='function') window.normalizeGraphExpr(expr);
    return candidate;
  }catch(_){
    return exprVisual;
  }
}

window.v224SetupGraphFormulaEditor=function(i){
  const ed=q('#formulaVisualEditor'); if(!ed) return;
  const draft=(typeof graphDraft!=='undefined' ? graphDraft : window.graphDraft);
  const curve=draft?.curves?.[i]; if(!curve) return;
  const visual=v225PickGraphVisual(curve);
  curve.formulaHTML=visual;
  ed.innerHTML=String(visual||'').replace(/×/g,'⋅');
  try{ normalizeAllVisualRoots?.(ed); }catch(_){ }
  try{ installFormulaSlotProtection?.(ed); }catch(_){ }
  try{ formulaLocalHistory=[ed.innerHTML]; formulaLocalIndex=0; }catch(_){ }

  const modal=ed.closest('.visualFormulaModal,.formulaModal'); if(!modal) return;
  const eyebrow=q('.presetModalHead .eyebrow',modal); if(eyebrow) eyebrow.textContent='FUNKTIONSGRAPH';
  const title=q('.presetModalHead h2',modal); if(title) title.textContent=`Funktion ${Number(i)+1} bearbeiten`;
  const hint=q('.formulaEasyHint',modal); if(hint) hint.innerHTML='<b>Exakt derselbe Formeleditor:</b> Exponenten werden direkt an die vorherige Zahl/Variable gebunden und sauber in den Funktionsgraphen übernommen.';
  const close=q('.presetModalHead .miniIcon',modal); if(close){ close.removeAttribute('onclick'); close.onclick=()=>window.v224ReturnToGraph?.(); }
  const primary=qa('button.primary',modal).at(-1); if(primary){ primary.textContent='Übernehmen'; primary.removeAttribute('onclick'); primary.onclick=()=>window.v224SaveGraphFormula(Number(i)); }
  ed.focus(); try{ placeCaretAtEnd?.(ed); }catch(_){ }
  ed.dispatchEvent(new Event('input',{bubbles:true}));
};
try{ v224SetupGraphFormulaEditor = window.v224SetupGraphFormulaEditor; }catch(_){ }

window.openGraphFunctionEditor=function(i){
  i=Number(i);
  try{ window.graphActiveCurve=i; }catch(_){ }
  if(typeof window.openFormulaDialog==='function'){
    window.openFormulaDialog(`__graph_curve_${i}`);
    [80,140,220].forEach(t=>setTimeout(()=>{ try{ window.v224SetupGraphFormulaEditor(i); }catch(_){ } }, t));
  }
};
try{ openGraphFunctionEditor = window.openGraphFunctionEditor; }catch(_){ }

/* Auch die Graph-Zeilen sicher an den gemeinsamen Editor binden. */
try{
  const prevRows=window.renderGraphCurveRows;
  window.renderGraphCurveRows=function(){
    const out=prevRows?.apply(this, arguments);
    qa('#graphCurveRows .graphExprButton').forEach((b,i)=>{
      b.removeAttribute('onclick');
      b.onclick=e=>{ e?.stopPropagation?.(); try{ graphActiveCurve=i; }catch(_){ } window.openGraphFunctionEditor(i); };
    });
    return out;
  };
  try{ renderGraphCurveRows = window.renderGraphCurveRows; }catch(_){ }
}catch(_){ }

const setVer=()=>{ const e=q('#headerEyebrow'); if(e) e.textContent='VERSION 225'; };
[0,250,900,1800].forEach(t=>setTimeout(setVer,t));
})();
