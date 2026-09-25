
(function(){
'use strict';
const inEditor=()=>document.body.classList.contains('editorMode')&&!!document.querySelector('#view-sheet-editor.active');
const esc130=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

function roundedPolygonPath(points,radius){
  const pts=(points||[]).map(p=>[Number(p[0]),Number(p[1])]);
  if(pts.length<3||!(radius>0))return '';
  const cuts=pts.map((p,i)=>{
    const prev=pts[(i-1+pts.length)%pts.length],next=pts[(i+1)%pts.length];
    const lp=Math.hypot(prev[0]-p[0],prev[1]-p[1])||1,ln=Math.hypot(next[0]-p[0],next[1]-p[1])||1;
    const d=Math.min(Number(radius)||0,lp*.42,ln*.42);
    return {p,a:[p[0]+(prev[0]-p[0])*d/lp,p[1]+(prev[1]-p[1])*d/lp],b:[p[0]+(next[0]-p[0])*d/ln,p[1]+(next[1]-p[1])*d/ln]};
  });
  let d=`M ${cuts[0].a[0]} ${cuts[0].a[1]} Q ${cuts[0].p[0]} ${cuts[0].p[1]} ${cuts[0].b[0]} ${cuts[0].b[1]}`;
  for(let i=1;i<cuts.length;i++)d+=` L ${cuts[i].a[0]} ${cuts[i].a[1]} Q ${cuts[i].p[0]} ${cuts[i].p[1]} ${cuts[i].b[0]} ${cuts[i].b[1]}`;
  return d+' Z';
}
function starPoints(cx=397,cy=405,outer=125,inner=58,count=5){
  const out=[];for(let i=0;i<count*2;i++){const a=-Math.PI/2+i*Math.PI/count,r=i%2?inner:outer;out.push([cx+Math.cos(a)*r,cy+Math.sin(a)*r])}return out;
}
window.addRoundedStar=function(){
  addVectorShape('triangle');
  const v=canvasState.vectors.at(-1);if(!v)return;
  v.points=starPoints();v.shapeKind='star';v.layerLabel='Stern';v.cornerRadius=12;
  renderVectors();renderCanvasInspector();markCanvasDirty();pushHistory();
};
const baseAddVector=window.addVectorShape;
window.addVectorShape=function(type){
  if(type==='star')return addRoundedStar();
  const r=baseAddVector.apply(this,arguments),v=canvasState?.vectors?.at(-1);
  if(v&&type==='triangle'&&v.cornerRadius==null)v.cornerRadius=0;
  return r;
};
try{addVectorShape=window.addVectorShape}catch(_){}

function polishRoundedVectors(){
  if(!window.canvasState)return;
  for(const v of canvasState.vectors||[]){
    if(v.type!=='triangle'||!(v.cornerRadius>0))continue;
    const wrap=document.querySelector(`#canvasObjects .vectorObj[data-vector-wrap="${CSS.escape(v.id)}"]`),poly=wrap?.querySelector('polygon.shapeVisible');
    if(!poly||wrap.querySelector('.v130RoundedShape'))continue;
    const path=document.createElementNS('http://www.w3.org/2000/svg','path');
    [...poly.attributes].forEach(a=>{if(!['points','class','style'].includes(a.name))path.setAttribute(a.name,a.value)});
    path.setAttribute('d',roundedPolygonPath(v.points,v.cornerRadius));path.setAttribute('class','v130RoundedShape');path.setAttribute('style','pointer-events:none');
    poly.classList.add('v130SharpFallback');poly.after(path);
  }
  document.querySelectorAll('#canvasObjects .tableObj').forEach(el=>{const o=canvasState.objects?.find(x=>x.id===el.dataset.id);if(o?.kind==='table')el.style.setProperty('--v130-table-radius',(o.borderRadius??12)+'px')});
}
const priorVectors=window.renderVectors;
window.renderVectors=function(){const r=priorVectors.apply(this,arguments);polishRoundedVectors();requestAnimationFrame(polishRoundedVectors);return r};
try{renderVectors=window.renderVectors}catch(_){}

window.v130SetCornerRadius=function(value){
  const v=canvasState?.vectors?.find(x=>x.id===canvasState.selectedId);if(!v||v.type!=='triangle')return;
  v.cornerRadius=Math.max(0,Math.min(100,Number(value)||0));renderVectors();renderCanvasInspector();markCanvasDirty();pushHistory();
};
function transparentAction(input){
  const code=input.getAttribute('onchange')||'';if(!code)return;
  try{Function('event',code.replace(/this\.value/g,"'transparent'")).call(input,new Event('change'))}catch(_){return}
  try{cuteToast('Durchsichtig gewählt ♡')}catch(_){}
}
window.v130Transparent=function(btn){const input=btn.parentElement?.querySelector('input[type="color"]');if(input)transparentAction(input)};
function addTransparentChoices(root=document){
  root.querySelectorAll?.('body.editorMode #canvasInspector input[type="color"],body.editorMode #canvasQuickDrawer input[type="color"],body.editorMode .canvasRibbon input[type="color"],body.editorMode #desktopEditorSidebar input[type="color"]').forEach(input=>{
    if(input.dataset.v130Transparent)return;input.dataset.v130Transparent='1';
    const parent=input.parentElement;if(!parent)return;
    if(parent.classList.contains('v130TransparentWrap'))return;
    const wrap=document.createElement('span');wrap.className='v130TransparentWrap';parent.insertBefore(wrap,input);wrap.appendChild(input);
    const btn=document.createElement('button');btn.type='button';btn.className='v130TransparentBtn';btn.title='Keine Farbe / durchsichtig';btn.setAttribute('aria-label','Keine Farbe oder durchsichtig');btn.onclick=()=>v130Transparent(btn);wrap.appendChild(btn);
  });
}
function enhanceInspector(){
  const v=canvasState?.selectedType==='vector'?canvasState.vectors.find(x=>x.id===canvasState.selectedId):null,controls=document.querySelector('#canvasInspector .vectorControls');
  if(v?.type==='triangle'&&controls){
    const numberCtl=controls.querySelector('.v102CornerCtl'),rangeCtl=controls.querySelector('.v103RoundCtl');
    if(numberCtl&&rangeCtl)numberCtl.remove();
    const existing=rangeCtl||numberCtl;
    if(existing){const label=existing.querySelector('label');if(label)label.textContent=v.shapeKind==='star'?'Sternspitzen runden':'Dreieck-Ecken runden'}
  }
  if(v?.type==='triangle'&&controls&&!controls.querySelector('.v102CornerCtl,.v103RoundCtl,.v130CornerControl')){
    const box=document.createElement('div');box.className='v130CornerControl';
    box.innerHTML=`<label>${v.shapeKind==='star'?'Sternspitzen':'Dreieck-Ecken'} runden · ${Math.round(v.cornerRadius||0)} px</label><input type="range" min="0" max="80" step="1" value="${Number(v.cornerRadius)||0}" oninput="v130SetCornerRadius(+this.value)">`;
    const full=controls.querySelector('.full');controls.insertBefore(box,full||null);
  }
  addTransparentChoices(document);
}
const priorInspector=window.renderCanvasInspector;
window.renderCanvasInspector=function(){const r=priorInspector.apply(this,arguments);enhanceInspector();return r};
try{renderCanvasInspector=window.renderCanvasInspector}catch(_){}

function addStarButton(){
  document.querySelectorAll('#canvasQuickDrawer .mobileToolGrid,#canvasQuickDrawer .v102PaletteGrid,#canvasQuickDrawer .v113PaletteGrid').forEach(grid=>{
    if(grid.querySelector('.v130StarButton'))return;
    const triangle=[...grid.querySelectorAll('button')].find(b=>/Dreieck/i.test(b.textContent||''));if(!triangle)return;
    const b=document.createElement('button');b.className='v130StarButton';b.innerHTML=grid.classList.contains('mobileToolGrid')?'<b>☆</b><span>Stern</span>':'<b>☆</b><span>Stern</span>';b.onclick=()=>addRoundedStar();triangle.after(b);
  });
}

let layerDrag=null,nativeLayer=null;
function rows(){return [...document.querySelectorAll('.v130LayerRow')]}
function clearDrops(){rows().forEach(x=>x.classList.remove('drop-before','drop-after'))}
function reorder(source,target,after){
  let all=layerEntries();const from=all.findIndex(x=>x.kind===source.kind&&x.id===source.id);if(from<0)return;
  const [item]=all.splice(from,1),at=all.findIndex(x=>x.kind===target.kind&&x.id===target.id);if(at<0)return;
  all.splice(at+(after?1:0),0,item);const n=all.length;
  all.forEach((x,i)=>{const ref=layerItemRef(x.kind,x.id);if(ref)ref.z=(n-i)*10});
  renderCanvasObjects();renderVectors();renderLayerList();markCanvasDirty();pushHistory();
}
function dropTarget(x,y,source){
  const row=document.elementFromPoint(x,y)?.closest?.('.v130LayerRow');if(!row||row.dataset.layerId===source.id&&row.dataset.layerKind===source.kind)return null;
  const rect=row.getBoundingClientRect(),after=y>rect.top+rect.height/2;return {row,after,kind:row.dataset.layerKind,id:row.dataset.layerId};
}
window.v130LayerPointerStart=function(e,kind,id){
  if(e.pointerType==='mouse'&&e.button!==0)return;e.preventDefault();e.stopPropagation();
  layerDrag={pid:e.pointerId,source:{kind,id},target:null};document.body.classList.add('layerDragging');try{e.currentTarget.setPointerCapture(e.pointerId)}catch(_){}
  const move=ev=>{if(!layerDrag||ev.pointerId!==layerDrag.pid)return;ev.preventDefault();clearDrops();const t=dropTarget(ev.clientX,ev.clientY,layerDrag.source);layerDrag.target=t;if(t)t.row.classList.add(t.after?'drop-after':'drop-before');const list=t?.row.closest('.mobileLayerList,#layerList');if(list){const r=list.getBoundingClientRect();if(ev.clientY<r.top+34)list.scrollTop-=12;else if(ev.clientY>r.bottom-34)list.scrollTop+=12}};
  const end=ev=>{if(!layerDrag||ev.pointerId!==layerDrag.pid)return;window.removeEventListener('pointermove',move,true);window.removeEventListener('pointerup',end,true);window.removeEventListener('pointercancel',end,true);const d=layerDrag;layerDrag=null;document.body.classList.remove('layerDragging');clearDrops();if(d.target)reorder(d.source,d.target,d.target.after)};
  window.addEventListener('pointermove',move,{capture:true,passive:false});window.addEventListener('pointerup',end,true);window.addEventListener('pointercancel',end,true);
};
window.v130NativeStart=function(e,kind,id){nativeLayer={kind,id};e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',kind+':'+id)};
window.v130NativeOver=function(e){if(!nativeLayer)return;e.preventDefault();clearDrops();const row=e.currentTarget,r=row.getBoundingClientRect(),after=e.clientY>r.top+r.height/2;row.classList.add(after?'drop-after':'drop-before');row.dataset.v130After=after?'1':'0'};
window.v130NativeDrop=function(e,kind,id){e.preventDefault();if(nativeLayer)reorder(nativeLayer,{kind,id},e.currentTarget.dataset.v130After==='1');nativeLayer=null;clearDrops()};
function layerMarkup(){
  const all=layerEntries();if(!all.length)return '<div class="small">Noch keine Elemente.</div>';
  return `<div class="v130LayerList">${all.map(a=>`<div class="v130LayerRow ${canvasState.selectedType===a.kind&&canvasState.selectedId===a.id?'active':''}" data-layer-kind="${a.kind}" data-layer-id="${a.id}" draggable="true" ondragstart="v130NativeStart(event,'${a.kind}','${a.id}')" ondragover="v130NativeOver(event)" ondragleave="this.classList.remove('drop-before','drop-after')" ondrop="v130NativeDrop(event,'${a.kind}','${a.id}')"><button class="v130LayerHandle" title="Ziehen zum Sortieren" aria-label="Ebene ziehen" onpointerdown="v130LayerPointerStart(event,'${a.kind}','${a.id}')">⠿</button><button class="v130LayerTitle" title="${esc130(a.name)}" onclick="${a.kind==='object'?`selectCanvasObject('${a.id}')`:`selectVector('${a.id}')`}">${a.locked?'🔒 ':''}${esc130(a.name)}</button><div class="v130LayerTools"><button title="Umbenennen" onclick="event.stopPropagation();renameLayerItem('${a.kind}','${a.id}')">✎</button><button title="${a.locked?'Entsperren':'Sperren'}" onclick="event.stopPropagation();${a.kind==='object'?`selectCanvasObject('${a.id}')`:`selectVector('${a.id}')`};toggleSelectedLock()">${a.locked?'🔓':'🔒'}</button><button class="danger" title="Löschen" onclick="event.stopPropagation();deleteLayerItem('${a.kind}','${a.id}')">×</button></div></div>`).join('')}</div>`;
}
window.renderLayerList=function(){const html=layerMarkup(),el=document.getElementById('layerList');if(el)el.innerHTML=html;const mobile=document.querySelector('#canvasQuickDrawer.open .mobileLayerList');if(mobile)mobile.innerHTML=html};
try{renderLayerList=window.renderLayerList}catch(_){}

const priorOpen=window.editorOpenGroup;
window.editorOpenGroup=function(){if(innerWidth>=900)openEditorGroup=null;const r=priorOpen.apply(this,arguments);requestAnimationFrame(()=>{addStarButton();enhanceInspector();if(arguments[0]==='layers')renderLayerList()});return r};
try{editorOpenGroup=window.editorOpenGroup}catch(_){}
const observer=new MutationObserver(()=>requestAnimationFrame(()=>{if(innerWidth>=900&&window.__STUDIA_V180_DESKTOP__)return;if(!inEditor())return;addStarButton();addTransparentChoices(document);polishRoundedVectors()}));
observer.observe(document.body,{subtree:true,childList:true});
setTimeout(()=>{if(inEditor()){renderVectors();renderLayerList();enhanceInspector();addStarButton()}const e=document.getElementById('headerEyebrow');if(e)e.textContent='VERSION 202';document.title='Studia'},650);
})();
