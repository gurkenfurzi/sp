/* Studia V138 — editor reliability pass */
(function(){
'use strict';
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
const editor=()=>document.body.classList.contains('editorMode')&&!!q('#view-sheet-editor.active');
const deep=x=>JSON.parse(JSON.stringify(x));
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const svg=(d,view='0 0 24 24')=>`<svg viewBox="${view}" aria-hidden="true">${d}</svg>`;
const icons={
 text:svg('<path d="M5 5h14M12 5v14M8 19h8"/>'),
 elements:svg('<rect x="4" y="4" width="7" height="7" rx="2"/><circle cx="16.5" cy="7.5" r="3.5"/><path d="m5 20 3.5-6 3.5 6zM15 15h5v5h-5z"/>'),
 template:svg('<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 8h8M8 12h8M8 16h5"/>'),
 pages:svg('<path d="M7 3h8l4 4v14H7z"/><path d="M15 3v5h4M4 7v14h11"/>'),
 layers:svg('<path d="m12 3 9 5-9 5-9-5z"/><path d="m4 12 8 4 8-4M4 16l8 4 8-4"/>'),
 trash:svg('<path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/>'),
 sliders:svg('<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>'),
 link:svg('<path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1-1"/>'),
 task:svg('<rect x="5" y="4" width="14" height="17" rx="3"/><path d="M9 4V2h6v2M8 10l2 2 4-4M8 16h7"/>'),
 test:svg('<path d="M7 3h8l4 4v14H7zM15 3v5h4"/><path d="m4 11 1 2 2 1-2 1-1 2-1-2-2-1 2-1z"/>'),
 subjects:svg('<path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H20v16H7.5A3.5 3.5 0 0 0 4 21.5zM4 5.5v16"/><path d="M9 7h7M9 11h6"/>'),
 learn:svg('<circle cx="12" cy="13" r="8"/><path d="M12 9v5l3 2M9 2h6"/>')
};

function selection(){
 const ids=[...new Set([...(canvasState.selectedIds||[]),...(canvasState.selectedType==='object'&&canvasState.selectedId?[canvasState.selectedId]:[])])];
 const vids=[...new Set([...(canvasState.selectedVectorIds||[]),...(canvasState.selectedType==='vector'&&canvasState.selectedId?[canvasState.selectedId]:[])])];
 return {ids,vids,objects:(canvasState.objects||[]).filter(x=>ids.includes(x.id)),vectors:(canvasState.vectors||[]).filter(x=>vids.includes(x.id))};
}
function commit(message=''){
 renderCanvasObjects();renderCanvasInspector();renderLayerList();window.v132SyncHits?.();markCanvasDirty();pushHistory();if(message)window.cuteToast?.(message);
}

/* Graph child editor returns to the parent without losing its draft. */
let graphEditId='';
const baseOpenGraph=window.openGraphDialog;
window.openGraphDialog=function(editId=''){graphEditId=editId||'';return baseOpenGraph.apply(this,arguments)};
try{openGraphDialog=window.openGraphDialog}catch(_){}
window.saveGraphFunctionEditor=function(i){
 const ed=q('#graphFunctionVisual');if(!ed)return;
 [...ed.childNodes].forEach((n,idx,arr)=>{if(n.nodeType===Node.TEXT_NODE&&/^\s*[-−]\s*$/.test(n.nodeValue||'')&&arr[idx+1]?.nodeType===Node.ELEMENT_NODE&&arr[idx+1].matches?.('.vfRoot'))n.remove()});
 let expr=graphVisualChildrenExpr(ed).replace(/\s+/g,'').replace(/^[xy]=/i,'');
 if(!expr)return window.cuteToast?.('Funktion ist leer');
 graphDraft.curves[i].expr=expr;
 const keep=deep(graphDraft),edit=graphEditId;
 closeModal();window.openGraphDialog(edit);graphDraft=keep;
 requestAnimationFrame(()=>{renderGraphCurveRows();openGraphDialogRefreshFields?.();renderGraphPreview();window.cuteToast?.('Funktion übernommen ♡')});
};
try{saveGraphFunctionEditor=window.saveGraphFunctionEditor}catch(_){}

/* Exponent applies to the selected or immediately preceding atom — never inserts a surprise x. */
function selectPreviousAtom(root){
 const sel=getSelection();if(!root||!sel||!sel.rangeCount)return false;const old=sel.getRangeAt(0);if(!root.contains(old.startContainer))return false;
 if(old.collapsed){const el=old.startContainer.nodeType===Node.ELEMENT_NODE?old.startContainer:old.startContainer.parentElement,frac=el?.closest?.('.vfFrac');if(frac&&root.contains(frac)){const whole=document.createRange();whole.selectNode(frac);sel.removeAllRanges();sel.addRange(whole);return true}}
 const previousMeaningful=n=>{while(n){const blank=n.nodeType===Node.TEXT_NODE&&!String(n.nodeValue||'').replace(/\u00a0/g,' ').trim(),br=n.nodeType===Node.ELEMENT_NODE&&n.matches?.('br');if(!blank&&!br)break;n=n.previousSibling}return n};
 let node=old.startContainer,offset=old.startOffset,r=document.createRange(),picked=null;
 if(node.nodeType===Node.TEXT_NODE&&offset>0){const text=node.nodeValue||'',before=text.slice(0,offset);if(before.replace(/\u00a0/g,' ').trim()){let start=offset-1;while(start>0&&/[\wäöüÄÖÜßπ]/.test(text[start-1]||''))start--;r.setStart(node,start);r.setEnd(node,offset)}else picked=previousMeaningful(node.previousSibling)}
 else if(node.nodeType===Node.ELEMENT_NODE&&offset>0)picked=previousMeaningful(node.childNodes[offset-1]);
 else{
   let cur=node.nodeType===Node.ELEMENT_NODE?node:node.parentNode,prev=null;
   while(cur&&cur!==root&&!prev){prev=previousMeaningful(cur.previousSibling);cur=cur.parentNode}
   if(!prev&&cur===root&&offset>0)prev=previousMeaningful(root.childNodes[offset-1]);
   if(!prev)return false;r.selectNode(prev);
 }
 if(picked)r.selectNode(picked);
 sel.removeAllRanges();sel.addRange(r);return !r.collapsed;
}
function selectWholeFractionSlot(root){const sel=getSelection();if(!sel||!sel.rangeCount||sel.isCollapsed)return false;const r=sel.getRangeAt(0),el=r.commonAncestorContainer.nodeType===Node.ELEMENT_NODE?r.commonAncestorContainer:r.commonAncestorContainer.parentElement,slot=el?.closest?.('.vfFrac > span'),frac=slot?.closest?.('.vfFrac');if(!slot||!frac||!root.contains(frac))return false;const all=document.createRange();all.selectNodeContents(slot);if(r.compareBoundaryPoints(Range.START_TO_START,all)!==0||r.compareBoundaryPoints(Range.END_TO_END,all)!==0)return false;const whole=document.createRange();whole.selectNode(frac);sel.removeAllRanges();sel.addRange(whole);return true}
const baseInsertFormula=window.insertVisualFormula;
window.insertVisualFormula=function(type){
 if(type!=='power')return baseInsertFormula.apply(this,arguments);
 const ed=q('#formulaVisualEditor');if(!ed)return;selectWholeFractionSlot(ed);ed.focus();let chosen=selectedFormulaHTML();
 if(!chosen&&selectPreviousAtom(ed))chosen=selectedFormulaHTML();
 if(!chosen)return window.cuteToast?.('Schreibe oder markiere zuerst die Basis ♡');
 replaceSelectionWithHTML(`<span class="vfPower"><span class="vfPowerBase">${chosen}</span><sup class="vfEditable vfExponentSlot" contenteditable="true">n</sup></span>&nbsp;`,'sup.vfExponentSlot');
};
try{insertVisualFormula=window.insertVisualFormula}catch(_){}
const baseGraphInsert=window.graphFnInsert;
window.graphFnInsert=function(kind){
 if(kind!=='power')return baseGraphInsert.apply(this,arguments);
 const ed=q('#graphFunctionVisual');if(!ed)return;selectWholeFractionSlot(ed);ed.focus();let s=graphVisualSelection();
 if(!s.html&&selectPreviousAtom(ed))s=graphVisualSelection();
 if(!s.html)return window.cuteToast?.('Schreibe oder markiere zuerst die Basis ♡');
 graphInsertHTML(`<span class="vfPower"><span class="vfPowerBase">${s.html}</span><sup class="vfEditable vfExponentSlot" contenteditable="true">n</sup></span>&nbsp;`,'sup.vfExponentSlot');
};
try{graphFnInsert=window.graphFnInsert}catch(_){}

/* Five stable navigation destinations on every screen size. */
function navHTML(){const row=(mode,label,icon)=>`<button data-v138="${mode}" title="${label}"><span class="editorNavIcon">${icons[icon]}</span><span>${label}</span></button>`;return '<i class="v138NavSentinel" data-v128="v138" data-v134="v138" data-v138="sentinel"></i>'+row('text','Text','text')+row('elements','Elemente','elements')+row('templates','Vorlagen','template')+row('pages','Seiten','pages')+row('layers','Ebenen','layers')}
window.v138NavOpen=function(mode,btn){qa('.canvasQuickNav button').forEach(x=>x.classList.toggle('active',x===btn));window.v132Open?.(mode,btn);setTimeout(()=>{if(mode==='elements')ensureElementTools();if(mode==='layers')renderLayerList()},100)};
function compactNav(){const nav=q('.canvasQuickNav');if(!editor()||!nav)return;if(!nav.querySelector('[data-v138="sentinel"]'))nav.innerHTML=navHTML();qa('button[data-v138]',nav).forEach(b=>{b.onclick=()=>v138NavOpen(b.dataset.v138,b)})}
function ensureElementTools(){const d=q('#canvasQuickDrawer.open'),active=q('.canvasQuickNav button.active');const isElements=active?.dataset.v138==='elements'||d?.dataset.v137Mode==='elements'||d?.dataset.v134Mode==='elements';if(!d||!isElements||d.querySelector('.v138ElementTools'))return;const x=document.createElement('section');x.className='v133ElementGroup v138ElementTools';x.innerHTML=`<h3>Diagramme & Ablauf</h3><div class="v133ElementGrid"><button onclick="openChartDialog()">${window.v133Icon?.('graph')||icons.elements}<span>Diagramm</span></button><button onclick="openTimelineDialog()">${window.v133Icon?.('line')||icons.layers}<span>Timeline</span></button><button onclick="openStickerLibrary()">${window.v133Icon?.('sticker')||icons.template}<span>Sticker</span></button></div>`;(d.querySelector('.v133ElementGroups')||d).appendChild(x)}
window.toggleStickerPanel=()=>window.openStickerLibrary?.();

/* Transform handles live in the top interaction layer, so they remain reachable
   even when another object overlaps the selected item. */
let transformDrag=null,transformFrame=0;
function selectedSingle(){const s=selection(),n=s.ids.length+s.vids.length;if(n!==1)return null;return s.ids.length?{kind:'object',ref:s.objects[0],id:s.ids[0]}:{kind:'vector',ref:s.vectors[0],id:s.vids[0]}}
function transformPoint(cx,cy){const stage=q('#canvasStage'),r=stage?.getBoundingClientRect(),scale=r&&canvasPageWidth()?r.width/canvasPageWidth():1;return r?{x:(cx-r.left)/scale,y:(cy-r.top)/scale,scale}:null}
function decorateTransformHandles(){
 const one=selectedSingle(),wanted=one&&!one.ref?.locked&&!document.body.classList.contains('v137ViewMode')?q(`.v132Hit[data-kind="${one.kind}"][data-id="${CSS.escape(one.id)}"]`):null;
 if(wanted?.classList.contains('v138TransformTarget')&&wanted.querySelectorAll('.v138TransformHandle').length===2)return;
 qa('.v138TransformHandle').forEach(x=>x.remove());qa('.v132Hit.v138TransformTarget').forEach(x=>x.classList.remove('v138TransformTarget'));
 if(!editor()||!wanted)return;const hit=wanted;hit.classList.add('v138TransformTarget');
 const rotate=document.createElement('button'),resize=document.createElement('button');rotate.type=resize.type='button';rotate.className='v138TransformHandle v138Rotate';resize.className='v138TransformHandle v138Resize';rotate.title='Drehen';resize.title='Größe ändern';rotate.setAttribute('aria-label','Drehen');resize.setAttribute('aria-label','Größe ändern');rotate.dataset.mode='rotate';resize.dataset.mode='resize';rotate.dataset.kind=resize.dataset.kind=one.kind;rotate.dataset.id=resize.dataset.id=one.id;hit.append(rotate,resize);
}
document.addEventListener('pointerdown',e=>{const h=e.target instanceof Element?e.target.closest('.v138TransformHandle'):null;if(!h)return;const ref=h.dataset.kind==='object'?(canvasState.objects||[]).find(x=>x.id===h.dataset.id):(canvasState.vectors||[]).find(x=>x.id===h.dataset.id);if(ref)startTransform(e,h.dataset.mode,{kind:h.dataset.kind,id:h.dataset.id,ref})},{capture:true,passive:false});
function startTransform(e,mode,one){
 if(e.button!==0&&e.pointerType==='mouse')return;e.preventDefault();e.stopImmediatePropagation();const p=transformPoint(e.clientX,e.clientY),b=one.kind==='object'?{x:one.ref.x,y:one.ref.y,w:one.ref.w,h:one.ref.h}:vbox(one.ref);if(!p||!b)return;
 transformDrag={mode,one,start:p,b:{...b},rotation:Number(one.ref.rotation)||0,clientX:e.clientX,clientY:e.clientY};document.body.classList.add('v138Transforming');
 const move=ev=>{if(!transformDrag)return;ev.preventDefault();ev.stopImmediatePropagation();transformDrag.clientX=ev.clientX;transformDrag.clientY=ev.clientY;if(!transformFrame)transformFrame=requestAnimationFrame(applyTransformFrame)};
 const up=ev=>{window.removeEventListener('pointermove',move,true);window.removeEventListener('pointerup',up,true);window.removeEventListener('pointercancel',up,true);if(!transformDrag)return;transformDrag.clientX=ev.clientX;transformDrag.clientY=ev.clientY;if(transformFrame)cancelAnimationFrame(transformFrame);transformFrame=0;applyTransformFrame();transformDrag=null;document.body.classList.remove('v138Transforming');markCanvasDirty();pushHistory();renderCanvasInspector();renderLayerList();window.cuteToast?.(mode==='rotate'?'Gedreht ♡':'Größe geändert ♡')};
 window.addEventListener('pointermove',move,{capture:true,passive:false});window.addEventListener('pointerup',up,{capture:true,passive:false});window.addEventListener('pointercancel',up,{capture:true,passive:false});
}
function applyTransformFrame(){
 transformFrame=0;const d=transformDrag;if(!d)return;const p=transformPoint(d.clientX,d.clientY);if(!p)return;const ref=d.one.ref;
 if(d.mode==='resize'){const nw=Math.max(20,d.b.w+(p.x-d.start.x)),nh=Math.max(20,d.b.h+(p.y-d.start.y));if(d.one.kind==='object'){ref.w=nw;ref.h=nh}else resizeVector(ref,nw,nh)}
 else{const cx=d.b.x+d.b.w/2,cy=d.b.y+d.b.h/2;ref.rotation=Math.round((Math.atan2(p.y-cy,p.x-cx)*180/Math.PI+90+360)%360)}
 renderCanvasObjects();renderVectors();window.v132SyncHits?.();decorateTransformHandles();markCanvasDirty(false);
}

/* Geometry and Illustrator-style arrangement for every selected kind. */
function vbox(v){try{return vectorBounds(v)}catch(_){if(v.type==='rect')return{x:v.x,y:v.y,w:v.w,h:v.h};if(v.type==='ellipse')return{x:v.cx-v.rx,y:v.cy-v.ry,w:v.rx*2,h:v.ry*2};const p=v.points||[[0,0]],xs=p.map(x=>x[0]),ys=p.map(x=>x[1]);return{x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)}}}
function moveVector(v,dx,dy){if(v.type==='rect'){v.x+=dx;v.y+=dy}else if(v.type==='ellipse'){v.cx+=dx;v.cy+=dy}else if(v.points)v.points=v.points.map(p=>[p[0]+dx,p[1]+dy])}
function resizeVector(v,nw,nh){const b=vbox(v),sx=Math.max(.01,nw/Math.max(1,b.w)),sy=Math.max(.01,nh/Math.max(1,b.h));if(v.type==='rect'){v.w=nw;v.h=nh}else if(v.type==='ellipse'){v.rx=nw/2;v.ry=nh/2;v.cx=b.x+nw/2;v.cy=b.y+nh/2}else if(v.points)v.points=v.points.map(p=>[b.x+(p[0]-b.x)*sx,b.y+(p[1]-b.y)*sy])}
window.v138Geometry=function(prop,value){value=Number(value);if(!Number.isFinite(value))return;const s=selection();for(const o of s.objects.filter(x=>!x.locked)){if(prop==='w'||prop==='h')o[prop]=Math.max(20,value);else o[prop]=value}for(const v of s.vectors.filter(x=>!x.locked)){const b=vbox(v);if(prop==='x')moveVector(v,value-b.x,0);else if(prop==='y')moveVector(v,0,value-b.y);else if(prop==='w')resizeVector(v,Math.max(20,value),b.h);else if(prop==='h')resizeVector(v,b.w,Math.max(20,value));else if(prop==='rotation')v.rotation=value}commit()};
window.v138Align=function(mode){const s=selection(),items=[...s.objects.filter(x=>!x.locked).map(ref=>({ref,kind:'o',b:{x:ref.x,y:ref.y,w:ref.w,h:ref.h}})),...s.vectors.filter(x=>!x.locked).map(ref=>({ref,kind:'v',b:vbox(ref)}))];if(!items.length)return window.cuteToast?.('Wähle zuerst Elemente ♡');const multi=items.length>1,minX=Math.min(...items.map(x=>x.b.x)),maxX=Math.max(...items.map(x=>x.b.x+x.b.w)),minY=Math.min(...items.map(x=>x.b.y)),maxY=Math.max(...items.map(x=>x.b.y+x.b.h)),cx=(minX+maxX)/2,cy=(minY+maxY)/2,W=canvasPageWidth(),H=canvasPageHeight();for(const x of items){let dx=0,dy=0;if(mode==='left')dx=(multi?minX:0)-x.b.x;if(mode==='centerX')dx=(multi?cx:W/2)-(x.b.x+x.b.w/2);if(mode==='right')dx=(multi?maxX:W)-(x.b.x+x.b.w);if(mode==='top')dy=(multi?minY:0)-x.b.y;if(mode==='centerY')dy=(multi?cy:H/2)-(x.b.y+x.b.h/2);if(mode==='bottom')dy=(multi?maxY:H)-(x.b.y+x.b.h);x.kind==='o'?(x.ref.x+=dx,x.ref.y+=dy):moveVector(x.ref,dx,dy)}commit('Ausgerichtet ♡')};
window.v138Distribute=function(axis){const s=selection(),items=[...s.objects.filter(x=>!x.locked).map(ref=>({ref,kind:'o',b:{x:ref.x,y:ref.y,w:ref.w,h:ref.h}})),...s.vectors.filter(x=>!x.locked).map(ref=>({ref,kind:'v',b:vbox(ref)}))];if(items.length<3)return window.cuteToast?.('Wähle mindestens 3 Elemente ♡');const horizontal=axis==='x';items.sort((a,b)=>(horizontal?a.b.x:a.b.y)-(horizontal?b.b.x:b.b.y));const start=horizontal?items[0].b.x:items[0].b.y,end=horizontal?items.at(-1).b.x+items.at(-1).b.w:items.at(-1).b.y+items.at(-1).b.h,total=items.reduce((n,x)=>n+(horizontal?x.b.w:x.b.h),0),gap=(end-start-total)/(items.length-1);let cursor=start;for(const x of items){const delta=cursor-(horizontal?x.b.x:x.b.y);x.kind==='o'?(horizontal?x.ref.x+=delta:x.ref.y+=delta):moveVector(x.ref,horizontal?delta:0,horizontal?0:delta);cursor+=(horizontal?x.b.w:x.b.h)+gap}commit('Gleichmäßig verteilt ♡')};
function decorateInspector(){const host=q('#canvasInspector'),wrap=q('.v137Inspector',host),s=selection(),first=s.objects[0]||s.vectors[0];if(!wrap||!first)return;wrap.querySelector('.v138GeometrySection')?.remove();const appearance=wrap.querySelector('.v137AppearanceGrid');if(appearance&&!wrap.querySelector('.v138TransparentActions'))appearance.insertAdjacentHTML('afterend','<div class="v138TransparentActions"><button onclick="v137Appearance(\'fill\',\'transparent\')">Keine Füllung</button><button onclick="v137Appearance(\'stroke\',\'transparent\')">Keine Kontur</button></div>');const b=s.objects[0]?{x:first.x,y:first.y,w:first.w,h:first.h}:vbox(first),rot=first.rotation||0,sec=document.createElement('section');sec.className='v137InspectorSection v138GeometrySection';sec.innerHTML=`<div class="v137InspectorHead"><b>Größe & Drehung</b><span>Direkt eingeben</span></div><div class="v138GeometryGrid"><label>X<input type="number" value="${Math.round(b.x)}" onchange="v138Geometry('x',this.value)"></label><label>Y<input type="number" value="${Math.round(b.y)}" onchange="v138Geometry('y',this.value)"></label><label>Breite<input type="number" min="20" value="${Math.round(b.w)}" onchange="v138Geometry('w',this.value)"></label><label>Höhe<input type="number" min="20" value="${Math.round(b.h)}" onchange="v138Geometry('h',this.value)"></label><label>Drehung<input type="number" value="${Math.round(rot)}" onchange="v138Geometry('rotation',this.value)"></label></div>`;wrap.appendChild(sec);const arrange=wrap.querySelector('.v137ArrangeGrid');if(arrange&&!wrap.querySelector('.v138ArrangeExtras'))arrange.insertAdjacentHTML('afterend','<div class="v138ArrangeExtras"><button onclick="v138Distribute(\'x\')">Horizontal verteilen</button><button onclick="v138Distribute(\'y\')">Vertikal verteilen</button></div>');qa('.v137ArrangeGrid button',wrap).forEach((b,i)=>b.setAttribute('onclick',`v138Align('${['left','centerX','right','top','centerY','bottom'][i]}')`))}

/* Group button toggles. Delete and Properties exist on both desktop and mobile. */
function preserveSelection(s){canvasState.selectedIds=[...s.ids];canvasState.selectedVectorIds=[...s.vids];canvasState.selectedType=s.ids.length?'object':s.vids.length?'vector':null;canvasState.selectedId=s.ids.at(-1)||s.vids.at(-1)||null;canvasState.multiMode=false}
window.v138GroupOnly=function(){const s=selection(),all=[...s.objects,...s.vectors];if(all.length<2)return window.cuteToast?.('Wähle mindestens 2 Elemente ♡');const gid='grp-v138-'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);all.forEach(x=>x.groupId=gid);preserveSelection(s);commit('Gruppiert ♡');return gid};
window.v138UngroupOnly=function(){const s=selection(),all=[...s.objects,...s.vectors],gids=new Set(all.map(x=>x.groupId).filter(Boolean));if(!gids.size)return window.cuteToast?.('Diese Auswahl ist nicht gruppiert');[...canvasState.objects,...canvasState.vectors].forEach(x=>{if(gids.has(x.groupId))x.groupId=''});preserveSelection(s);commit('Gruppierung gelöst ♡')};
window.v138ToggleGroup=function(){const s=selection(),all=[...s.objects,...s.vectors],gid=all[0]?.groupId;if(gid&&all.length&&all.every(x=>x.groupId===gid))v138UngroupOnly();else v138GroupOnly();requestAnimationFrame(()=>{window.v132SyncHits?.();decorateTransformHandles()})};
function toolButton(cls,title,html,action){const b=document.createElement('button');b.className=cls;b.title=title;b.setAttribute('aria-label',title);b.innerHTML=html;b.setAttribute('onclick',action);return b}
function enhanceSelectionBars(){for(const bar of [q('.v132SelectionBar'),q('#mobileSelectionTools')].filter(Boolean)){const group=bar.querySelector('button[title="Gruppieren"],button[aria-label="Gruppieren"],button[title="Gruppierung lösen"]');if(group){group.title='Gruppieren / Entgruppieren';group.setAttribute('aria-label','Gruppieren / Entgruppieren');group.setAttribute('onclick','v138ToggleGroup()')}if(!bar.querySelector('.v138Properties'))bar.appendChild(toolButton('v138Properties','Eigenschaften',icons.sliders,'v138OpenProperties()'));if(!bar.querySelector('.v138Delete'))bar.appendChild(toolButton('v138Delete','Löschen',icons.trash,'deleteSelectedCanvasItem();requestAnimationFrame(v132SyncHits)'))}}

