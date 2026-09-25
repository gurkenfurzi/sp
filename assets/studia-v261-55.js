
(()=>{
'use strict';
if(window.__STUDIA_V223__)return;window.__STUDIA_V223__=true;
const q=(s,r=document)=>r?.querySelector?.(s)||null;
const qa=(s,r=document)=>r?.querySelectorAll?[...r.querySelectorAll(s)]:[];

function mathRootFrom(node){
  const el=node instanceof Element?node:(node?.parentElement||null);
  return el?.closest?.('#formulaVisualEditor,#graphFunctionVisual')||null;
}
function currentRangeIn(ed){
  const s=getSelection();if(!ed||!s||!s.rangeCount)return null;
  const r=s.getRangeAt(0);return ed.contains(r.commonAncestorContainer)?r:null;
}
function insertMathText(ed,text){
  const s=getSelection();if(!ed||!s)return;
  let r=currentRangeIn(ed);if(!r){r=document.createRange();r.selectNodeContents(ed);r.collapse(false)}
  r.deleteContents();const n=document.createTextNode(text);r.insertNode(n);r.setStartAfter(n);r.collapse(true);s.removeAllRanges();s.addRange(r);
  ed.dispatchEvent(new Event('input',{bubbles:true}));
}

/* * tippen bedeutet im visuellen Formeleditor immer mathematischen Malpunkt. */
document.addEventListener('beforeinput',e=>{
  if(e.inputType!=='insertText'||e.data!=='*')return;
  const ed=mathRootFrom(e.target);if(!ed)return;
  e.preventDefault();e.stopImmediatePropagation();insertMathText(ed,'⋅');
},true);
document.addEventListener('keydown',e=>{
  if(e.key!=='*')return;const ed=mathRootFrom(e.target);if(!ed)return;
  /* Chromium liefert normalerweise beforeinput; Fallback nur wenn dieses Event sonst native Eingabe auslösen würde. */
  if(e.defaultPrevented)return;
},true);

/* Blockelemente/BRs innerhalb eines Exponenten sind der typische Grund fürs "Runterrutschen". */
function normalizeExponentSlots(root){
  if(!root)return;
  qa('sup,sub',root).forEach(slot=>{
    qa(':scope > div,:scope > p',slot).forEach(block=>{
      const frag=document.createDocumentFragment();while(block.firstChild)frag.appendChild(block.firstChild);block.replaceWith(frag);
    });
    qa(':scope > br',slot).forEach(br=>br.remove());
  });
}
document.addEventListener('keydown',e=>{
  if(e.key!=='Enter')return;
  const ed=mathRootFrom(e.target);if(!ed)return;
  const s=getSelection();if(!s||!s.rangeCount)return;let n=s.anchorNode?.nodeType===1?s.anchorNode:s.anchorNode?.parentElement;
  const slot=n?.closest?.('sup,sub');if(!slot||!ed.contains(slot))return;
  e.preventDefault();e.stopImmediatePropagation();
  const r=document.createRange();r.setStartAfter(slot);r.collapse(true);s.removeAllRanges();s.addRange(r);ed.dispatchEvent(new Event('input',{bubbles:true}));
},true);
document.addEventListener('input',e=>{const ed=mathRootFrom(e.target);if(ed)normalizeExponentSlots(ed)},true);

/* Alte und neue Klammern in ein skalierbares Format umwandeln. */
function stripOneOuterParenText(p){
  const nodes=[...p.childNodes];
  const first=nodes.find(n=>n.nodeType===Node.TEXT_NODE&&String(n.nodeValue||'').trim()!==''),last=[...nodes].reverse().find(n=>n.nodeType===Node.TEXT_NODE&&String(n.nodeValue||'').trim()!=='');
  if(first){const v=String(first.nodeValue||'');first.nodeValue=v.replace(/^\s*\(/,'')}
  if(last){const v=String(last.nodeValue||'');last.nodeValue=v.replace(/\)\s*$/,'')}
}
function upgradeParen(p){
  if(!p||p.classList.contains('v223Paren'))return p;
  stripOneOuterParenText(p);
  const body=document.createElement('span');body.className='vfParenBody';
  while(p.firstChild)body.appendChild(p.firstChild);
  const open=document.createElement('span');open.className='vfParenMark vfParenOpen';open.textContent='(';
  const close=document.createElement('span');close.className='vfParenMark vfParenClose';close.textContent=')';
  p.append(open,body,close);p.classList.add('v223Paren');return p;
}
function scaleParen(p){
  p=upgradeParen(p);if(!p)return;
  const body=q(':scope > .vfParenBody',p);if(!body)return;
  const cs=getComputedStyle(p),fs=parseFloat(cs.fontSize)||28;
  const h=Math.max(fs,body.getBoundingClientRect().height||fs);
  const scale=Math.max(1,Math.min(3.2,h/(fs*1.02)));
  p.style.setProperty('--vf-paren-scale',String(scale));
}
function refreshMathStructures(root=document){
  qa('.vfParen',root).forEach(scaleParen);normalizeExponentSlots(root);
}
let raf=0;function scheduleMathRefresh(root=document){cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>refreshMathStructures(root))}

/* Periodische Zahl aus der aktuellen Markierung erzeugen. */
window.v223AddPeriodMark=function(){
  const ed=q('#formulaVisualEditor');if(!ed)return;
  const s=getSelection(),r=currentRangeIn(ed);if(!s||!r||r.collapsed){try{cuteToast('Markiere zuerst die periodische Zahl ♡')}catch(_){}return}
  const txt=r.toString();if(!/[0-9]/.test(txt)){try{cuteToast('Markiere eine Zahl ♡')}catch(_){}return}
  const frag=document.createDocumentFragment();
  for(const ch of txt){
    if(/[0-9]/.test(ch)){const span=document.createElement('span');span.className='vfPeriodDigit';span.textContent=ch;frag.appendChild(span)}
    else frag.appendChild(document.createTextNode(ch));
  }
  r.deleteContents();const marker=document.createElement('span');marker.className='vfPeriod';marker.appendChild(frag);r.insertNode(marker);
  const nr=document.createRange();nr.setStartAfter(marker);nr.collapse(true);s.removeAllRanges();s.addRange(nr);ed.dispatchEvent(new Event('input',{bubbles:true}));
  try{cuteToast('Periodenzeichen gesetzt ♡')}catch(_){}
};

function injectPeriodButton(){
  const ed=q('#formulaVisualEditor');if(!ed)return;
  const modal=ed.closest('.visualFormulaModal,.formulaModal');if(!modal||q('.v223PeriodBtn',modal))return;
  const grid=q('.formulaToolSection .formulaTemplateGrid.visualOnly',modal);if(!grid)return;
  const b=document.createElement('button');b.type='button';b.className='v223PeriodBtn';b.innerHTML='<b>3̇</b><span>Periode</span>';b.onclick=()=>window.v223AddPeriodMark();grid.appendChild(b);
}

/* Neue Klammern gleich im robusten Format einsetzen. */
try{
  const prevInsert=window.insertVisualFormula;
  window.insertVisualFormula=function(type){
    if(type==='paren'){
      const selected=typeof selectedFormulaHTML==='function'?selectedFormulaHTML():'';
      if(typeof replaceSelectionWithHTML==='function'){
        replaceSelectionWithHTML(`<span class="vfParen v223Paren"><span class="vfParenMark vfParenOpen">(</span><span class="vfParenBody"><span class="vfEditable" contenteditable="true">${selected||'x'}</span></span><span class="vfParenMark vfParenClose">)</span></span>&nbsp;`,'.vfEditable');
        scheduleMathRefresh(q('#formulaVisualEditor'));return;
      }
    }
    return prevInsert?.apply(this,arguments);
  };
  try{insertVisualFormula=window.insertVisualFormula}catch(_){}
}catch(_){}

/* Graph-Formeleditor bekommt dieselben stabilen Klammern, aber keinen Periodenknopf. */
function v223GraphInsertHTML(html,focus=''){
  const ed=q('#graphFunctionVisual');if(!ed)return;ed.focus();const s=getSelection();let r=currentRangeIn(ed);if(!r){r=document.createRange();r.selectNodeContents(ed);r.collapse(false)}
  r.deleteContents();const t=document.createElement('div');t.innerHTML=html;const f=document.createDocumentFragment();let n,last;while((n=t.firstChild))last=f.appendChild(n);r.insertNode(f);
  let target=null;if(focus){const root=last?.nodeType===1?last:last?.parentElement;target=(root?.matches?.(focus)?root:root?.querySelector?.(focus))||q(focus,ed)}
  const nr=document.createRange();if(target)nr.selectNodeContents(target);else if(last){nr.setStartAfter(last);nr.collapse(true)}else{nr.selectNodeContents(ed);nr.collapse(false)}s.removeAllRanges();s.addRange(nr);ed.dispatchEvent(new Event('input',{bubbles:true}));
}
try{
  const prevGraphInsert=window.v221GraphInsert;
  window.v221GraphInsert=function(kind){
    if(kind==='paren'){
      const ed=q('#graphFunctionVisual');if(!ed)return;
      let selected='';const s=getSelection(),r=currentRangeIn(ed);if(s&&r&&!r.collapsed){const d=document.createElement('div');d.appendChild(r.cloneContents());selected=d.innerHTML}
      v223GraphInsertHTML(`<span class="vfParen v223Paren"><span class="vfParenMark vfParenOpen">(</span><span class="vfParenBody"><span class="vfEditable" contenteditable="true">${selected||'x'}</span></span><span class="vfParenMark vfParenClose">)</span></span>&nbsp;`,'.vfEditable');
      scheduleMathRefresh(ed);return;
    }
    const out=prevGraphInsert?.apply(this,arguments);scheduleMathRefresh(q('#graphFunctionVisual'));return out;
  };
}catch(_){}

/* Parser versteht die neuen Klammer-Hilfsspans unverändert als normale Klammern. */
function graphParenText(node){
  const body=q(':scope > .vfParenBody',node);if(!body)return null;
  const walk=n=>{
    if(!n)return'';if(n.nodeType===Node.TEXT_NODE)return String(n.nodeValue||'').replace(/[×⋅]/g,'*').replace(/÷/g,'/').replace(/−/g,'-');
    if(n.nodeType!==Node.ELEMENT_NODE)return'';
    if(n.classList?.contains('vfParenMark'))return'';
    return [...n.childNodes].map(walk).join('');
  };
  return '('+walk(body)+')';
}
/* Existing V222 parser is closed over its helper, so before save we temporarily make marks text-neutral. */
document.addEventListener('click',e=>{if(e.target?.closest?.('#graphFunctionVisual'))scheduleMathRefresh(q('#graphFunctionVisual'))},true);

/* Nach Öffnen/Rendern vorhandene Formeln ebenfalls upgraden. */
try{
  const prevOpen=window.openFormulaDialog;
  window.openFormulaDialog=function(){const out=prevOpen.apply(this,arguments);setTimeout(()=>{injectPeriodButton();refreshMathStructures(q('.visualFormulaModal')||document)},110);return out};
  try{openFormulaDialog=window.openFormulaDialog}catch(_){}
}catch(_){}
try{
  const prevGraphOpen=window.openGraphFunctionEditor;
  window.openGraphFunctionEditor=function(){const out=prevGraphOpen.apply(this,arguments);setTimeout(()=>refreshMathStructures(q('.v221GraphFormulaModal')||document),80);return out};
  try{openGraphFunctionEditor=window.openGraphFunctionEditor}catch(_){}
}catch(_){}
try{
  const prevRender=window.renderCanvasObjects||renderCanvasObjects;
  window.renderCanvasObjects=function(){const out=prevRender.apply(this,arguments);requestAnimationFrame(()=>refreshMathStructures(q('#canvasObjects')||document));return out};
  try{renderCanvasObjects=window.renderCanvasObjects}catch(_){}
}catch(_){}

/* Live aktualisieren, auch wenn ein Bruch in einer Klammer größer/kleiner wird. */
document.addEventListener('input',e=>{const ed=mathRootFrom(e.target);if(ed)scheduleMathRefresh(ed)},true);
window.addEventListener('resize',()=>scheduleMathRefresh(document));
[0,100,350,900].forEach(t=>setTimeout(()=>{injectPeriodButton();refreshMathStructures(document)},t));

const setVer=()=>{const e=q('#headerEyebrow');if(e)e.textContent='VERSION 223'};[0,250,900,1800].forEach(t=>setTimeout(setVer,t));
})();
