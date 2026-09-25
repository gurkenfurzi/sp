
(()=>{
'use strict';
if(window.__STUDIA_V224__)return;window.__STUDIA_V224__=true;
const q=(s,r=document)=>r?.querySelector?.(s)||null;
const qa=(s,r=document)=>r?.querySelectorAll?[...r.querySelectorAll(s)]:[];
let v224GraphCurve=-1;

/* ------------------------------------------------------------------
   1) Exponenten im ECHTEN Formeleditor als strukturiertes Objekt bauen.
      Damit weiß der Graph später sicher: Basis ^ Exponent.
------------------------------------------------------------------- */
try{
  const prevInsert=window.insertVisualFormula;
  window.insertVisualFormula=function(type){
    if(type==='power'){
      const ed=q('#formulaVisualEditor');if(!ed)return;
      ed.focus();
      const selected=(typeof selectedFormulaHTML==='function'?selectedFormulaHTML():'')||'';
      if(typeof replaceSelectionWithHTML==='function'){
        const base=selected||'x';
        replaceSelectionWithHTML(`<span class="vfPower"><span class="vfPowerBase">${base}</span><sup class="vfEditable vfExponentSlot" contenteditable="true">n</sup></span>&nbsp;`,'sup.vfExponentSlot');
        try{installFormulaSlotProtection?.(ed)}catch(_){}
        return;
      }
    }
    return prevInsert?.apply(this,arguments);
  };
  try{insertVisualFormula=window.insertVisualFormula}catch(_){}
}catch(_){}

/* ------------------------------------------------------------------
   2) DOM -> Graph-Ausdruck. KEIN textContent-Raten mehr.
      Bruch, Wurzel, Exponent und Klammer werden rekursiv gelesen.
------------------------------------------------------------------- */
function v224Text(raw){
  let s=String(raw||'').replace(/\u200b/g,'').replace(/\u00a0/g,' ')
    .replace(/[×⋅]/g,'*').replace(/÷/g,'/').replace(/−/g,'-').replace(/π/g,'pi');
  const supMap={'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','⁻':'-','⁺':'+'};
  s=s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]+/g,m=>'^('+[...m].map(c=>supMap[c]||c).join('')+')');
  return s;
}
function v224Children(el){return el?[...el.childNodes].map(v224Node).join(''):''}
function v224Need(value,label){
  const v=String(value||'').replace(/\s+/g,'');
  if(!v)throw new Error(label+' ist leer');
  return value;
}
function v224Node(node){
  if(!node)return '';
  if(node.nodeType===Node.TEXT_NODE)return v224Text(node.nodeValue);
  if(node.nodeType!==Node.ELEMENT_NODE)return '';
  if(node.tagName==='BR')return '';
  if(node.classList?.contains('vfParenMark'))return '';

  if(node.matches('.vfFrac,.fracExpr')){
    const parts=[...node.children];
    const a=v224Need(v224Children(parts[0]),'Zähler');
    const b=v224Need(v224Children(parts[1]),'Nenner');
    return `((${a})/(${b}))`;
  }
  if(node.matches('.vfRoot,.sqrtExpr')){
    const inside=node.querySelector(':scope > span');
    return `sqrt(${v224Need(v224Children(inside),'Wurzel')})`;
  }
  if(node.matches('.vfPower')){
    const base=node.querySelector(':scope > .vfPowerBase');
    const sup=node.querySelector(':scope > sup');
    const b=v224Need(v224Children(base),'Basis');
    const e=v224Need(v224Children(sup),'Exponent');
    return `(${b})^(${e})`;
  }
  if(node.matches('.vfExp')){
    const sup=node.querySelector(':scope > sup');
    return `e^(${v224Need(v224Children(sup),'Exponent')})`;
  }
  if(node.tagName==='SUP'){
    const e=v224Need(v224Children(node),'Exponent');
    return `^(${e})`;
  }
  if(node.tagName==='SUB'){
    const sub=v224Children(node).replace(/\s+/g,'');
    if(sub)throw new Error('Index kann im Funktionsgraphen nicht berechnet werden');
    return '';
  }
  if(node.matches('.vfParen')){
    const body=node.querySelector(':scope > .vfParenBody')||node.querySelector(':scope > .vfEditable');
    if(body)return `(${v224Need(v224Children(body),'Klammer')})`;
    /* alte Klammer-Struktur: die sichtbaren ( ) sind bereits Textknoten */
    return v224Children(node);
  }
  if(node.matches('.vfAbs')){
    const inside=node.querySelector(':scope > span');
    return `abs(${v224Need(v224Children(inside),'Betrag')})`;
  }
  if(node.matches('.vfFunction')){
    const lead=String(node.childNodes[0]?.nodeValue||'');
    const fn=(lead.match(/(?:sin|cos|tan)/i)||[])[0]?.toLowerCase();
    const inside=node.querySelector(':scope > span');
    if(!fn)throw new Error('Funktion nicht erkannt');
    return `${fn}(${v224Need(v224Children(inside),fn)})`;
  }
  return v224Children(node);
}
function v224FormulaToGraphExpr(ed){
  if(!ed)throw new Error('Formeleditor nicht gefunden');
  let expr=v224Children(ed).replace(/\s+/g,'');
  expr=expr.replace(/^f\(x\)=/i,'').replace(/^y=/i,'');
  expr=expr.replace(/(\d),(\d)/g,'$1.$2');
  expr=expr.replace(/[×⋅]/g,'*').replace(/÷/g,'/').replace(/−/g,'-');
  if(!expr)throw new Error('Funktion ist leer');
  if(/\^\(\)/.test(expr))throw new Error('Exponent ist leer');
  if(/\/\(\)/.test(expr))throw new Error('Nenner ist leer');
  return expr;
}
window.v224FormulaToGraphExpr=v224FormulaToGraphExpr;