/* Reliable whole-object text formatting on phones; editing a highlighted range still uses the native editor. */
const textKinds=new Set(['text','block','task','merke','file']);
const baseFormatText=window.formatSelectedText;
function toggleDeco(o,name){o.style||={};const set=new Set(String(o.style.textDecoration||'').split(/\s+/).filter(x=>x&&x!=='none'));set.has(name)?set.delete(name):set.add(name);o.style.textDecoration=[...set].join(' ')||'none'}
function listText(o,ordered){const box=document.createElement('div');box.innerHTML=o.text||'';let lines=[...box.querySelectorAll('li')].map(x=>x.innerHTML);if(!lines.length)lines=(box.innerText||'Text').split(/\n+/).map(x=>esc(x.trim())).filter(Boolean);const tag=ordered?'ol':'ul';o.text=`<${tag}>${lines.map(x=>`<li>${x}</li>`).join('')}</${tag}>`}
window.formatSelectedText=function(cmd){const s=selection(),targets=s.objects.filter(o=>textKinds.has(o.kind)),el=q(`.cobj[data-id="${CSS.escape(canvasState.selectedId||'')}"]`);if(el?.isContentEditable)return baseFormatText.apply(this,arguments);if(!targets.length)return;targets.forEach(o=>{o.style||={};if(cmd==='bold')o.style.fontWeight=String(o.style.fontWeight)==='700'?'400':'700';else if(cmd==='italic')o.style.fontStyle=o.style.fontStyle==='italic'?'normal':'italic';else if(cmd==='underline')toggleDeco(o,'underline');else if(cmd==='strikeThrough')toggleDeco(o,'line-through');else if(cmd==='insertUnorderedList')listText(o,false);else if(cmd==='insertOrderedList')listText(o,true)});commit()};
try{formatSelectedText=window.formatSelectedText}catch(_){}

