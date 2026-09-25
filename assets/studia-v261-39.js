
/* ===== Studia V193 — laptop-only selection, typography and saved-format fixes ===== */
(()=>{'use strict';
if(window.__STUDIA_V193__)return;window.__STUDIA_V193__=true;document.documentElement.classList.add('v193Ready');
const q=(s,r=document)=>r?.querySelector?.(s)||null,qa=(s,r=document)=>r?.querySelectorAll?[...r.querySelectorAll(s)]:[];
const laptop=()=>innerWidth>=900&&document.body.classList.contains('editorMode')&&!!q('#view-sheet-editor.active');
const S=()=>{try{return canvasState}catch(_){return window.canvasState}};
const clone=x=>JSON.parse(JSON.stringify(x));
const esc=x=>CSS.escape(String(x));

/* Clicking the multi-select tool while a shape is active selects every unlocked shape on this page. */
const oldToggleMulti=window.v132ToggleMulti;
if(typeof oldToggleMulti==='function')window.v132ToggleMulti=function(){
 const s=S();
 if(laptop()&&s&&!s.multiMode&&s.selectedType==='vector'){
   s.selectedIds=[];
   s.selectedVectorIds=(s.vectors||[]).filter(v=>!v.locked).map(v=>v.id);
   if(s.selectedVectorIds.length){s.selectedType='vector';s.selectedId=s.selectedVectorIds.at(-1)}
 }
 const out=oldToggleMulti.apply(this,arguments);
 const n=(s?.selectedIds?.length||0)+(s?.selectedVectorIds?.length||0);
 document.body.classList.toggle('v190Multi',n>1);document.body.classList.toggle('v187Multi',n>1);
 requestAnimationFrame(()=>window.v193PaintGroupFrame?.());
 return out;
};
try{v132ToggleMulti=window.v132ToggleMulti}catch(_){}

/* Every newly inserted desktop vector carries the requested text defaults. */
for(const name of ['addVectorLine','addVectorCurve']){
 const old=window[name];if(typeof old!=='function')continue;
 window[name]=function(){const s=S(),before=s?.vectors?.length||0,r=old.apply(this,arguments),v=s?.vectors?.length>before?s.vectors.at(-1):null;if(laptop()&&v){v.fontSize=17;v.textColor='#8d7369'}return r};
 try{if(name==='addVectorLine')addVectorLine=window[name];if(name==='addVectorCurve')addVectorCurve=window[name]}catch(_){}
}

/* Visible, editable HEX values beside the existing color controls. */
function normalizedHex(value){const m=String(value||'').trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);if(!m)return null;let h=m[1];if(h.length===3)h=[...h].map(c=>c+c).join('');return '#'+h.toUpperCase()}
window.v193EnhanceHexColors=function(){if(!laptop())return;qa('.v134FormatTools input[type="color"],#canvasInspector input[type="color"],.modal input[type="color"],#modal input[type="color"]').forEach(color=>{
 if(color.dataset.v193Hex==='1')return;color.dataset.v193Hex='1';
 const hex=document.createElement('input');hex.type='text';hex.className='v193HexColor';hex.inputMode='text';hex.maxLength=7;hex.setAttribute('aria-label','HEX-Farbe');hex.title='HEX-Farbe, z. B. #8D7369';hex.value=String(color.value||'#000000').toUpperCase();color.insertAdjacentElement('afterend',hex);
 const sync=()=>{const v=normalizedHex(color.value);if(v&&document.activeElement!==hex)hex.value=v};
 const apply=()=>{const v=normalizedHex(hex.value);hex.setCustomValidity(v?'':'HEX-Farbe wie #8D7369 eingeben');if(!v)return;hex.value=v;color.value=v.toLowerCase();color.dispatchEvent(new Event('input',{bubbles:true}));color.dispatchEvent(new Event('change',{bubbles:true}))};
 color.addEventListener('input',sync);color.addEventListener('change',sync);hex.addEventListener('input',apply);hex.addEventListener('change',apply);hex.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();apply();hex.blur()}});
 })};

