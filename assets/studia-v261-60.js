
(()=>{
'use strict';
if(window.__STUDIA_V229__)return;window.__STUDIA_V229__=true;
const q=(s,r=document)=>r?.querySelector?.(s)||null;
const qa=(s,r=document)=>r?.querySelectorAll?[...r.querySelectorAll(s)]:[];
const clone=o=>JSON.parse(JSON.stringify(o));
let activeGraphCurve=-1;

function normText(s){
  const supMap={'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','⁻':'-','⁺':'+'};
  return String(s??'').replace(/\u200b/g,'').replace(/\u00a0/g,' ')
    .replace(/[×⋅]/g,'*').replace(/÷/g,'/').replace(/−/g,'-').replace(/π/g,'pi')
    .replace(/(\d),(\d)/g,'$1.$2')
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]+/g,m=>'^('+[...m].map(c=>supMap[c]||c).join('')+')');
}
function visible(el){
  if(!el)return '';
  let s=String(el.textContent||'').replace(/\u200b/g,'').trim();
  if(!s)s=String(el.dataset?.mathValue||'').replace(/\u200b/g,'').trim();
  return normText(s);
}
function children(el){return el?[...el.childNodes].map(node).join(''):''}
function required(v,label){v=String(v||'').replace(/\s+/g,'');if(!v)throw new Error(label+' ist leer');return v}
function node(n){
  if(!n)return '';
  if(n.nodeType===Node.TEXT_NODE)return normText(n.nodeValue);
  if(n.nodeType!==Node.ELEMENT_NODE)return '';
  if(n.tagName==='BR'||n.classList?.contains('vfParenMark'))return '';
  if(n.matches('.vfPeriodDigit'))return normText(n.textContent||'');
  if(n.matches('.vfPower')){
    const b=n.querySelector(':scope > .vfPowerBase');
    const s=n.querySelector(':scope > sup');
    let base=children(b).replace(/\s+/g,'') || visible(b);
    let exp=children(s).replace(/\s+/g,'') || visible(s);
    /* Wenn der Browser einen Slot intern merkwürdig verschachtelt, textContent des sup ist maßgeblich. */
    if(!exp&&s)exp=normText(s.innerText||s.textContent||s.dataset?.mathValue||'').replace(/\s+/g,'');
    /* Letzte Rettung: direkt aus dem HTML des sup. */
    if(!exp&&s){
      const tmp=document.createElement('div');tmp.innerHTML=s.innerHTML||'';
      exp=normText(tmp.textContent||'').replace(/\s+/g,'');
    }
    return `(${required(base,'Basis')})^(${required(exp,'Exponent')})`;
  }
  if(n.matches('.vfFrac,.fracExpr')){
    const ps=[...n.children].filter(x=>!x.classList.contains('vfParenMark'));
    return `((${required(children(ps[0])||visible(ps[0]),'Zähler')})/(${required(children(ps[1])||visible(ps[1]),'Nenner')}))`;
  }
  if(n.matches('.vfRoot,.sqrtExpr')){
    const a=n.querySelector(':scope > span');return `sqrt(${required(children(a)||visible(a),'Wurzel')})`;
  }
  if(n.matches('.vfFunction')){
    const lead=String(n.childNodes[0]?.nodeValue||'');const fn=(lead.match(/(?:sin|cos|tan)/i)||[])[0]?.toLowerCase();
    const a=n.querySelector(':scope > span');if(!fn)throw new Error('Funktion nicht erkannt');return `${fn}(${required(children(a)||visible(a),fn)})`;
  }
  if(n.matches('.vfAbs')){const a=n.querySelector(':scope > span');return `abs(${required(children(a)||visible(a),'Betrag')})`}
  if(n.matches('.vfExp')){const s=n.querySelector(':scope > sup');return `e^(${required(children(s)||visible(s),'Exponent')})`}
  if(n.tagName==='SUP')return `^(${required(children(n)||visible(n),'Exponent')})`;
  if(n.tagName==='SUB')return '';
  if(n.matches('.vfParen')){
    const a=n.querySelector(':scope > .vfParenBody')||n.querySelector(':scope > .vfEditable');
    return a?`(${required(children(a)||visible(a),'Klammer')})`:children(n);
  }
  return children(n);
}
function serialize(ed){
  let expr=children(ed).replace(/\s+/g,'');
  expr=expr.replace(/^f\(x\)=/i,'').replace(/^y=/i,'');
  if(!expr)throw new Error('Funktion ist leer');
  return expr;
}
function compileCheck(expr){
  const code=typeof window.normalizeGraphExpr==='function'?window.normalizeGraphExpr(expr):expr.replace(/\^/g,'**');
  /* echte JS-Syntaxprüfung – normalizeGraphExpr alleine prüft nur erlaubte Zeichen. */
  new Function('x',`"use strict"; return (${code});`);
  return expr;
}
function restoreGraph(saved){
  try{graphDraft=clone(saved)}catch(_){ }
  try{window.graphDraft=graphDraft}catch(_){ }
  try{renderGraphCurveRows()}catch(_){ }
  try{openGraphDialogRefreshFields()}catch(_){ }
  try{renderGraphPreview()}catch(_){ }
}
function returnToGraph(saved){
  /* v222 kennt den aktuellen Graph-Dialog/Edit-ID und öffnet ihn wieder. */
  try{window.v222ReturnToGraphDialog?.()}catch(_){ }
  [0,30,90,180].forEach(t=>setTimeout(()=>restoreGraph(saved),t));
}
function saveGraphFormula(i){
  i=Number(i);const ed=q('#formulaVisualEditor');if(!ed)return;
  let expr='';
  try{expr=compileCheck(serialize(ed))}
  catch(err){
    let msg=String(err?.message||'Ungültige Funktion');
    if(/Unexpected token|Unexpected end|missing|expected/i.test(msg))msg='Die Formel ist noch nicht vollständig';
    try{cuteToast('Formel prüfen: '+msg)}catch(_){ }
    return;
  }
  let draft=null;
  try{draft=graphDraft}catch(_){draft=window.graphDraft}
  if(!draft?.curves?.[i]){try{cuteToast('Graph-Funktion nicht gefunden')}catch(_){};return}
  draft.curves[i].expr=expr;
  draft.curves[i].formulaHTML=ed.innerHTML;
  const saved=clone(draft);
  try{cuteToast('Funktion übernommen ♡')}catch(_){ }
  returnToGraph(saved);
}
window.v229SaveGraphFormula=saveGraphFormula;
window.v224SaveGraphFormula=saveGraphFormula;
window.saveGraphFunctionEditor=saveGraphFormula;
try{v224SaveGraphFormula=saveGraphFormula}catch(_){ }
try{saveGraphFunctionEditor=saveGraphFormula}catch(_){ }