function objectToolsHTML(){
 const s=selection(),o=s.objects[0],v=s.vectors[0],first=o||v;if(!first)return '<div class="v138ObjectTools">Keine Auswahl.</div>';
 const b=o?{x:o.x,y:o.y,w:o.w,h:o.h}:vbox(v),style=o?.style||{},fill=v?.fill||o?.cellBackground||style.background||'#ffffff',stroke=v?.stroke||o?.borderColor||style.borderColor||'#8d7369',sw=v?.strokeWidth||o?.borderWidth||style.borderWidth||0,corner=v?(v.type==='rect'?v.rx:v.cornerRadius):o?.borderRadius||style.borderRadius||0,dash=v?.dash||o?.borderStyle||style.borderStyle||'solid',isText=o&&textKinds.has(o.kind);
 const textPanel=isText?`<section><h3>Text</h3><div class="v138TextActions"><button onclick="formatSelectedText('bold')"><b>B</b></button><button onclick="formatSelectedText('italic')"><i>I</i></button><button onclick="formatSelectedText('underline')"><u>U</u></button><button onclick="formatSelectedText('strikeThrough')"><s>S</s></button><button onclick="formatSelectedText('insertUnorderedList')">• Liste</button><button onclick="formatSelectedText('insertOrderedList')">1. Liste</button><button onclick="v137Text('textAlign','left')">Links</button><button onclick="v137Text('textAlign','center')">Mitte</button><button onclick="v137Text('textAlign','right')">Rechts</button><button onclick="v137Text('textAlign','justify')">Blocksatz</button></div><div class="v138ObjectGrid"><label>Schrift<select onchange="v137Text('fontFamily',this.value)"><option>Inter</option><option>Arial</option><option>Georgia</option><option>Trebuchet MS</option><option>Verdana</option><option>Times New Roman</option></select></label><label>Schriftfarbe<input type="color" value="${style.color||'#333333'}" onchange="v137Text('color',this.value)"></label><label>Schriftgröße<input type="number" min="6" max="180" value="${style.fontSize||16}" onchange="v137Text('fontSize',+this.value)"></label><label>Zeilenhöhe<input type="number" min=".8" max="3" step=".05" value="${style.lineHeight||1.25}" onchange="v137Text('lineHeight',+this.value)"></label><label>Buchstaben<input type="number" step=".5" value="${style.letterSpacing||0}" onchange="v137Text('letterSpacing',+this.value)"></label><label>Innenabstand<input type="number" value="${style.padding??7}" onchange="v137Text('padding',+this.value)"></label></div></section><section class="v138Effects"><h3>Effekte</h3><button class="v138EffectLink" onclick="openHyperlinkDialog()">${icons.link}Hyperlink</button></section>`:'';
 return `<div class="mobileDrawerHead"><div><span class="mobileDrawerKicker">AUSWAHL</span><b>Eigenschaften</b></div><button onclick="closeEditorDrawer?.()">×</button></div><div class="v138ObjectTools">${textPanel}<section><h3>Aussehen</h3><div class="v138ObjectGrid"><label>Füllfarbe<input type="color" value="${fill==='transparent'?'#ffffff':fill}" onchange="v137Appearance('fill',this.value)"></label><label>Kontur<input type="color" value="${stroke==='transparent'?'#8d7369':stroke}" onchange="v137Appearance('stroke',this.value)"></label><label>Konturstärke<input type="number" min="0" max="30" value="${sw}" onchange="v137Appearance('strokeWidth',this.value)"></label><label>Linienart<select onchange="v137Appearance('dash',this.value)"><option value="solid" ${dash==='solid'?'selected':''}>Durchgezogen</option><option value="dashed" ${dash==='dashed'?'selected':''}>Gestrichelt</option><option value="dotted" ${dash==='dotted'?'selected':''}>Gepunktet</option></select></label><label>Ecken rund<input type="number" min="0" max="100" value="${corner||0}" onchange="v137Appearance('corner',this.value)"></label></div><div class="v138TransparentActions"><button onclick="v137Appearance('fill','transparent')">Keine Füllung</button><button onclick="v137Appearance('stroke','transparent')">Keine Kontur</button></div></section><section><h3>Größe & Drehung</h3><div class="v138ObjectGrid"><label>X<input type="number" value="${Math.round(b.x)}" onchange="v138Geometry('x',this.value)"></label><label>Y<input type="number" value="${Math.round(b.y)}" onchange="v138Geometry('y',this.value)"></label><label>Breite<input type="number" value="${Math.round(b.w)}" onchange="v138Geometry('w',this.value)"></label><label>Höhe<input type="number" value="${Math.round(b.h)}" onchange="v138Geometry('h',this.value)"></label><label>Drehung<input type="number" value="${Math.round(first.rotation||0)}" onchange="v138Geometry('rotation',this.value)"></label></div></section><section><h3>Anordnen</h3><div class="v138ObjectActions">${[['left','Links'],['centerX','Mittig'],['right','Rechts'],['top','Oben'],['centerY','Mitte'],['bottom','Unten']].map(x=>`<button onclick="v138Align('${x[0]}')">${x[1]}</button>`).join('')}</div></section></div>`
}
window.v138OpenProperties=function(){const d=q('#canvasQuickDrawer');if(!d)return;d.classList.add('open');d.dataset.v137Mode='properties';d.innerHTML=objectToolsHTML()};