/* One transform frame for every multi-selection, including saved text-format bundles. */
function vectorBox(v){try{return vectorBounds(v)}catch(_){if(v.type==='rect')return{x:+v.x||0,y:+v.y||0,w:+v.w||1,h:+v.h||1};if(v.type==='ellipse')return{x:(+v.cx||0)-(+v.rx||0),y:(+v.cy||0)-(+v.ry||0),w:(+v.rx||1)*2,h:(+v.ry||1)*2};const p=v.points||[];if(!p.length)return{x:0,y:0,w:1,h:1};const xs=p.map(a=>+a[0]||0),ys=p.map(a=>+a[1]||0);return{x:Math.min(...xs),y:Math.min(...ys),w:Math.max(1,Math.max(...xs)-Math.min(...xs)),h:Math.max(1,Math.max(...ys)-Math.min(...ys))}}}
function chosen(){const s=S();if(!s)return{objects:[],vectors:[]};const oi=new Set((s.selectedIds||[]).map(String)),vi=new Set((s.selectedVectorIds||[]).map(String));return{objects:(s.objects||[]).filter(o=>oi.has(String(o.id))&&!o.locked),vectors:(s.vectors||[]).filter(v=>vi.has(String(v.id))&&!v.locked)}}
function itemBounds(x){const out=x.objects.map(o=>({x:+o.x||0,y:+o.y||0,w:Math.max(1,+o.w||1),h:Math.max(1,+o.h||1)}));x.vectors.forEach(v=>out.push(vectorBox(v)));return out}
function unionBounds(x){const all=itemBounds(x);if(all.length<2)return null;const x1=Math.min(...all.map(b=>b.x)),y1=Math.min(...all.map(b=>b.y)),x2=Math.max(...all.map(b=>b.x+b.w)),y2=Math.max(...all.map(b=>b.y+b.h));return{x:x1,y:y1,w:Math.max(1,x2-x1),h:Math.max(1,y2-y1)}}
function ensureGroupFrame(){const stage=q('#canvasStage');if(!stage)return null;let f=q('#v193GroupFrame',stage);if(!f){f=document.createElement('div');f.id='v193GroupFrame';f.innerHTML=['nw','n','ne','e','se','s','sw','w'].map(h=>`<button type="button" data-h="${h}" aria-label="Auswahl skalieren"></button>`).join('');f.addEventListener('pointerdown',startGroupResize,{capture:true,passive:false});stage.appendChild(f)}return f}
window.v193PaintGroupFrame=function(){const old=q('#v193GroupFrame');if(!laptop()){old?.remove();return}const b=unionBounds(chosen());if(!b){old?.remove();return}const f=ensureGroupFrame();Object.assign(f.style,{left:b.x+'px',top:b.y+'px',width:b.w+'px',height:b.h+'px'})};
function resizedBox(b,h,dx,dy){let x=b.x,y=b.y,w=b.w,hh=b.h,min=28;if(h.includes('e'))w=Math.max(min,b.w+dx);if(h.includes('s'))hh=Math.max(min,b.h+dy);if(h.includes('w')){w=Math.max(min,b.w-dx);x=b.x+b.w-w}if(h.includes('n')){hh=Math.max(min,b.h-dy);y=b.y+b.h-hh}return{x,y,w,h:hh}}
function applyVectorScale(v,s,b,nb){const sx=nb.w/Math.max(1,b.w),sy=nb.h/Math.max(1,b.h),X=n=>nb.x+(n-b.x)*sx,Y=n=>nb.y+(n-b.y)*sy;if(s.type==='rect'){v.x=X(+s.x||0);v.y=Y(+s.y||0);v.w=Math.max(1,(+s.w||1)*sx);v.h=Math.max(1,(+s.h||1)*sy)}else if(s.type==='ellipse'){v.cx=X(+s.cx||0);v.cy=Y(+s.cy||0);v.rx=Math.max(1,(+s.rx||1)*Math.abs(sx));v.ry=Math.max(1,(+s.ry||1)*Math.abs(sy))}else if(Array.isArray(s.points))v.points=s.points.map(p=>[X(+p[0]||0),Y(+p[1]||0)])}
function startGroupResize(e){const h=e.target?.dataset?.h;if(!h||!laptop()||e.button!==0)return;const selected=chosen(),b=unionBounds(selected);if(!b)return;e.preventDefault();e.stopImmediatePropagation();const stage=q('#canvasStage'),sc=Math.max(.01,stage.getBoundingClientRect().width/(typeof canvasPageWidth==='function'?canvasPageWidth():794)),objects=selected.objects.map(o=>({o,s:clone(o)})),vectors=selected.vectors.map(v=>({v,s:clone(v)})),sx=e.clientX,sy=e.clientY,pid=e.pointerId,frame=ensureGroupFrame();
 const move=ev=>{if(ev.pointerId!==pid)return;ev.preventDefault();ev.stopImmediatePropagation();const nb=resizedBox(b,h,(ev.clientX-sx)/sc,(ev.clientY-sy)/sc),kx=nb.w/Math.max(1,b.w),ky=nb.h/Math.max(1,b.h);objects.forEach(({o,s})=>{o.x=nb.x+((+s.x||0)-b.x)*kx;o.y=nb.y+((+s.y||0)-b.y)*ky;o.w=Math.max(18,(+s.w||18)*kx);o.h=Math.max(18,(+s.h||18)*ky);const el=q(`#canvasObjects .cobj[data-id="${esc(o.id)}"]`);if(el)Object.assign(el.style,{left:o.x+'px',top:o.y+'px',width:o.w+'px',height:o.h+'px'})});vectors.forEach(({v,s})=>applyVectorScale(v,s,b,nb));if(vectors.length)try{renderVectors?.()}catch(_){}Object.assign(frame.style,{left:nb.x+'px',top:nb.y+'px',width:nb.w+'px',height:nb.h+'px'})};
 const end=ev=>{if(ev.pointerId!==pid)return;window.removeEventListener('pointermove',move,true);window.removeEventListener('pointerup',end,true);window.removeEventListener('pointercancel',end,true);try{renderCanvasObjects?.();renderVectors?.();renderCanvasInspector?.();renderLayerList?.();markCanvasDirty?.();pushHistory?.()}catch(_){}requestAnimationFrame(window.v193PaintGroupFrame)};
 window.addEventListener('pointermove',move,{capture:true,passive:false});window.addEventListener('pointerup',end,{capture:true,passive:false});window.addEventListener('pointercancel',end,{capture:true,passive:false});try{e.target.setPointerCapture?.(pid)}catch(_){}
}

