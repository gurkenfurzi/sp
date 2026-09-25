
(()=>{
'use strict';
if(window.__STUDIA_V222__)return;window.__STUDIA_V222__=true;
const q=(s,r=document)=>r?.querySelector?.(s)||null;
const qa=(s,r=document)=>r?.querySelectorAll?[...r.querySelectorAll(s)]:[];
const clone=v=>JSON.parse(JSON.stringify(v));
let v222GraphEditId='';
let v222Pan=null;

/* ---------- A. Graph-Ausdrücke: ein stabiler Parser statt mehrerer konkurrierender Wege ---------- */
function v222NormalizeExpr(expr){
  let s=String(expr??'').trim().toLowerCase();
  s=s.replace(/\u200b/g,'').replace(/\u00a0/g,'').replace(/\s+/g,'');
  s=s.replace(/^f\(x\)=/i,'').replace(/^y=/i,'');
  s=s.replace(/[×⋅]/g,'*').replace(/÷/g,'/').replace(/−/g,'-').replace(/π/g,'pi');
  s=s.replace(/(\d),(\d)/g,'$1.$2');
  if(!s)return '';

  /* Übliche Schulschreibweise ohne sichtbares Malzeichen akzeptieren: 2x, 3sin(x), 2(x+1), x(x+1). */
  s=s.replace(/(\d|x|\)|pi|e)(?=(?:sin|cos|tan|sqrt|abs|exp|ln|log)\()/g,'$1*');
  s=s.replace(/(\d|x|\))(?=(?:pi|e)\b)/g,'$1*');
  s=s.replace(/(\b(?:pi|e)\b)(?=(?:x|\d|\())/g,'$1*');
  s=s.replace(/(\d|x|\))(?=\()/g,'$1*');
  s=s.replace(/\)(?=(?:\d|x|pi|e))/g,')*');
  s=s.replace(/(\d)(?=x\b)/g,'$1*');
  s=s.replace(/x(?=\d)/g,'x*');

  if(!/^[0-9x+\-*/().,^a-z]+$/.test(s))throw new Error('Ungültige Zeichen in der Funktion');
  const allowed=['sin','cos','tan','sqrt','abs','exp','ln','log','pi','e'];
  const words=s.match(/[a-z]+/g)||[];
  if(words.some(w=>w!=='x'&&!allowed.includes(w)))throw new Error('Unbekannte Funktion');

  let code=s.replace(/\^/g,'**')
    .replace(/\bpi\b/g,'Math.PI')
    .replace(/\be\b/g,'Math.E')
    .replace(/\bsin\(/g,'Math.sin(')
    .replace(/\bcos\(/g,'Math.cos(')
    .replace(/\btan\(/g,'Math.tan(')
    .replace(/\bsqrt\(/g,'Math.sqrt(')
    .replace(/\babs\(/g,'Math.abs(')
    .replace(/\bexp\(/g,'Math.exp(')
    .replace(/\bln\(/g,'Math.log(')
    .replace(/\blog\(/g,'Math.log10(');
  /* Schon beim Speichern kompilieren. So landet keine kaputte Formel im Graphen. */
  new Function('x',`"use strict";return (${code})`);
  return code;
}
window.normalizeGraphExpr=v222NormalizeExpr;
try{normalizeGraphExpr=window.normalizeGraphExpr}catch(_){}

function v222NodeExpr(node){
  if(!node)return '';
  if(node.nodeType===Node.TEXT_NODE){
    return String(node.nodeValue||'').replace(/\u200b/g,'').replace(/\u00a0/g,' ')
      .replace(/[×⋅]/g,'*').replace(/÷/g,'/').replace(/−/g,'-').replace(/π/g,'pi');
  }
  if(node.nodeType!==Node.ELEMENT_NODE)return '';
  if(node.tagName==='BR')return '';
  if(node.matches('.vfRoot')){
    const inside=node.querySelector(':scope > span');return `sqrt(${v222ChildrenExpr(inside)})`;
  }
  if(node.matches('.vfFrac')){
    const parts=[...node.children];return `((${v222ChildrenExpr(parts[0])})/(${v222ChildrenExpr(parts[1])}))`;
  }
  if(node.matches('.vfFunction')){
    const first=(node.childNodes[0]?.nodeValue||'').trim();
    const fn=(first.match(/(sin|cos|tan)/i)||[])[1]?.toLowerCase()||'sin';
    const inside=node.querySelector(':scope > span');return `${fn}(${v222ChildrenExpr(inside)})`;
  }
  if(node.matches('.vfAbs')){
    const inside=node.querySelector(':scope > span');return `abs(${v222ChildrenExpr(inside)})`;
  }
  if(node.matches('.vfPower')){
    const base=node.querySelector(':scope > .vfPowerBase');const sup=node.querySelector(':scope > sup');
    return `(${v222ChildrenExpr(base)})^(${v222ChildrenExpr(sup)})`;
  }
  if(node.matches('.vfExp')){
    const sup=node.querySelector(':scope > sup');return `exp(${v222ChildrenExpr(sup)})`;
  }
  if(node.tagName==='SUP')return `^(${v222ChildrenExpr(node)})`;
  if(node.tagName==='SUB')return v222ChildrenExpr(node);
  return v222ChildrenExpr(node);
}
function v222ChildrenExpr(el){return el?[...el.childNodes].map(v222NodeExpr).join(''):''}
function v222ReadVisualExpr(){
  const ed=q('#graphFunctionVisual');if(!ed)return '';
  let expr=v222ChildrenExpr(ed).replace(/\s+/g,'');
  expr=expr.replace(/^f\(x\)=/i,'').replace(/^y=/i,'').replace(/(\d),(\d)/g,'$1.$2');
  return expr;
}

/* Graph-Ausdruck zurück in eine verständliche visuelle Form bringen. */
function v222ExprToVisual(expr){
  let s=String(expr??'').trim().replace(/^f\(x\)\s*=\s*/i,'').replace(/^y\s*=\s*/i,'');
  if(!s)return '';
  const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  s=esc(s).replace(/(\d)\.(\d)/g,'$1,$2');
  s=s.replace(/exp\(([^()]*)\)/gi,'<span class="vfExp">e<sup class="vfEditable" contenteditable="true">$1</sup></span>');
  s=s.replace(/sqrt\(([^()]*)\)/gi,'<span class="vfRoot">√<span class="vfEditable" contenteditable="true">$1</span></span>');
  s=s.replace(/sin\(([^()]*)\)/gi,'<span class="vfFunction">sin(<span class="vfEditable" contenteditable="true">$1</span>)</span>');
  s=s.replace(/cos\(([^()]*)\)/gi,'<span class="vfFunction">cos(<span class="vfEditable" contenteditable="true">$1</span>)</span>');
  s=s.replace(/tan\(([^()]*)\)/gi,'<span class="vfFunction">tan(<span class="vfEditable" contenteditable="true">$1</span>)</span>');
  s=s.replace(/abs\(([^()]*)\)/gi,'<span class="vfAbs">|<span class="vfEditable" contenteditable="true">$1</span>|</span>');
  s=s.replace(/(\d+(?:[.,]\d+)?|[a-zA-Z])\^\(([^()]*)\)/g,'<span class="vfPower"><span class="vfPowerBase">$1</span><sup class="vfEditable vfExponentSlot" contenteditable="true">$2</sup></span>');
  s=s.replace(/(\d+(?:[.,]\d+)?|[a-zA-Z])\^([a-zA-Z0-9+\-]+)/g,'<span class="vfPower"><span class="vfPowerBase">$1</span><sup class="vfEditable vfExponentSlot" contenteditable="true">$2</sup></span>');
  return s.replace(/\*/g,'⋅');
}
window.graphExprToVisual=v222ExprToVisual;
try{graphExprToVisual=window.graphExprToVisual}catch(_){}

/* ---------- B. Formel-Editor kehrt sauber zum Graph-Editor zurück ---------- */
const baseOpenGraphDialog=window.openGraphDialog;
function v222EnhanceGraphDialog(){
  const modal=q('.graphModal');if(!modal)return;
  const ranges=q('.graphRangeGrid',modal);if(ranges)ranges.style.display='none';
  const note=q('.graphAutoRangeNote',modal);
  if(note)note.textContent='Ansicht direkt mit der Maus einstellen – kein x min / y min nötig.';
  const wrap=q('.graphPreviewWrap',modal);
  if(wrap&&!q('.v222GraphNav',wrap)){
    const nav=document.createElement('div');nav.className='v222GraphNav';
    nav.innerHTML='<span>🖱️ Mausrad: rein/raus zoomen · Ziehen: Koordinatensystem verschieben</span><button type="button" onclick="v222ResetGraphView()">Ansicht zurücksetzen</button>';
    wrap.insertBefore(nav,wrap.firstChild);
  }
  v222BindPreviewNavigation();
}
window.openGraphDialog=function(editId=''){
  v222GraphEditId=String(editId||'');
  const out=baseOpenGraphDialog.apply(this,arguments);
  setTimeout(v222EnhanceGraphDialog,0);return out;
};
try{openGraphDialog=window.openGraphDialog}catch(_){}
function v222ReopenGraphPreserve(){
  const snap=clone(graphDraft);
  baseOpenGraphDialog.call(window,v222GraphEditId);
  graphDraft=snap;
  setTimeout(()=>{try{renderGraphCurveRows();openGraphDialogRefreshFields();renderGraphPreview()}catch(_){}v222EnhanceGraphDialog()},0);
}
window.v222ReturnToGraphDialog=()=>v222ReopenGraphPreserve();

const baseOpenGraphFunctionEditor=window.openGraphFunctionEditor;
window.openGraphFunctionEditor=function(i){
  graphActiveCurve=i;
  const out=baseOpenGraphFunctionEditor.apply(this,arguments);
  const modal=q('.v221GraphFormulaModal,.visualGraphFunctionModal');
  if(modal){
    const close=q('.presetModalHead .miniIcon',modal);if(close){close.removeAttribute('onclick');close.onclick=()=>v222ReturnToGraphDialog()}
    const footer=q('.graphFnFooter',modal),buttons=qa('button',footer);
    if(buttons[0]){buttons[0].removeAttribute('onclick');buttons[0].onclick=()=>v222ReturnToGraphDialog()}
    const save=buttons.find(b=>b.classList.contains('primary'))||buttons.at(-1);
    if(save){save.removeAttribute('onclick');save.onclick=()=>v222SaveGraphFunctionEditor(i)}
  }
  return out;
};
try{openGraphFunctionEditor=window.openGraphFunctionEditor}catch(_){}

window.v222SaveGraphFunctionEditor=function(i){
  const expr=v222ReadVisualExpr();
  if(!expr){try{cuteToast('Funktion ist leer')}catch(_){}return}
  try{v222NormalizeExpr(expr)}catch(err){try{cuteToast('Formel prüfen: '+(err?.message||'ungültige Funktion'))}catch(_){}return}
  if(!graphDraft.curves[i])return;
  graphDraft.curves[i].expr=expr.replace(/[×⋅]/g,'*').replace(/÷/g,'/').replace(/−/g,'-').replace(/(\d),(\d)/g,'$1.$2');
  v222ReopenGraphPreserve();
  try{cuteToast('Funktion übernommen ♡')}catch(_){}
};
window.saveGraphFunctionEditor=window.v222SaveGraphFunctionEditor;
try{saveGraphFunctionEditor=window.saveGraphFunctionEditor}catch(_){}

/* ---------- C. Linienart: keine Zeile mehr neu rendern, während ein Select geöffnet wird ---------- */
window.v222ActivateGraphCurve=function(event,i,row){
  if(event?.target?.closest?.('button,input,select'))return;
  graphActiveCurve=i;qa('.graphCurveRow').forEach((r,n)=>r.classList.toggle('activeCurve',n===i));
};
window.renderGraphCurveRows=function(){
  const root=q('#graphCurveRows');if(!root)return;
  root.innerHTML=(graphDraft.curves||[]).map((c,i)=>`<div class="graphCurveRow ${i===graphActiveCurve?'activeCurve':''}" onclick="v222ActivateGraphCurve(event,${i},this)">
    <span>f${i+1}(x)</span>
    <button class="graphExprButton" data-curve="${i}" onpointerdown="event.stopPropagation()" onclick="event.stopPropagation();graphActiveCurve=${i};openGraphFunctionEditor(${i})"><span>${c.expr?v222ExprToVisual(c.expr):'Funktion eingeben'}</span><small>Bearbeiten</small></button>
    <input class="graphColor" type="color" value="${c.color||'#e58f98'}" onpointerdown="event.stopPropagation()" onclick="event.stopPropagation()" onchange="event.stopPropagation();updateGraphCurve(${i},'color',this.value)">
    <select onpointerdown="event.stopPropagation()" onclick="event.stopPropagation()" onchange="event.stopPropagation();updateGraphCurve(${i},'style',this.value)"><option value="solid" ${c.style==='solid'?'selected':''}>Linie</option><option value="dashed" ${c.style==='dashed'?'selected':''}>Gestrichelt</option><option value="dotted" ${c.style==='dotted'?'selected':''}>Gepunktet</option></select>
    <button ${graphDraft.curves.length<=1?'disabled':''} onpointerdown="event.stopPropagation()" onclick="event.stopPropagation();removeGraphCurve(${i})">×</button>
  </div>`).join('');
};
try{renderGraphCurveRows=window.renderGraphCurveRows}catch(_){}

/* ---------- D. Graph-Ansicht ausschließlich mit Maus: Wheel-Zoom + Drag-Pan ---------- */
function v222EffectiveBounds(g,w=520,h=330){
  const pad=34,plotW=w-pad*2,plotH=h-pad*2;
  let xMin=Number(g.xMin),xMax=Number(g.xMax),yMin=Number(g.yMin),yMax=Number(g.yMax);
  if(!(xMax>xMin)){xMin=-10;xMax=10}if(!(yMax>yMin)){yMin=-10;yMax=10}
  const dataAspect=(xMax-xMin)/(yMax-yMin),viewAspect=plotW/plotH;
  if(Number.isFinite(dataAspect)&&dataAspect>0&&viewAspect>0){
    if(viewAspect>dataAspect){const cx=(xMin+xMax)/2,newSpan=(yMax-yMin)*viewAspect;xMin=cx-newSpan/2;xMax=cx+newSpan/2}
    else{const cy=(yMin+yMax)/2,newSpan=(xMax-xMin)/viewAspect;yMin=cy-newSpan/2;yMax=cy+newSpan/2}
  }
  return{xMin,xMax,yMin,yMax,pad,plotW,plotH,w,h};
}
function v222ApplyBounds(b){
  graphDraft.xMin=b.xMin;graphDraft.xMax=b.xMax;graphDraft.yMin=b.yMin;graphDraft.yMax=b.yMax;
  try{openGraphDialogRefreshFields()}catch(_){};renderGraphPreview();
}
window.v222ResetGraphView=function(){
  graphDraft.xMin=-10;graphDraft.xMax=10;graphDraft.yMin=-10;graphDraft.yMax=10;
  v222ApplyBounds(graphDraft);try{cuteToast('Ansicht zurückgesetzt ♡')}catch(_){}
};
function v222BindPreviewNavigation(){
  const root=q('#graphPreview');if(!root||root.dataset.v222Nav==='1')return;root.dataset.v222Nav='1';
  root.tabIndex=0;
  root.addEventListener('wheel',e=>{
    e.preventDefault();
    const rect=root.getBoundingClientRect();if(!rect.width||!rect.height)return;
    const b=v222EffectiveBounds(graphDraft),mx=(e.clientX-rect.left)/rect.width*b.w,my=(e.clientY-rect.top)/rect.height*b.h;
    const tx=Math.max(0,Math.min(1,(mx-b.pad)/b.plotW)),ty=Math.max(0,Math.min(1,(my-b.pad)/b.plotH));
    const cx=b.xMin+tx*(b.xMax-b.xMin),cy=b.yMax-ty*(b.yMax-b.yMin);
    const factor=Math.exp(Math.max(-450,Math.min(450,e.deltaY))*0.0016);
    const minSpan=.02,maxSpan=1e6;
    let sx=Math.max(minSpan,Math.min(maxSpan,(b.xMax-b.xMin)*factor));
    let sy=Math.max(minSpan,Math.min(maxSpan,(b.yMax-b.yMin)*factor));
    const rx=(cx-b.xMin)/(b.xMax-b.xMin),ry=(cy-b.yMin)/(b.yMax-b.yMin);
    v222ApplyBounds({xMin:cx-rx*sx,xMax:cx+(1-rx)*sx,yMin:cy-ry*sy,yMax:cy+(1-ry)*sy});
  },{passive:false});
  root.addEventListener('pointerdown',e=>{
    if(e.button!==0)return;e.preventDefault();root.focus({preventScroll:true});
    const b=v222EffectiveBounds(graphDraft);v222Pan={pid:e.pointerId,x:e.clientX,y:e.clientY,b,rect:root.getBoundingClientRect()};
    root.classList.add('v222Panning');try{root.setPointerCapture(e.pointerId)}catch(_){}
  },{passive:false});
  root.addEventListener('pointermove',e=>{
    if(!v222Pan||e.pointerId!==v222Pan.pid)return;e.preventDefault();
    const d=v222Pan,dx=e.clientX-d.x,dy=e.clientY-d.y;
    const dxSvg=dx/Math.max(1,d.rect.width)*d.b.w,dySvg=dy/Math.max(1,d.rect.height)*d.b.h;
    const shiftX=-dxSvg/d.b.plotW*(d.b.xMax-d.b.xMin),shiftY=dySvg/d.b.plotH*(d.b.yMax-d.b.yMin);
    v222ApplyBounds({xMin:d.b.xMin+shiftX,xMax:d.b.xMax+shiftX,yMin:d.b.yMin+shiftY,yMax:d.b.yMax+shiftY});
  },{passive:false});
  const end=e=>{if(!v222Pan||e.pointerId!==v222Pan.pid)return;v222Pan=null;root.classList.remove('v222Panning');try{root.releasePointerCapture(e.pointerId)}catch(_){}};
  root.addEventListener('pointerup',end);root.addEventListener('pointercancel',end);
}

/* ---------- E. Eingefügten Funktionsgraphen auf dem Lernblatt wieder frei bewegen ---------- */
function v222BindGraphObjectDragging(){
  if(innerWidth<900)return;
  qa('#view-sheet-editor #canvasObjects .graphObj').forEach(el=>{
    if(el.dataset.v222Drag==='1')return;el.dataset.v222Drag='1';
    el.addEventListener('pointerdown',e=>{
      if(e.button!==0||e.shiftKey||e.target.closest('.resizeHandle,.rotateHandle,button,input,select,textarea,a'))return;
      const id=el.dataset.id,o=canvasState.objects.find(x=>String(x.id)===String(id));if(!o||o.locked)return;
      const total=(canvasState.selectedIds?.length||0)+(canvasState.selectedVectorIds?.length||0);if(total>1)return;
      /* An den Kanten besitzt der Desktop-Rahmen bereits seine Move/Resize-Logik. Mitte = ganzer Graph bewegen. */
      if(window.studiaDesktopNearEdge?.(el,e))return;
      e.preventDefault();e.stopImmediatePropagation();
      try{selectCanvasObject(id)}catch(_){};
      try{startDragObject(e,id)}catch(_){}
    },{capture:true,passive:false});
  });
}
try{
  const prevRender=window.renderCanvasObjects||renderCanvasObjects;
  window.renderCanvasObjects=function(){const out=prevRender.apply(this,arguments);requestAnimationFrame(v222BindGraphObjectDragging);return out};
  renderCanvasObjects=window.renderCanvasObjects;
}catch(_){}
const v222Obs=new MutationObserver(()=>requestAnimationFrame(v222BindGraphObjectDragging));
const v222Canvas=q('#canvasObjects');if(v222Canvas)v222Obs.observe(v222Canvas,{childList:true,subtree:true});
setTimeout(v222BindGraphObjectDragging,100);

/* Graph-Dialog, wenn er schon offen ist, ebenfalls nachrüsten. */
setTimeout(v222EnhanceGraphDialog,100);

const setVer=()=>{const e=q('#headerEyebrow');if(e)e.textContent='VERSION 222'};[0,250,900,1800].forEach(t=>setTimeout(setVer,t));
})();