/* Hyperlink belongs to the compact Effects page, not as a floating drawer block. */
try{const baseMobileMode=mobileTextModeContentHTML;mobileTextModeContentHTML=function(kind){let out=baseMobileMode(kind);if(kind==='effects')out+=`<button class="v138EffectLink" onclick="openHyperlinkDialog()">${icons.link} Hyperlink</button>`;return out}}catch(_){}

/* Strict viewer stores edit locks and restores them exactly. */
let viewLocks=null;const baseView=window.v137SetViewMode;
window.v137SetViewMode=function(on){on=!!on;if(on&&!viewLocks){viewLocks=new Map([...canvasState.objects,...canvasState.vectors].map(x=>[x.id,!!x.locked]));[...canvasState.objects,...canvasState.vectors].forEach(x=>x.locked=true)}if(!on&&viewLocks){[...canvasState.objects,...canvasState.vectors].forEach(x=>{if(viewLocks.has(x.id))x.locked=viewLocks.get(x.id)});viewLocks=null}return baseView?.call(this,on)};
try{v137SetViewMode=window.v137SetViewMode}catch(_){}
document.addEventListener('keydown',e=>{if(!editor())return;const typing=e.target?.matches?.('input,textarea,select')||e.target?.isContentEditable;if(document.body.classList.contains('v137ViewMode')){if(e.key!=='Escape'){e.preventDefault();e.stopImmediatePropagation()}return}if(typing)return;const mod=e.ctrlKey||e.metaKey;if(mod&&e.key.toLowerCase()==='g'){e.preventDefault();e.stopImmediatePropagation();e.shiftKey?v138UngroupOnly():v138GroupOnly();requestAnimationFrame(()=>{window.v132SyncHits?.();decorateTransformHandles()})}},true);