const oldInsert=window.insertSavedTextFormat;if(typeof oldInsert==='function')window.insertSavedTextFormat=function(){const r=oldInsert.apply(this,arguments),s=S(),n=(s?.selectedIds?.length||0)+(s?.selectedVectorIds?.length||0);if(laptop()&&n>1){s.multiMode=true;document.body.classList.add('v190Multi','v187Multi')}requestAnimationFrame(window.v193PaintGroupFrame);return r};
try{insertSavedTextFormat=window.insertSavedTextFormat}catch(_){}
const oldRender193=window.renderCanvasObjects;if(typeof oldRender193==='function')window.renderCanvasObjects=function(){const r=oldRender193.apply(this,arguments);requestAnimationFrame(window.v193PaintGroupFrame);return r};
try{renderCanvasObjects=window.renderCanvasObjects}catch(_){}

function reconcile193(){const eye=q('#headerEyebrow');if(eye)eye.textContent='VERSION 202';if(!laptop())return;window.v193EnhanceHexColors();window.v193PaintGroupFrame()}
window.addEventListener('resize',()=>setTimeout(reconcile193,100));document.addEventListener('click',()=>setTimeout(reconcile193,0),true);[500,1800,9200].forEach(t=>setTimeout(reconcile193,t));
})();
/* ===== /Studia V193 ===== */