/* ------------------------------------------------------------------
   3) Funktionsgraph benutzt EXAKT openFormulaDialog().
      Keine zweite graphFunctionVisual-Oberfläche mehr.
------------------------------------------------------------------- */
function v224ReturnToGraph(){
  v224GraphCurve=-1;
  if(typeof window.v222ReturnToGraphDialog==='function')window.v222ReturnToGraphDialog();
  else try{window.openGraphDialog?.()}catch(_){}
}
function v224SetupGraphFormulaEditor(i){
  const ed=q('#formulaVisualEditor');if(!ed)return;
  const curve=window.graphDraft?.curves?.[i] || (typeof graphDraft!=='undefined'?graphDraft?.curves?.[i]:null);
  if(!curve)return;

  /* Visuelles HTML bleibt erhalten. Nur alte Graphen müssen einmal aus expr aufgebaut werden. */
  const visual=curve.formulaHTML || (typeof window.graphExprToVisual==='function'?window.graphExprToVisual(curve.expr||''):(curve.expr||''));
  ed.innerHTML=String(visual||'').replace(/×/g,'⋅');
  try{normalizeAllVisualRoots?.(ed)}catch(_){}
  try{installFormulaSlotProtection?.(ed)}catch(_){}
  try{formulaLocalHistory=[ed.innerHTML];formulaLocalIndex=0}catch(_){}

  const modal=ed.closest('.visualFormulaModal,.formulaModal');if(!modal)return;
  const eyebrow=q('.presetModalHead .eyebrow',modal);if(eyebrow)eyebrow.textContent='FUNKTIONSGRAPH';
  const title=q('.presetModalHead h2',modal);if(title)title.textContent=`Funktion ${i+1} bearbeiten`;
  const hint=q('.formulaEasyHint',modal);if(hint)hint.innerHTML='<b>Genau derselbe Formeleditor:</b> Exponent, Bruch, Wurzel und Klammern werden beim Übernehmen direkt als mathematische Struktur in den Funktionsgraphen übernommen.';

  const close=q('.presetModalHead .miniIcon',modal);
  if(close){close.removeAttribute('onclick');close.onclick=()=>v224ReturnToGraph()}
  const primary=qa('button.primary',modal).at(-1);
  if(primary){primary.textContent='Übernehmen';primary.removeAttribute('onclick');primary.onclick=()=>window.v224SaveGraphFormula(i)}

  ed.focus();try{placeCaretAtEnd?.(ed)}catch(_){}
  ed.dispatchEvent(new Event('input',{bubbles:true}));
}
window.openGraphFunctionEditor=function(i){
  v224GraphCurve=Number(i);
  try{graphActiveCurve=Number(i)}catch(_){}
  /* Pseudo-ID trennt den lokalen Graph-Entwurf von normalen Formel-Entwürfen. */
  window.openFormulaDialog(`__graph_curve_${i}`);
  [120,180].forEach(t=>setTimeout(()=>v224SetupGraphFormulaEditor(Number(i)),t));
};
try{openGraphFunctionEditor=window.openGraphFunctionEditor}catch(_){}

window.v224SaveGraphFormula=function(i){
  const ed=q('#formulaVisualEditor');if(!ed)return;
  let expr='';
  try{
    expr=v224FormulaToGraphExpr(ed);
    /* Der bestehende Graph-Compiler prüft die fertige Schreibweise. */
    if(typeof window.normalizeGraphExpr==='function')window.normalizeGraphExpr(expr);
  }catch(err){
    let msg=String(err?.message||'Ungültige Funktion');
    if(/Unexpected token|Unexpected end|missing/i.test(msg))msg='Exponent, Bruch oder Klammer ist noch nicht vollständig';
    try{cuteToast('Formel prüfen: '+msg)}catch(_){}
    return;
  }
  const draft=(typeof graphDraft!=='undefined'?graphDraft:window.graphDraft);
  const curve=draft?.curves?.[i];if(!curve)return;
  curve.expr=expr;
  curve.formulaHTML=ed.innerHTML;
  try{cuteToast('Funktion übernommen ♡')}catch(_){}
  v224ReturnToGraph();
};
/* Alte Save-Namen zeigen ebenfalls auf den neuen, einzigen Weg. */
window.saveGraphFunctionEditor=function(i){return window.v224SaveGraphFormula(i)};
try{saveGraphFunctionEditor=window.saveGraphFunctionEditor}catch(_){}

/* Graph-Zeilen sollen immer den neuen gemeinsamen Editor öffnen. */
try{
  const prevRows=window.renderGraphCurveRows;
  window.renderGraphCurveRows=function(){
    const out=prevRows?.apply(this,arguments);
    qa('#graphCurveRows .graphExprButton').forEach((b,i)=>{
      b.removeAttribute('onclick');
      b.onclick=e=>{e.stopPropagation();try{graphActiveCurve=i}catch(_){};window.openGraphFunctionEditor(i)};
    });
    return out;
  };
  try{renderGraphCurveRows=window.renderGraphCurveRows}catch(_){}
}catch(_){}

const setVer=()=>{const e=q('#headerEyebrow');if(e)e.textContent='VERSION 224'};
[0,250,900,1800].forEach(t=>setTimeout(setVer,t));
})();
