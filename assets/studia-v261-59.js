
(()=>{
'use strict';
if(window.__STUDIA_V228__)return;window.__STUDIA_V228__=true;
const q=(s,r=document)=>r?.querySelector?.(s)||null;
const qa=(s,r=document)=>r?.querySelectorAll?[...r.querySelectorAll(s)]:[];

function v228Root(node){
  const el=node instanceof Element?node:(node?.parentElement||null);
  return el?.closest?.('#formulaVisualEditor')||null;
}
function v228SlotFromSelection(root){
  const s=getSelection();if(!root||!s||!s.rangeCount)return null;
  let n=s.anchorNode;let el=n?.nodeType===1?n:n?.parentElement;
  const slot=el?.closest?.('[data-v228-slot="1"]');
  return slot&&root.contains(slot)?slot:null;
}
function v228SetCaret(el,atEnd=true){
  if(!el)return;el.focus?.();const r=document.createRange(),s=getSelection();
  r.selectNodeContents(el);r.collapse(atEnd);s.removeAllRanges();s.addRange(r);
}
function v228Remember(slot){
  if(!slot)return;
  const val=(slot.textContent||'').replace(/\u200b/g,'');
  if(val)slot.dataset.mathValue=val;
  else if(!slot.dataset.mathValue)slot.dataset.mathValue='';
}
function v228EnhanceSlots(root){
  if(!root)return;
  const slots=new Set();
  qa('sup,sub,.vfEditable,.vfExponentSlot,.vfFrac>span,.vfRoot>span,.vfParenBody,.vfAbs>span,.vfFunction>span',root).forEach(el=>{
    if(!el.closest('#formulaVisualEditor'))return;
    if(el.classList?.contains('vfParenMark'))return;
    el.setAttribute('contenteditable','true');
    el.setAttribute('spellcheck','false');
    el.setAttribute('autocapitalize','off');
    el.removeAttribute('inputmode');
    el.dataset.v228Slot='1';
    if(!el.hasAttribute('tabindex'))el.tabIndex=0;
    v228Remember(el);slots.add(el);
  });
  return slots;
}
function v228InsertText(root,slot,text){
  if(!root||!slot)return;
  let value=String(text??'').replace(/\*/g,'⋅').replace(/-/g,'−');
  if(!value)return;
  const s=getSelection();let r=s?.rangeCount?s.getRangeAt(0):null;
  if(!r||!slot.contains(r.commonAncestorContainer)){
    r=document.createRange();r.selectNodeContents(slot);r.collapse(false);
  }
  r.deleteContents();
  const n=document.createTextNode(value);r.insertNode(n);r.setStartAfter(n);r.collapse(true);
  s.removeAllRanges();s.addRange(r);
  slot.classList.remove('v221EmptySlot');v228Remember(slot);
  root.dispatchEvent(new Event('input',{bubbles:true}));
}

/* Freie Eingabe: Buchstaben, Zahlen und normale Zeichen in JEDEM Mathe-Slot. */
document.addEventListener('beforeinput',e=>{
  const root=v228Root(e.target)||q('#formulaVisualEditor');if(!root||!root.isConnected)return;
  v228EnhanceSlots(root);
  const slot=v228SlotFromSelection(root);if(!slot)return;
  if(e.inputType==='insertText'&&e.data!=null){
    e.preventDefault();e.stopImmediatePropagation();v228InsertText(root,slot,e.data);return;
  }
  if(e.inputType==='insertParagraph'||e.inputType==='insertLineBreak'){
    /* Enter verlässt Hoch-/Tiefstellungen, erzeugt aber nie kaputte Blockelemente darin. */
    if(slot.matches('sup,sub')){
      e.preventDefault();e.stopImmediatePropagation();const s=getSelection(),r=document.createRange();
      r.setStartAfter(slot.closest('.vfPower,.vfExp')||slot);r.collapse(true);s.removeAllRanges();s.addRange(r);root.dispatchEvent(new Event('input',{bubbles:true}));
    }
  }
},true);
document.addEventListener('paste',e=>{
  const root=v228Root(e.target)||q('#formulaVisualEditor');if(!root||!root.isConnected)return;
  v228EnhanceSlots(root);const slot=v228SlotFromSelection(root);if(!slot)return;
  const txt=e.clipboardData?.getData('text/plain');if(txt==null)return;
  e.preventDefault();e.stopImmediatePropagation();v228InsertText(root,slot,txt.replace(/[\r\n]+/g,' '));
},true);
document.addEventListener('input',e=>{
  const root=v228Root(e.target);if(!root)return;v228EnhanceSlots(root);
  const slot=v228SlotFromSelection(root);if(slot)v228Remember(slot);
},true);
document.addEventListener('focusin',e=>{const root=v228Root(e.target);if(root)v228EnhanceSlots(root)},true);
new MutationObserver(()=>{const root=q('#formulaVisualEditor');if(root)v228EnhanceSlots(root)}).observe(document.body,{childList:true,subtree:true});
[0,50,150,400].forEach(t=>setTimeout(()=>v228EnhanceSlots(q('#formulaVisualEditor')),t));

function v228NormText(s){
  return String(s??'').replace(/\u200b/g,'').replace(/\u00a0/g,' ')
    .replace(/[×⋅]/g,'*').replace(/÷/g,'/').replace(/−/g,'-').replace(/π/g,'pi')
    .replace(/(\d),(\d)/g,'$1.$2');
}
function v228SlotValue(el){
  if(!el)return '';
  let v=(el.textContent||'').replace(/\u200b/g,'').trim();
  if(!v)v=String(el.dataset?.mathValue||'').trim();
  if(!v){
    const raw=String(el.innerHTML||'').replace(/<br\s*\/?\s*>/gi,'').replace(/<[^>]+>/g,'').replace(/&nbsp;|&#160;/gi,' ').replace(/&#8203;|&ZeroWidthSpace;/gi,'').trim();
    if(raw)v=raw;
  }
  return v228NormText(v);
}
function v228Need(v,label){const s=String(v||'').replace(/\s+/g,'');if(!s)throw new Error(label+' ist leer');return v}
function v228Children(el){return el?[...el.childNodes].map(v228Node).join(''):''}
function v228Node(node){
  if(!node)return '';
  if(node.nodeType===Node.TEXT_NODE)return v228NormText(node.nodeValue);
  if(node.nodeType!==Node.ELEMENT_NODE)return '';
  if(node.tagName==='BR'||node.classList?.contains('vfParenMark'))return '';
  if(node.matches('.vfPeriodDigit'))return v228NormText(node.textContent||'');
  if(node.matches('.vfFrac,.fracExpr')){
    const parts=[...node.children].filter(x=>!x.classList.contains('vfParenMark'));
    const a=v228Need(parts[0]?v228Children(parts[0]):'','Zähler');
    const b=v228Need(parts[1]?v228Children(parts[1]):'','Nenner');
    return `((${a})/(${b}))`;
  }
  if(node.matches('.vfRoot,.sqrtExpr')){
    const inside=node.querySelector(':scope > span');return `sqrt(${v228Need(inside?v228Children(inside):'','Wurzel')})`;
  }
  if(node.matches('.vfPower')){
    const baseEl=node.querySelector(':scope > .vfPowerBase');
    const sup=node.querySelector(':scope > sup');
    let base=baseEl?v228Children(baseEl):'';
    if(!String(base).trim())base=v228SlotValue(baseEl);
    let exp=sup?v228Children(sup):'';
    if(!String(exp).replace(/\s+/g,''))exp=v228SlotValue(sup);
    /* Letzte Rettung für ältere DOMs: sichtbaren Rest hinter der Basis als Exponent nehmen. */
    if(!String(exp).replace(/\s+/g,'')){
      const total=v228NormText(node.textContent||'').trim(),btxt=v228NormText(baseEl?.textContent||'').trim();
      if(total&&btxt&&total.startsWith(btxt))exp=total.slice(btxt.length).replace(/^\^/,'').trim();
    }
    return `(${v228Need(base,'Basis')})^(${v228Need(exp,'Exponent')})`;
  }
  if(node.matches('.vfExp')){
    const sup=node.querySelector(':scope > sup');let exp=sup?v228Children(sup):'';if(!exp.trim())exp=v228SlotValue(sup);
    return `e^(${v228Need(exp,'Exponent')})`;
  }
  if(node.tagName==='SUP'){
    let exp=v228Children(node);if(!exp.trim())exp=v228SlotValue(node);return `^(${v228Need(exp,'Exponent')})`;
  }
  if(node.tagName==='SUB'){
    /* Index ist im normalen Formeleditor frei. Für einen Funktionsgraphen hat er keine Rechenbedeutung. */
    return '';
  }
  if(node.matches('.vfParen')){
    const body=node.querySelector(':scope > .vfParenBody')||node.querySelector(':scope > .vfEditable');
    return body?`(${v228Need(v228Children(body),'Klammer')})`:v228Children(node);
  }
  if(node.matches('.vfAbs')){
    const inside=node.querySelector(':scope > span');return `abs(${v228Need(v228Children(inside),'Betrag')})`;
  }
  if(node.matches('.vfFunction')){
    const lead=String(node.childNodes[0]?.nodeValue||'');const fn=(lead.match(/(?:sin|cos|tan)/i)||[])[0]?.toLowerCase();
    const inside=node.querySelector(':scope > span');if(!fn)throw new Error('Funktion nicht erkannt');return `${fn}(${v228Need(v228Children(inside),fn)})`;
  }
  return v228Children(node);
}
function v228SerializeGraphFormula(ed){
  v228EnhanceSlots(ed);
  let expr=v228Children(ed).replace(/\s+/g,'');
  expr=expr.replace(/^f\(x\)=/i,'').replace(/^y=/i,'');
  if(!expr)throw new Error('Funktion ist leer');
  return expr;
}
window.v228SerializeGraphFormula=v228SerializeGraphFormula;

/* Graph speichern: ausschließlich die sichtbare gemeinsame Editor-Struktur lesen. */
window.v224SaveGraphFormula=function(i){
  const ed=q('#formulaVisualEditor');if(!ed)return;
  let expr='';
  try{
    expr=v228SerializeGraphFormula(ed);
    if(typeof window.normalizeGraphExpr==='function')window.normalizeGraphExpr(expr);
  }catch(err){
    let msg=String(err?.message||'Ungültige Funktion');
    if(/Unbekannte Funktion/i.test(msg))msg='Im Funktionsgraphen kann nur x als freie Variable berechnet werden';
    if(/Unexpected token|Unexpected end|missing/i.test(msg))msg='Die Formel ist noch nicht vollständig';
    try{cuteToast('Formel prüfen: '+msg)}catch(_){ }
    return;
  }
  const draft=(typeof graphDraft!=='undefined'?graphDraft:window.graphDraft),curve=draft?.curves?.[Number(i)];if(!curve)return;
  curve.expr=expr;curve.formulaHTML=ed.innerHTML;
  try{cuteToast('Funktion übernommen ♡')}catch(_){ }
  window.v224ReturnToGraph?.();
};
window.saveGraphFunctionEditor=function(i){return window.v224SaveGraphFormula(Number(i))};
try{saveGraphFunctionEditor=window.saveGraphFunctionEditor}catch(_){ }

/* Ausdruck -> visueller Editor: auch geklammerte Basen wie (0.5)^(x) korrekt als echten Exponenten laden. */
const prevGTV=window.graphExprToVisual;
window.graphExprToVisual=function(expr){
  let s=String(expr??'').trim().replace(/^f\(x\)\s*=\s*/i,'').replace(/^y\s*=\s*/i,'');
  const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  let safe=esc(s).replace(/(\d)\.(\d)/g,'$1,$2');
  safe=safe.replace(/\((\d+(?:[.,]\d+)?|[a-zA-Z])\)\^\(([^()]*)\)/g,'<span class="vfPower"><span class="vfPowerBase">$1</span><sup class="vfEditable vfExponentSlot" contenteditable="true">$2</sup></span>');
  safe=safe.replace(/(\d+(?:[.,]\d+)?|[a-zA-Z])\^\(([^()]*)\)/g,'<span class="vfPower"><span class="vfPowerBase">$1</span><sup class="vfEditable vfExponentSlot" contenteditable="true">$2</sup></span>');
  if(/vfPower/.test(safe))return safe.replace(/\*/g,'⋅');
  return typeof prevGTV==='function'?prevGTV(expr):safe.replace(/\*/g,'⋅');
};
try{graphExprToVisual=window.graphExprToVisual}catch(_){ }

/* Nach jedem Öffnen Slots sofort freischalten. */
try{
  const prevSetup=window.v224SetupGraphFormulaEditor;
  window.v224SetupGraphFormulaEditor=function(i){const out=prevSetup?.apply(this,arguments);[0,30,100].forEach(t=>setTimeout(()=>v228EnhanceSlots(q('#formulaVisualEditor')),t));return out};
  try{v224SetupGraphFormulaEditor=window.v224SetupGraphFormulaEditor}catch(_){ }
}catch(_){ }

const setVer=()=>{const e=q('#headerEyebrow');if(e)e.textContent='VERSION 228'};[0,250,900,1800].forEach(t=>setTimeout(setVer,t));
})();