/* Layer icons display the actual state: closed lock means locked. */
function correctLayerIcons(){for(const row of qa('[data-layer-kind][data-layer-id]')){const ref=row.dataset.layerKind==='object'?(canvasState.objects||[]).find(x=>x.id===row.dataset.layerId):(canvasState.vectors||[]).find(x=>x.id===row.dataset.layerId),b=row.querySelector('.v135LayerLock,.v130LayerTools button[title="Sperren"],.v130LayerTools button[title="Entsperren"]');if(!ref||!b)continue;b.innerHTML=window.v133Icon?.(ref.locked?'lock':'unlock')||'';b.title=ref.locked?'Entsperren':'Sperren';b.setAttribute('aria-label',b.title)}}

/* Today gets the requested version and one visual icon system. */
function polishToday(){const home=q('#view-home');if(!home)return;home.querySelector('.v138Version')?.remove();const eye=q('#headerEyebrow');if(eye&&eye.textContent!=='VERSION 138')eye.textContent='VERSION 138';const specs=[['Aufgabe','task'],['Test','test'],['Fächer','subjects'],['Lernen','learn']];qa('.homeMiniActions button',home).forEach((b,i)=>{const spec=specs[i];if(!spec||b.dataset.v138Today==='1')return;b.dataset.v138Today='1';b.classList.add('v138TodayAction');b.innerHTML=icons[spec[1]]+`<span>${spec[0]}</span>`})}
function watchVersion(){const eye=q('#headerEyebrow');if(!eye||eye.dataset.v138Watch==='1')return;eye.dataset.v138Watch='1';const enforce=()=>{if(!editor()&&eye.textContent!=='VERSION 138')eye.textContent='VERSION 138'};new MutationObserver(enforce).observe(eye,{childList:true,subtree:true,characterData:true});enforce()}