function setup(i){
  i=Number(i);activeGraphCurve=i;
  const ed=q('#formulaVisualEditor');if(!ed)return;
  try{window.v228EnhanceSlots?.(ed)}catch(_){ }
  const modal=ed.closest('.visualFormulaModal,.formulaModal');if(!modal)return;
  const eyebrow=q('.presetModalHead .eyebrow',modal);if(eyebrow)eyebrow.textContent='FUNKTIONSGRAPH';
  const title=q('.presetModalHead h2',modal);if(title)title.textContent=`Funktion ${i+1} bearbeiten`;
  /* Frischer Button = keine alten onClick/addEventListener Handler mehr. */
  const old=qa('button.primary',modal).at(-1);
  if(old && old.dataset.v229Fresh!=='1'){
    const fresh=old.cloneNode(true);fresh.dataset.v229Fresh='1';fresh.textContent='Übernehmen';fresh.removeAttribute('onclick');
    old.replaceWith(fresh);
    fresh.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();saveGraphFormula(i)},true);
  }
  const close=q('.presetModalHead .miniIcon',modal);
  if(close && close.dataset.v229Fresh!=='1'){
    const fresh=close.cloneNode(true);fresh.dataset.v229Fresh='1';fresh.removeAttribute('onclick');close.replaceWith(fresh);
    fresh.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();let d;try{d=clone(graphDraft)}catch(_){d=null}if(d)returnToGraph(d)},true);
  }
}
window.openGraphFunctionEditor=function(i){
  i=Number(i);activeGraphCurve=i;try{graphActiveCurve=i}catch(_){ }
  let draft;try{draft=graphDraft}catch(_){draft=window.graphDraft}
  const curve=draft?.curves?.[i];
  window.openFormulaDialog?.(`__graph_curve_${i}`);
  const hydrate=()=>{
    const ed=q('#formulaVisualEditor');if(!ed||!curve)return;
    const current=(curve.formulaHTML&&String(curve.formulaHTML).trim())?curve.formulaHTML:(typeof window.graphExprToVisual==='function'?window.graphExprToVisual(curve.expr||''):(curve.expr||''));
    ed.innerHTML=String(current||'').replace(/×/g,'⋅');
    try{normalizeAllVisualRoots?.(ed)}catch(_){ }
    try{installFormulaSlotProtection?.(ed)}catch(_){ }
    try{window.v228EnhanceSlots?.(ed)}catch(_){ }
    setup(i);
  };
  [30,80,150,250].forEach(t=>setTimeout(hydrate,t));
};
try{openGraphFunctionEditor=window.openGraphFunctionEditor}catch(_){ }

/* Falls die Graph-Zeilen durch ältere Wrapper neu gerendert werden: Klick danach immer auf V229 routen. */
function bindRows(){
  qa('#graphCurveRows .graphExprButton').forEach((b,i)=>{
    if(b.dataset.v229Bound==='1')return;b.dataset.v229Bound='1';
    b.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();window.openGraphFunctionEditor(i)},true);
  });
}
new MutationObserver(bindRows).observe(document.body,{childList:true,subtree:true});
[0,100,400,1000].forEach(t=>setTimeout(bindRows,t));

const setVer=()=>{const e=q('#headerEyebrow');if(e)e.textContent='VERSION 229'};[0,250,900,1800].forEach(t=>setTimeout(setVer,t));
})();