function cleanMobileDrawer(){qa('.v137MobileTextExtras,.v135MobileExtras').forEach(x=>x.remove())}
function reconcile(){if(!editor()){polishToday();return}compactNav();enhanceSelectionBars();decorateInspector();correctLayerIcons();cleanMobileDrawer();decorateTransformHandles();if(q('#canvasQuickDrawer.open'))ensureElementTools()}

const baseInspector=window.renderCanvasInspector;window.renderCanvasInspector=function(){const r=baseInspector.apply(this,arguments);decorateInspector();enhanceSelectionBars();return r};try{renderCanvasInspector=window.renderCanvasInspector}catch(_){}
const baseLayers=window.renderLayerList;window.renderLayerList=function(){const r=baseLayers.apply(this,arguments);correctLayerIcons();return r};try{renderLayerList=window.renderLayerList}catch(_){}
const baseObjects=window.renderCanvasObjects;window.renderCanvasObjects=function(){const r=baseObjects.apply(this,arguments);enhanceSelectionBars();requestAnimationFrame(decorateTransformHandles);return r};try{renderCanvasObjects=window.renderCanvasObjects}catch(_){}

let queued=false;const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;reconcile()})};
new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:['class']});
window.addEventListener('resize',()=>setTimeout(reconcile,120));
setTimeout(()=>{watchVersion();polishToday();reconcile()},1350);
})();
