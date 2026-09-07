/* v135.js consolidated */
/* Studia V135 - stable selection, Word/Canva tools, cloud-ready accounts and cute assets */
(function(){
'use strict';
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
const clone=x=>JSON.parse(JSON.stringify(x));
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const icon=n=>window.v133Icon?.(n)||'';
const editor=()=>document.body.classList.contains('editorMode')&&!!q('#view-sheet-editor.active');
const desktop=()=>innerWidth>=900&&editor();
const selectedIds=()=>[...new Set([...(canvasState.selectedIds||[]),...(canvasState.selectedType==='object'&&canvasState.selectedId?[canvasState.selectedId]:[])])];
const selectedVids=()=>[...new Set([...(canvasState.selectedVectorIds||[]),...(canvasState.selectedType==='vector'&&canvasState.selectedId?[canvasState.selectedId]:[])])];
const expandedSelection=()=>{const ids=selectedIds(),vids=selectedVids(),gids=new Set([...canvasState.objects.filter(x=>ids.includes(x.id)&&x.groupId).map(x=>x.groupId),...canvasState.vectors.filter(x=>vids.includes(x.id)&&x.groupId).map(x=>x.groupId)]);if(gids.size){canvasState.objects.filter(x=>gids.has(x.groupId)).forEach(x=>ids.push(x.id));canvasState.vectors.filter(x=>gids.has(x.groupId)).forEach(x=>vids.push(x.id))}return{ids:[...new Set(ids)],vids:[...new Set(vids)]}};
const commit=(message='')=>{renderCanvasObjects();renderCanvasInspector();markCanvasDirty();pushHistory();if(message)cuteToast?.(message)};

function syncMulti(ids,vids){canvasState.selectedIds=ids;canvasState.selectedVectorIds=vids;canvasState.selectedType=ids.length?'object':vids.length?'vector':null;canvasState.selectedId=ids.at(-1)||vids.at(-1)||null;canvasState.multiMode=false;if(ids.length+vids.length>1)window.v132ToggleMulti?.();else{renderCanvasObjects();renderCanvasInspector()}}

const baseGroup=window.groupSelectedItems;
window.groupSelectedItems=function(){const gid=baseGroup?.apply(this,arguments);if(gid){const ids=canvasState.objects.filter(x=>x.groupId===gid).map(x=>x.id),vids=canvasState.vectors.filter(x=>x.groupId===gid).map(x=>x.id);syncMulti(ids,vids)}return gid};
const baseUngroup=window.ungroupSelectedItems;
window.ungroupSelectedItems=function(){const r=baseUngroup?.apply(this,arguments);const ids=selectedIds(),vids=selectedVids();syncMulti(ids,vids);return r};
window.selectAllCanvasItems=function(){syncMulti(canvasState.objects.map(x=>x.id),canvasState.vectors.map(x=>x.id));cuteToast?.('Alles ausgewählt ♡')};
window.duplicateSelected=function(){const {ids,vids}=expandedSelection();if(!ids.length&&!vids.length)return cuteToast?.('Wähle zuerst etwas aus ♡');const newIds=[],newVids=[],groupMap=new Map();let z=typeof nextCanvasZ==='function'?nextCanvasZ():100;const remapGroup=g=>{if(!g)return null;if(!groupMap.has(g))groupMap.set(g,'grp_'+Date.now().toString(36)+'_'+groupMap.size);return groupMap.get(g)};for(const src of canvasState.objects.filter(x=>ids.includes(x.id))){const o=clone(src);o.id=id();o.x+=18;o.y+=18;o.z=z++;o.locked=false;o.editing=false;if(o.groupId)o.groupId=remapGroup(o.groupId);canvasState.objects.push(o);newIds.push(o.id)}for(const src of canvasState.vectors.filter(x=>vids.includes(x.id))){const v=clone(src);v.id=id();v.z=z++;v.locked=false;if(v.groupId)v.groupId=remapGroup(v.groupId);if(v.x!=null){v.x+=18;v.y+=18}if(v.cx!=null){v.cx+=18;v.cy+=18}if(v.points)v.points=v.points.map(p=>[p[0]+18,p[1]+18]);canvasState.vectors.push(v);newVids.push(v.id)}syncMulti(newIds,newVids);markCanvasDirty();pushHistory();cuteToast?.('Dupliziert ♡')};

window.v135Align=function(mode){const sel=expandedSelection(),os=canvasState.objects.filter(x=>sel.ids.includes(x.id)&&!x.locked),vs=canvasState.vectors.filter(x=>sel.vids.includes(x.id)&&!x.locked);const box=v=>vectorBounds(v),items=[...os.map(ref=>({ref,kind:'o',b:{x:ref.x,y:ref.y,w:ref.w,h:ref.h}})),...vs.map(ref=>({ref,kind:'v',b:box(ref)}))];if(!items.length)return cuteToast?.('Wähle zuerst Elemente ♡');const minX=Math.min(...items.map(x=>x.b.x)),maxX=Math.max(...items.map(x=>x.b.x+x.b.w)),minY=Math.min(...items.map(x=>x.b.y)),maxY=Math.max(...items.map(x=>x.b.y+x.b.h)),cx=(minX+maxX)/2,cy=(minY+maxY)/2,W=canvasPageWidth(),H=canvasPageHeight();for(const x of items){let dx=0,dy=0;if(mode==='left')dx=(items.length>1?minX:0)-x.b.x;if(mode==='centerX')dx=(items.length>1?cx:W/2)-(x.b.x+x.b.w/2);if(mode==='right')dx=(items.length>1?maxX:W)-(x.b.x+x.b.w);if(mode==='top')dy=(items.length>1?minY:0)-x.b.y;if(mode==='centerY')dy=(items.length>1?cy:H/2)-(x.b.y+x.b.h/2);if(mode==='bottom')dy=(items.length>1?maxY:H)-(x.b.y+x.b.h);if(x.kind==='o'){x.ref.x+=dx;x.ref.y+=dy}else if(x.ref.type==='rect'){x.ref.x+=dx;x.ref.y+=dy}else if(x.ref.type==='ellipse'){x.ref.cx+=dx;x.ref.cy+=dy}else if(x.ref.points)x.ref.points=x.ref.points.map(p=>[p[0]+dx,p[1]+dy])}commit('Ausgerichtet ♡')};

window.v135ToggleStrike=function(){const o=canvasState.objects.find(x=>x.id===canvasState.selectedId);if(!o||!['text','block','task','merke'].includes(o.kind))return cuteToast?.('Wähle zuerst einen Text ♡');o.style||={};const set=new Set(String(o.style.textDecoration||'').split(/\s+/).filter(x=>x&&x!=='none'));set.has('line-through')?set.delete('line-through'):set.add('line-through');o.style.textDecoration=[...set].join(' ')||'none';commit()};
window.v135ToggleUnderline=function(){const o=canvasState.objects.find(x=>x.id===canvasState.selectedId);if(!o||!['text','block','task','merke'].includes(o.kind))return cuteToast?.('Wähle zuerst einen Text ♡');o.style||={};const set=new Set(String(o.style.textDecoration||'').split(/\s+/).filter(x=>x&&x!=='none'));set.has('underline')?set.delete('underline'):set.add('underline');o.style.textDecoration=[...set].join(' ')||'none';commit()};

window.v135ToggleMargins=function(on){canvasState.pageStyle||={};canvasState.pageStyle.showMargin=!!on;applyCanvasPageStyle();markCanvasDirty();pushHistory()};

const oldVectorEl=typeof vectorEl==='function'?vectorEl:null;
if(oldVectorEl)vectorEl=function(v){let html=oldVectorEl(v);const dash=v.dash==='solid'?'':v.dash==='dotted'?`${Math.max(1,+v.dashLength||2)} ${Math.max(1,+v.dashGap||6)}`:`${Math.max(1,+v.dashLength||10)} ${Math.max(1,+v.dashGap||7)}`;return html.replace(/stroke-dasharray="[^"]*"/g,`stroke-dasharray="${dash}"`)};
window.v135Stroke=function(prop,value){const ids=selectedIds(),vids=selectedVids();for(const o of canvasState.objects.filter(x=>ids.includes(x.id))){if(o.kind==='table'){if(prop==='dash'){o.dash=value;o.borderStyle=value==='custom'?'dashed':value}else o[prop]=value}else{o.style||={};if(prop==='dash'){o.style.dash=value;o.style.borderStyle=value==='custom'?'dashed':value}else o.style[prop]=value}}for(const v of canvasState.vectors.filter(x=>vids.includes(x.id))){if(prop==='borderColor')v.stroke=value;else if(prop==='borderWidth')v.strokeWidth=value;else v[prop]=value}commit()};

function linkSVG(){return '<svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.2M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.2-1.2"/></svg>'}
window.openHyperlinkDialog=function(editId=''){const old=canvasState.objects.find(x=>x.id===(editId||canvasState.selectedId)),sheets=(data.studySheets||[]).filter(x=>x.id!==selectedSheetId);openModal(`<div class="v135Modal"><div class="v135ModalHead"><div><span class="eyebrow">VERLINKEN</span><h2>Hyperlink einfügen</h2></div><button onclick="closeModal()">×</button></div><p>Verlinke eine Webseite oder springe direkt zu einem deiner Lernblätter.</p><div class="v135FormGrid"><label class="full">Anzeigetext<input id="v135LinkText" value="${esc(old?.text?.replace(/<[^>]*>/g,'')||'Lernlink')}"></label><label>Web-Adresse<input id="v135LinkUrl" type="url" placeholder="https://…" value="${esc(old?.linkUrl||'')}"></label><label>Lernblatt<select id="v135LinkSheet"><option value="">Keines</option>${sheets.map(x=>`<option value="${x.id}" ${old?.linkSheetId===x.id?'selected':''}>${esc(x.title)}</option>`).join('')}</select></label></div><div class="v135ActionRow"><button onclick="closeModal()">Abbrechen</button><button class="primary" onclick="v135SaveLink('${old?.id||''}')">Link speichern</button></div></div>`)};
window.v135SaveLink=function(editId=''){let o=canvasState.objects.find(x=>x.id===editId);if(!o||!['text','block','task','merke'].includes(o.kind)){o=newCanvasObject('body');o.x=110;o.y=150;o.w=330;o.h=54;canvasState.objects.push(o)}o.text=esc(q('#v135LinkText')?.value||'Lernlink');o.linkUrl=String(q('#v135LinkUrl')?.value||'').trim();o.linkSheetId=q('#v135LinkSheet')?.value||'';o.style||={};o.style.color='#8f5f91';o.style.textDecoration='underline';closeModal();canvasState.selectedType='object';canvasState.selectedId=o.id;canvasState.selectedIds=[o.id];canvasState.selectedVectorIds=[];commit('Link eingefügt ♡')};
window.v135OpenLink=function(idv){const o=canvasState.objects.find(x=>x.id===idv);if(!o)return;if(o.linkSheetId){saveCanvasSheet?.();openStudySheetEditor(o.linkSheetId);return}if(o.linkUrl){let url=o.linkUrl;if(!/^https?:\/\//i.test(url))url='https://'+url;window.open(url,'_blank','noopener')}};

function palette(n=6){const p=['#f09aa5','#efc4a6','#bad6a2','#9ccfd2','#b7a6d9','#f1d783','#d6a6bd','#8fb5dc'];return Array.from({length:n},(_,i)=>p[i%p.length])}
window.openChartDialog=function(editId=''){const o=canvasState.objects.find(x=>x.id===editId),c=o?.chart||{};openModal(`<div class="v135Modal"><div class="v135ModalHead"><div><span class="eyebrow">DIAGRAMME</span><h2>${o?'Diagramm bearbeiten':'Diagramm erstellen'}</h2></div><button onclick="closeModal()">×</button></div><div class="v135FormGrid"><label>Art<select id="v135ChartType"><option value="bar">Säulen</option><option value="hbar" ${c.type==='hbar'?'selected':''}>Balken</option><option value="line" ${c.type==='line'?'selected':''}>Linie</option><option value="area" ${c.type==='area'?'selected':''}>Fläche</option><option value="pie" ${c.type==='pie'?'selected':''}>Kreis</option><option value="donut" ${c.type==='donut'?'selected':''}>Ring</option></select></label><label>Titel<input id="v135ChartTitle" value="${esc(c.title||'Mein Diagramm')}"></label><label class="full">Beschriftungen, mit Komma getrennt<input id="v135ChartLabels" value="${esc((c.labels||['A','B','C','D']).join(', '))}"></label><label class="full">Werte, mit Komma getrennt<input id="v135ChartValues" value="${esc((c.values||[8,14,11,17]).join(', '))}"></label><label class="full">Farben<input id="v135ChartColors" value="${esc((c.colors||palette(4)).join(', '))}"></label></div><div class="v135ActionRow"><button onclick="closeModal()">Abbrechen</button><button class="primary" onclick="v135SaveChart('${o?.id||''}')">Diagramm einfügen</button></div></div>`)};
window.v135SaveChart=function(editId=''){const labels=String(q('#v135ChartLabels')?.value||'A,B,C').split(',').map(x=>x.trim()).filter(Boolean),values=String(q('#v135ChartValues')?.value||'1,2,3').split(',').map(Number).map(x=>Number.isFinite(x)?x:0),colors=String(q('#v135ChartColors')?.value||'').split(',').map(x=>x.trim()).filter(Boolean);while(values.length<labels.length)values.push(0);let o=canvasState.objects.find(x=>x.id===editId);if(!o){o={id:id(),z:nextCanvasZ(),kind:'chart',x:120,y:180,w:500,h:320,rotation:0,locked:false};canvasState.objects.push(o)}o.chart={type:q('#v135ChartType')?.value||'bar',title:q('#v135ChartTitle')?.value||'',labels,values:values.slice(0,labels.length),colors:colors.length?colors:palette(labels.length)};closeModal();canvasState.selectedType='object';canvasState.selectedId=o.id;canvasState.selectedIds=[o.id];canvasState.selectedVectorIds=[];commit('Diagramm eingefügt ♡')};

function chartSVG(c,w,h){const labels=c.labels||[],vals=c.values||[],colors=c.colors?.length?c.colors:palette(labels.length),max=Math.max(1,...vals.map(Math.abs)),left=42,top=42,right=16,bottom=38,pw=w-left-right,ph=h-top-bottom;let s=`<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="14" fill="#fffdfb"/><text x="16" y="25" class="v135ChartTitle">${esc(c.title||'Diagramm')}</text>`;if(['pie','donut'].includes(c.type)){const total=Math.max(1,vals.reduce((a,b)=>a+Math.max(0,b),0)),cx=w*.39,cy=h*.54,r=Math.min(w,h)*.25;let a=-Math.PI/2;vals.forEach((v,i)=>{const d=Math.max(0,v)/total*Math.PI*2,x1=cx+Math.cos(a)*r,y1=cy+Math.sin(a)*r;a+=d;const x2=cx+Math.cos(a)*r,y2=cy+Math.sin(a)*r,large=d>Math.PI?1:0;s+=`<path d="M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z" fill="${esc(colors[i%colors.length])}"/>`});if(c.type==='donut')s+=`<circle cx="${cx}" cy="${cy}" r="${r*.52}" fill="#fffdfb"/>`;labels.forEach((x,i)=>s+=`<circle cx="${w*.72}" cy="${60+i*22}" r="5" fill="${esc(colors[i%colors.length])}"/><text x="${w*.72+11}" y="${64+i*22}" font-size="10" fill="#665b55">${esc(x)} · ${vals[i]??0}</text>`);return s+'</svg>'}s+=`<path d="M${left} ${top}V${top+ph}H${left+pw}" fill="none" stroke="#d9cfca"/>`;if(c.type==='hbar'){const bh=ph/Math.max(1,labels.length);labels.forEach((x,i)=>{const ww=Math.abs(vals[i]||0)/max*pw;s+=`<rect x="${left}" y="${top+i*bh+bh*.18}" width="${ww}" height="${bh*.58}" rx="5" fill="${esc(colors[i%colors.length])}"/><text x="${left-6}" y="${top+i*bh+bh*.56}" text-anchor="end" font-size="9" fill="#756861">${esc(x)}</text>`})}else if(['line','area'].includes(c.type)){const pts=vals.map((v,i)=>[left+(i/(Math.max(1,vals.length-1)))*pw,top+ph-(Math.abs(v)/max)*ph]);const d=pts.map((p,i)=>(i?'L':'M')+p.join(' ')).join(' ');if(c.type==='area'&&pts.length)s+=`<path d="${d} L ${pts.at(-1)[0]} ${top+ph} L ${pts[0][0]} ${top+ph} Z" fill="${esc(colors[0])}" opacity=".24"/>`;s+=`<path d="${d}" fill="none" stroke="${esc(colors[0])}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;pts.forEach((p,i)=>s+=`<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="${esc(colors[i%colors.length])}"/><text x="${p[0]}" y="${top+ph+17}" text-anchor="middle" font-size="9" fill="#756861">${esc(labels[i]||'')}</text>`)}else{const bw=pw/Math.max(1,labels.length);labels.forEach((x,i)=>{const hh=Math.abs(vals[i]||0)/max*ph;s+=`<rect x="${left+i*bw+bw*.18}" y="${top+ph-hh}" width="${bw*.64}" height="${hh}" rx="6" fill="${esc(colors[i%colors.length])}"/><text x="${left+i*bw+bw*.5}" y="${top+ph+17}" text-anchor="middle" font-size="9" fill="#756861">${esc(x)}</text>`})}return s+'</svg>'}

window.openTimelineDialog=function(editId=''){const o=canvasState.objects.find(x=>x.id===editId),t=o?.timeline||{};openModal(`<div class="v135Modal"><div class="v135ModalHead"><div><span class="eyebrow">ZEITLEISTE</span><h2>${o?'Timeline bearbeiten':'Timeline einfügen'}</h2></div><button onclick="closeModal()">×</button></div><div class="v135FormGrid"><label>Titel<input id="v135TimeTitle" value="${esc(t.title||'Meine Timeline')}"></label><label>Anzahl Zeitpunkte<input id="v135TimeCount" type="number" min="2" max="12" value="${t.count||4}"></label><label class="full">Beschriftungen, mit Komma getrennt<input id="v135TimeLabels" value="${esc((t.labels||['Start','Schritt 2','Schritt 3','Ziel']).join(', '))}"></label><label>Linienfarbe<input id="v135TimeColor" type="color" value="${t.color||'#e7919b'}"></label><label>Punktfarbe<input id="v135TimeAccent" type="color" value="${t.accent||'#f6c4c9'}"></label></div><div class="v135ActionRow"><button onclick="closeModal()">Abbrechen</button><button class="primary" onclick="v135SaveTimeline('${o?.id||''}')">Timeline einfügen</button></div></div>`)};
window.v135SaveTimeline=function(editId=''){const count=Math.max(2,Math.min(12,+q('#v135TimeCount')?.value||4)),raw=String(q('#v135TimeLabels')?.value||'').split(',').map(x=>x.trim()).filter(Boolean);while(raw.length<count)raw.push('Schritt '+(raw.length+1));let o=canvasState.objects.find(x=>x.id===editId);if(!o){o={id:id(),z:nextCanvasZ(),kind:'timeline',x:105,y:210,w:580,h:190,rotation:0,locked:false};canvasState.objects.push(o)}o.timeline={title:q('#v135TimeTitle')?.value||'',count,labels:raw.slice(0,count),color:q('#v135TimeColor')?.value||'#e7919b',accent:q('#v135TimeAccent')?.value||'#f6c4c9'};closeModal();canvasState.selectedType='object';canvasState.selectedId=o.id;canvasState.selectedIds=[o.id];canvasState.selectedVectorIds=[];commit('Timeline eingefügt ♡')};
function timelineSVG(t,w,h){const count=t.count||t.labels?.length||4,pad=42,y=h*.52,step=(w-pad*2)/Math.max(1,count-1);let s=`<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="14" fill="#fffdfb"/><text x="18" y="27" class="v135TimelineTitle">${esc(t.title||'Timeline')}</text><path d="M${pad} ${y}H${w-pad}" stroke="${esc(t.color||'#e7919b')}" stroke-width="4" stroke-linecap="round"/>`;for(let i=0;i<count;i++){const x=pad+i*step,up=i%2===0;s+=`<circle cx="${x}" cy="${y}" r="10" fill="${esc(t.accent||'#f6c4c9')}" stroke="${esc(t.color||'#e7919b')}" stroke-width="3"/><path d="M${x} ${y+(up?-10:10)}V${y+(up?-28:28)}" stroke="${esc(t.color||'#e7919b')}"/><text x="${x}" y="${y+(up?-36:45)}" text-anchor="middle" font-size="10" font-weight="700" fill="#655852">${esc(t.labels?.[i]||'')}</text>`}return s+'</svg>'}

const stickerAssets=['title-1.png','title-2.png','title-3.png','title-4.png','pins-1.png','pins-2.png','notes-1.png','notes-2.png','notes-3.png','notes-4.png','notes-5.png','notes-6.png','notes-7.png'];
const paperclip='data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 200"><path d="M95 31c25 2 39 24 33 48l-25 91c-5 19-24 30-42 25-18-5-29-24-24-42l26-96c3-12 15-19 27-16s19 15 16 27l-24 87c-1 5-6 8-11 6-5-1-8-6-6-11l22-81" fill="none" stroke="#e78596" stroke-width="12" stroke-linecap="round"/></svg>');
window.openStickerLibrary=function(){openModal(`<div class="v135Modal"><div class="v135ModalHead"><div><span class="eyebrow">STICKER</span><h2>Süße Sticker</h2></div><button onclick="closeModal()">×</button></div><p>Deine Illustrator-Sticker plus Büroklammer und weitere Deko.</p><div class="v135StickerGrid"><button title="Büroklammer" onclick="v135AddStickerAsset('${paperclip}','Büroklammer')"><img src="${paperclip}"></button>${stickerAssets.map((f,i)=>`<button title="Sticker ${i+1}" onclick="v135AddStickerAsset('assets/stickers/${f}','Sticker ${i+1}')"><img src="assets/stickers/${f}"></button>`).join('')}</div></div>`)};
window.v135AddStickerAsset=function(src,label){const o={id:id(),z:nextCanvasZ(),kind:'image',src,name:label,x:150,y:150,w:src.includes('pins')?130:src.includes('title')?320:240,h:src.includes('pins')?170:src.includes('title')?135:210,rotation:0,locked:false,stickerAsset:true};canvasState.objects.push(o);closeModal();canvasState.selectedType='object';canvasState.selectedId=o.id;canvasState.selectedIds=[o.id];canvasState.selectedVectorIds=[];commit('Sticker eingefügt ♡')};

function renderSpecial(){for(const o of canvasState.objects||[]){const el=q(`.cobj[data-id="${CSS.escape(o.id)}"]`);if(!el)continue;if(o.kind==='chart'&&o.chart){const sig='chart:'+JSON.stringify(o.chart)+':'+o.w+':'+o.h;if(el.dataset.v135Special!==sig){el.contentEditable='false';el.innerHTML=`<div class="v135Special">${chartSVG(o.chart,Math.max(220,o.w),Math.max(160,o.h))}</div><span class="rotateHandle"></span><span class="resizeHandle"></span>`;el.dataset.v135Special=sig}}else if(o.kind==='timeline'&&o.timeline){const sig='timeline:'+JSON.stringify(o.timeline)+':'+o.w+':'+o.h;if(el.dataset.v135Special!==sig){el.contentEditable='false';el.innerHTML=`<div class="v135Special">${timelineSVG(o.timeline,Math.max(280,o.w),Math.max(120,o.h))}</div><span class="rotateHandle"></span><span class="resizeHandle"></span>`;el.dataset.v135Special=sig}}if(o.kind==='paper')el.style.setProperty('--v135-paper-line',o.patternColor||'#9aafc1');if(o.linkUrl||o.linkSheetId){el.classList.add('v135Linked');if(!el.querySelector('.v135LinkBadge'))el.insertAdjacentHTML('beforeend',`<button class="v135LinkBadge" title="Link öffnen" onclick="event.stopPropagation();v135OpenLink('${o.id}')">${linkSVG()}</button>`)}const st=o.kind==='table'?o:(o.style||{}),dash=o.kind==='table'?(o.dash||o.borderStyle):(st.dash||st.borderStyle),bw=Math.max(0,+(o.kind==='table'?o.borderWidth:st.borderWidth)||0);if(bw&&dash&&dash!=='solid'&&!el.querySelector('.v135StrokeOverlay')){const color=o.kind==='table'?(o.borderColor||'#8d7369'):(st.borderColor||'#8d7369'),len=Math.max(1,+(o.kind==='table'?o.dashLength:st.dashLength)||(dash==='dotted'?2:10)),gap=Math.max(1,+(o.kind==='table'?o.dashGap:st.dashGap)||(dash==='dotted'?6:7)),rad=Math.max(0,+(o.kind==='table'?o.borderRadius:st.borderRadius)||0);el.insertAdjacentHTML('beforeend',`<svg class="v135StrokeOverlay" viewBox="0 0 ${Math.max(1,o.w)} ${Math.max(1,o.h)}" preserveAspectRatio="none"><rect x="${bw/2}" y="${bw/2}" width="${Math.max(1,o.w-bw)}" height="${Math.max(1,o.h-bw)}" rx="${rad}" fill="none" stroke="${esc(color)}" stroke-width="${bw}" stroke-dasharray="${len} ${gap}"/></svg>`);if(o.kind!=='table')el.style.borderColor='transparent'}}}
const baseRenderObjects=window.renderCanvasObjects;window.renderCanvasObjects=function(){const r=baseRenderObjects.apply(this,arguments);renderSpecial();return r};try{renderCanvasObjects=window.renderCanvasObjects}catch(_){}

function outlineInspector(){const host=q('#canvasInspector');if(!host||!canvasState.selectedId)return;const ids=selectedIds(),vids=selectedVids(),o=canvasState.objects.find(x=>x.id===canvasState.selectedId),v=canvasState.vectors.find(x=>x.id===canvasState.selectedId),ref=v||o,style=v?v:(o?.kind==='table'?o:o?.style||{}),dash=v?.dash||(o?.kind==='table'?(o?.dash||o?.borderStyle):(style.dash||style.borderStyle))||'solid',dl=v?.dashLength||style.dashLength||10,dg=v?.dashGap||style.dashGap||7;const box=document.createElement('div');box.className='v135InspectorBlock';box.innerHTML=`<div class="v135InspectorTitle">Kontur & Anordnen <span>${ids.length+vids.length>1?'Mehrfachauswahl':'Auswahl'}</span></div><div class="v135InspectorGrid"><label>Linienart<select onchange="v135Stroke('dash',this.value)"><option value="solid" ${dash==='solid'?'selected':''}>Durchgezogen</option><option value="dashed" ${dash==='dashed'?'selected':''}>Gestrichelt</option><option value="dotted" ${dash==='dotted'?'selected':''}>Gepunktet</option><option value="custom" ${dash==='custom'?'selected':''}>Eigene Striche</option></select></label><label>Konturfarbe<input type="color" value="${v?.stroke||o?.borderColor||style.borderColor||'#8d7369'}" onchange="v135Stroke('borderColor',this.value)"></label><label>Strichlänge<input type="number" min="1" max="80" value="${dl}" onchange="v135Stroke('dashLength',+this.value)"></label><label>Abstand<input type="number" min="1" max="80" value="${dg}" onchange="v135Stroke('dashGap',+this.value)"></label></div><div class="v135AlignGrid"><button onclick="v135Align('left')">Links</button><button onclick="v135Align('centerX')">Mittig</button><button onclick="v135Align('right')">Rechts</button><button onclick="v135Align('top')">Oben</button><button onclick="v135Align('centerY')">Mitte</button><button onclick="v135Align('bottom')">Unten</button></div>`;host.prepend(box);if(o?.kind==='paper'){const p=document.createElement('div');p.className='v135InspectorBlock';p.innerHTML=`<div class="v135InspectorTitle">Papier gestalten <span>${o.paperType==='grid'?'Kariert':'Liniert'}</span></div><div class="v135InspectorGrid"><label>Papierfarbe<input type="color" value="${o.paperColor||'#fffdf7'}" onchange="v135Paper('paperColor',this.value)"></label><label>Linienfarbe<input type="color" value="${o.patternColor||'#9aafc1'}" onchange="v135Paper('patternColor',this.value)"></label></div>`;host.prepend(p)}if(o?.kind==='chart'){const b=document.createElement('button');b.className='primary';b.textContent='Diagramm bearbeiten';b.onclick=()=>openChartDialog(o.id);host.prepend(b)}if(o?.kind==='timeline'){const b=document.createElement('button');b.className='primary';b.textContent='Timeline bearbeiten';b.onclick=()=>openTimelineDialog(o.id);host.prepend(b)}}
window.v135Paper=function(prop,value){const o=canvasState.objects.find(x=>x.id===canvasState.selectedId);if(!o||o.kind!=='paper')return;o[prop]=value;commit()};
const baseInspector=window.renderCanvasInspector;window.renderCanvasInspector=function(){const r=baseInspector.apply(this,arguments);outlineInspector();return r};try{renderCanvasInspector=window.renderCanvasInspector}catch(_){}

function ensureLayers(){canvasState.layerGroups||=[];if(!canvasState.layerGroups.length)canvasState.layerGroups.push({id:'layer-main',name:'Ebene 1'});const first=canvasState.layerGroups[0].id;[...(canvasState.objects||[]),...(canvasState.vectors||[])].forEach(x=>x.layerGroupId||=first)}
function layerRef(kind,idv){return kind==='object'?canvasState.objects.find(x=>x.id===idv):canvasState.vectors.find(x=>x.id===idv)}
function layerName(ref,kind){if(kind==='vector')return ref.shapeKind==='star'?'Stern':ref.type==='ellipse'?'Kreis':ref.type==='triangle'?'Dreieck':ref.type==='path'?'Pfad':'Form';return ref.name||({text:'Text',block:'Textblock',table:'Tabelle',image:'Bild / Sticker',formula:'Formel',graph:'Graph',chart:'Diagramm',timeline:'Timeline',paper:'Papier',tape:'Klebeband'}[ref.kind]||'Element')}
function layerIcon(ref,kind){if(kind==='vector')return icon(ref.type==='ellipse'?'circle':ref.type==='triangle'?'triangle':ref.shapeKind==='star'?'star':ref.type==='path'?'curve':'rect');return icon(({text:'text',block:'text',table:'table',image:'image',formula:'formula',graph:'graph',chart:'graph',timeline:'line',paper:'paperline',tape:'tape'}[ref.kind]||'elements'))}
function layerMarkup(){ensureLayers();const entries=layerEntries();return `<div class="v135LayerWrap"><div class="v135LayersToolbar"><b>Ebenen</b><button onclick="v135AddLayerGroup()">＋ Neue Ebene</button></div>${canvasState.layerGroups.map((g,gi)=>{const rows=entries.filter(a=>layerRef(a.kind,a.id)?.layerGroupId===g.id);return `<section class="v135LayerGroup" style="animation-delay:${gi*35}ms"><div class="v135LayerGroupHead"><div><b>${esc(g.name)}</b> <span>${rows.length} Elemente</span></div><button title="Umbenennen" onclick="v135RenameLayerGroup('${g.id}')">✎</button><button title="Löschen" onclick="v135DeleteLayerGroup('${g.id}')">×</button></div><div class="v135LayerItems">${rows.length?rows.map(a=>{const ref=layerRef(a.kind,a.id);return `<div class="v130LayerRow v135LayerRow ${canvasState.selectedId===a.id?'active':''}" data-layer-kind="${a.kind}" data-layer-id="${a.id}"><button class="v130LayerHandle" onpointerdown="v130LayerPointerStart(event,'${a.kind}','${a.id}')">${icon('drag')}</button><button class="v130LayerTitle" onclick="${a.kind==='object'?`selectCanvasObject('${a.id}')`:`selectVector('${a.id}')`}"><span class="v135LayerIcon">${layerIcon(ref,a.kind)}</span><span class="v131LayerText">${esc(layerName(ref,a.kind))}</span></button><select title="Ebene wählen" onchange="v135AssignLayer('${a.kind}','${a.id}',this.value)">${canvasState.layerGroups.map(x=>`<option value="${x.id}" ${x.id===g.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select><button class="v135LayerLock" title="${ref.locked?'Entsperren':'Sperren'}" onclick="event.stopPropagation();${a.kind==='object'?`selectCanvasObject('${a.id}')`:`selectVector('${a.id}')`};toggleSelectedLock()">${icon(ref.locked?'lock':'unlock')}</button></div>`}).join(''):'<div class="v135LayerEmpty">Elemente hier einsortieren</div>'}</div></section>`}).join('')}</div>`}
window.renderLayerList=function(){const html=layerMarkup(),a=q('#layerList');if(a)a.innerHTML=html;const b=q('#canvasQuickDrawer.open .mobileLayerList');if(b)b.innerHTML=html};try{renderLayerList=window.renderLayerList}catch(_){}
window.v135AddLayerGroup=function(){ensureLayers();canvasState.layerGroups.push({id:'layer-'+Date.now().toString(36),name:'Ebene '+(canvasState.layerGroups.length+1)});renderLayerList();markCanvasDirty();pushHistory()};
window.v135RenameLayerGroup=function(gid){const g=canvasState.layerGroups.find(x=>x.id===gid),n=prompt('Name der Ebene',g?.name||'Ebene');if(!g||!n?.trim())return;g.name=n.trim();renderLayerList();markCanvasDirty();pushHistory()};
window.v135DeleteLayerGroup=function(gid){ensureLayers();if(canvasState.layerGroups.length<2)return cuteToast?.('Mindestens eine Ebene bleibt erhalten ♡');const fallback=canvasState.layerGroups.find(x=>x.id!==gid)?.id;[...canvasState.objects,...canvasState.vectors].forEach(x=>{if(x.layerGroupId===gid)x.layerGroupId=fallback});canvasState.layerGroups=canvasState.layerGroups.filter(x=>x.id!==gid);renderLayerList();markCanvasDirty();pushHistory()};
window.v135AssignLayer=function(kind,idv,gid){const ref=layerRef(kind,idv);if(!ref)return;ref.layerGroupId=gid;renderLayerList();markCanvasDirty();pushHistory()};

function pageExtras(){const ps=canvasState.pageStyle||{},targets=[q('.v102SidePageSettings'),q('#canvasQuickDrawer.open .mobilePagePanel')].filter(Boolean);for(const t of targets){if(t.querySelector('.v135PageExtras'))continue;const d=document.createElement('div');d.className='v135PageExtras v135InspectorBlock';d.innerHTML=`<div class="v135InspectorTitle">Papier & Seitenrand <span>nicht im Druck</span></div><div class="v135InspectorGrid"><label>Musterfarbe<input type="color" value="${ps.patternColor||'#8197ae'}" onchange="setCanvasPageStyle('patternColor',this.value)"></label><label>Rand anzeigen<input type="checkbox" ${ps.showMargin!==false?'checked':''} onchange="v135ToggleMargins(this.checked)"></label></div><div class="v135Hint">Objekte rasten beim Ziehen automatisch am sichtbaren Seitenrand ein. Der Rand wird nie mitgedruckt.</div>`;t.appendChild(d)}}

function addToolbarTools(){const tools=q('.v134FormatTools');if(tools&&!tools.querySelector('.v135Justify')){const sep=tools.querySelectorAll('.sep')[1]||tools.querySelector('.sep');const html=`<button class="v135TextButton v135Justify" title="Blocksatz" onclick="applyTextProperty('textAlign','justify')">☰</button><button class="v135TextButton" title="Durchstreichen" onclick="v135ToggleStrike()"><s>S</s></button><button class="v135TextButton" title="Hyperlink" onclick="openHyperlinkDialog()">${linkSVG()}</button><button class="v135TextButton" title="Eigene Schrift hinzufügen" onclick="v91PickFont()">${icon('plus')}</button>`;sep?.insertAdjacentHTML('beforebegin',html)}const command=q('.desktopCommandBar');if(command&&!command.querySelector('.v135SideOpen'))command.insertAdjacentHTML('beforeend',`<button class="v135SideOpen" title="Rechte Leiste anzeigen" onclick="v135ToggleSidebar(true)">${icon('pages')}</button>`)}
function addMenus(){const top=q('.canvasTopbar');if(!top||top.querySelector('.v135MenuBar'))return;const bar=document.createElement('nav');bar.className='v135MenuBar';bar.innerHTML=['Datei','Bearbeiten','Ansicht','Einfügen','Format','Anordnen','Extras','Hilfe'].map(x=>`<button onclick="v135Menu('${x}')">${x}</button>`).join('');top.appendChild(bar)}
window.v135Menu=function(name){if(name==='Datei')return saveCanvasSheet?.();if(name==='Bearbeiten'||name==='Hilfe')return openShortcutHelp?.();if(name==='Ansicht')return v135ToggleSidebar();if(name==='Einfügen')return openChartDialog();if(name==='Format')return v91PickFont?.();if(name==='Anordnen')return renderCanvasInspector();if(name==='Extras')return openAccountDialog()};
window.v135ToggleSidebar=function(force){const closed=document.body.classList.contains('v135SideClosed'),next=force===true?false:!closed;document.body.classList.toggle('v135SideClosed',next);localStorage.setItem('studia-v135-side',next?'closed':'open')};
function sideClose(){const side=q('#desktopEditorSidebar');if(side&&!side.querySelector('.v135SideClose'))side.insertAdjacentHTML('afterbegin','<button class="v135SideClose" title="Leiste schließen" onclick="v135ToggleSidebar()">×</button>')}

function enhancePalette(){const d=q('#canvasQuickDrawer');if(!d)return;const mode=d.dataset.v134Mode;if((mode==='charts'||mode==='elements')&&!d.querySelector('[data-v135="chart"]')){const grid=q('.v134PaletteGrid',d);if(grid)grid.insertAdjacentHTML('beforeend',`<button class="v134PaletteTile" data-v135="chart" onclick="openChartDialog()">${icon('graph')}<span>Diagramm</span></button><button class="v134PaletteTile" onclick="openTimelineDialog()">${icon('line')}<span>Timeline</span></button><button class="v134PaletteTile" onclick="openHyperlinkDialog()">${linkSVG()}<span>Hyperlink</span></button>`)}if(mode==='stickers'&&!d.querySelector('[data-v135="stickers"]')){q('.v134PaletteGrid',d)?.insertAdjacentHTML('afterbegin',`<button class="v134PaletteTile" data-v135="stickers" onclick="openStickerLibrary()">${icon('sticker')}<span>Süße Sticker</span></button>`)}}

const FIREBASE_VERSION='12.18.0';let fb=null,cloudTimer=null;
async function loadFirebase(){if(fb)return fb;const base=`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/`;const [app,auth,fs]=await Promise.all([import(base+'firebase-app.js'),import(base+'firebase-auth.js'),import(base+'firebase-firestore.js')]);const cfg=JSON.parse(localStorage.getItem('studia-firebase-config')||'null');if(!cfg?.apiKey||!cfg?.projectId)throw new Error('Firebase-Konfiguration fehlt.');const a=app.getApps().length?app.getApps()[0]:app.initializeApp(cfg);fb={app:a,auth:auth.getAuth(a),db:fs.getFirestore(a),authApi:auth,fsApi:fs};return fb}
window.openAccountDialog=function(){const cfg=localStorage.getItem('studia-firebase-config')||'';openModal(`<div class="v135Modal"><div class="v135ModalHead"><div><span class="eyebrow">KOSTENLOSES KONTO</span><h2>Studia Cloud</h2></div><button onclick="closeModal()">×</button></div><p>Mit Firebase Email/Passwort kannst du dieselben Daten auf Handy und Laptop laden. Die Projekt-Konfiguration wird nur auf diesem Gerät gespeichert.</p><div class="v135FormGrid"><label class="full">Firebase Web-Konfiguration (JSON)<textarea id="v135FirebaseConfig" placeholder='{"apiKey":"…","authDomain":"…","projectId":"…","appId":"…"}'>${esc(cfg)}</textarea></label><label>E-Mail<input id="v135CloudEmail" type="email" autocomplete="email"></label><label>Passwort<input id="v135CloudPassword" type="password" autocomplete="current-password" minlength="6"></label></div><div class="v135CloudState" id="v135CloudState"></div><div class="v135ActionRow"><button onclick="v135CloudAuth('register')">Konto erstellen</button><button onclick="v135CloudAuth('login')">Anmelden</button><button onclick="v135CloudDownload()">Cloud laden</button><button class="primary" onclick="v135CloudUpload()">Jetzt synchronisieren</button></div><div class="v135Hint">Einmalig nötig: kostenloses Firebase-Projekt anlegen, Email/Passwort-Anmeldung und Firestore aktivieren. Zugangsdaten erfindet Studia nicht; du fügst die Web-Konfiguration deines Projekts hier ein.</div></div>`)};
function cloudState(s){const el=q('#v135CloudState');if(el)el.textContent=s}
window.v135CloudAuth=async function(mode){try{const raw=q('#v135FirebaseConfig')?.value.trim();if(raw){JSON.parse(raw);localStorage.setItem('studia-firebase-config',raw);fb=null}cloudState('Verbindung wird hergestellt …');const x=await loadFirebase(),email=q('#v135CloudEmail')?.value.trim(),pw=q('#v135CloudPassword')?.value||'';const cred=mode==='register'?await x.authApi.createUserWithEmailAndPassword(x.auth,email,pw):await x.authApi.signInWithEmailAndPassword(x.auth,email,pw);cloudState('Angemeldet als '+cred.user.email);localStorage.setItem('studia-cloud-user',cred.user.uid);enableCloudAuto();cuteToast?.('Cloud-Konto verbunden ♡')}catch(err){cloudState('Fehler: '+String(err.message||err).replace(/^Firebase:\s*/i,''))}};
window.v135CloudUpload=async function(silent=false){try{const x=await loadFirebase(),u=x.auth.currentUser;if(!u)throw new Error('Bitte zuerst anmelden.');const payload=JSON.stringify(data);await x.fsApi.setDoc(x.fsApi.doc(x.db,'users',u.uid,'studia','main'),{payload,updatedAt:x.fsApi.serverTimestamp()},{merge:true});localStorage.setItem('studia-cloud-last',String(Date.now()));if(!silent)cloudState('Alles synchronisiert ✓')}catch(err){if(!silent)cloudState('Fehler: '+(err.message||err))}};
window.v135CloudDownload=async function(){try{const x=await loadFirebase(),u=x.auth.currentUser;if(!u)throw new Error('Bitte zuerst anmelden.');cloudState('Cloud-Daten werden geladen …');const snap=await x.fsApi.getDoc(x.fsApi.doc(x.db,'users',u.uid,'studia','main'));if(!snap.exists())throw new Error('Noch keine Cloud-Daten vorhanden.');const remote=JSON.parse(snap.data().payload||'{}');Object.keys(data).forEach(k=>delete data[k]);Object.assign(data,remote);save();cloudState('Cloud-Daten geladen ✓');setTimeout(()=>location.reload(),500)}catch(err){cloudState('Fehler: '+(err.message||err))}};
function enableCloudAuto(){if(cloudTimer)return;cloudTimer=setInterval(()=>v135CloudUpload(true),45000)}

function mobileExtras(){qa('.v135MobileExtras').forEach(x=>x.remove())}

function reconcile(){if(!editor())return;ensureLayers();renderSpecial();if(desktop()){addMenus();addToolbarTools();sideClose();document.body.classList.toggle('v135SideClosed',localStorage.getItem('studia-v135-side')==='closed')}pageExtras();enhancePalette();mobileExtras()}
const oldV134Open=window.v134Open;if(oldV134Open)window.v134Open=function(){const r=oldV134Open.apply(this,arguments);setTimeout(()=>{enhancePalette();pageExtras()},30);return r};
const oldV132Open=window.v132Open;if(oldV132Open)window.v132Open=function(){const r=oldV132Open.apply(this,arguments);setTimeout(()=>{mobileExtras();pageExtras();if(arguments[0]==='layers')renderLayerList()},40);return r};
const oldApplyStyle=window.setCanvasPageStyle;window.setCanvasPageStyle=function(prop,value){const r=oldApplyStyle.apply(this,arguments);setTimeout(pageExtras,10);return r};
document.addEventListener('keydown',e=>{if(!editor())return;const typing=e.target?.matches?.('input,textarea,select')||e.target?.isContentEditable,mod=e.ctrlKey||e.metaKey;if(mod&&e.key.toLowerCase()==='k'&&!typing){e.preventDefault();e.stopImmediatePropagation();openHyperlinkDialog()}},{capture:true});
let reconcileQueued=false,lastEditor=editor();
const scheduleReconcile=()=>{if(reconcileQueued)return;reconcileQueued=true;requestAnimationFrame(()=>{reconcileQueued=false;reconcile()})};
const obs=new MutationObserver(()=>{const now=editor();if(now&&!lastEditor)scheduleReconcile();lastEditor=now});obs.observe(document.body,{attributes:true,attributeFilter:['class']});
window.addEventListener('resize',()=>setTimeout(reconcile,160));setTimeout(reconcile,1100);
})();

/* v137.js consolidated */
/* Studia V137 - clean editor organization and read-only viewer */
(function(){
'use strict';
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const deep=v=>JSON.parse(JSON.stringify(v));
const editor=()=>document.body.classList.contains('editorMode')&&!!q('#view-sheet-editor.active');
const svg=(body,cls='')=>`<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
const icons={
 view:svg('<path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z"/><circle cx="12" cy="12" r="2.5"/>'),
 close:svg('<path d="m6 6 12 12M18 6 6 18"/>'),
 note:svg('<rect x="5" y="3" width="14" height="18" rx="3"/><path d="M9 3v18M12 8h4M12 12h4M12 16h3"/>'),
 link:svg('<path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.2M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.2-1.2"/>'),
 left:svg('<path d="M4 5v14M8 8h11M8 12h8M8 16h11"/>'),
 center:svg('<path d="M4 8h16M7 12h10M4 16h16"/>'),
 right:svg('<path d="M20 5v14M5 8h11M8 12h8M5 16h11"/>'),
 justify:svg('<path d="M4 7h16M4 11h16M4 15h16M4 19h16"/>'),
 alignLeft:svg('<path d="M4 4v16M8 7h11v4H8zM8 14h7v4H8z"/>'),
 alignCenter:svg('<path d="M12 3v18M5 7h14v4H5zM7 14h10v4H7z"/>'),
 alignRight:svg('<path d="M20 4v16M5 7h11v4H5zM9 14h7v4H9z"/>'),
 top:svg('<path d="M4 4h16M7 8v11h4V8zM14 8v7h4V8z"/>'),
 middle:svg('<path d="M3 12h18M7 5h4v14H7zM14 7h4v10h-4z"/>'),
 bottom:svg('<path d="M4 20h16M7 5v11h4V5zM14 9v7h4V9z"/>'),
 front:svg('<path d="m12 4 6 6h-4v9h-4v-9H6z"/>'),
 back:svg('<path d="m12 20-6-6h4V5h4v9h4z"/>'),
 group:svg('<rect x="3" y="5" width="8" height="8" rx="1"/><rect x="13" y="11" width="8" height="8" rx="1"/><path d="M8 16H5v-3M16 8h3v3"/>'),
 ungroup:svg('<rect x="3" y="5" width="7" height="7" rx="1"/><rect x="14" y="12" width="7" height="7" rx="1"/><path d="M12 5v5h5M12 19v-5H7"/>'),
 lock:svg('<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>'),
 timeline:svg('<path d="M4 12h16"/><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><path d="M5 10V6M12 14v4M19 10V6"/>'),
 chart:svg('<path d="M4 20V4M4 20h16"/><rect x="7" y="12" width="3" height="6"/><rect x="12" y="8" width="3" height="10"/><rect x="17" y="5" width="3" height="13"/>'),
 sticker:svg('<path d="M12 3a8 8 0 0 0-8 8v6a4 4 0 0 0 4 4h5l7-7v-3a8 8 0 0 0-8-8z"/><path d="M13 21v-5a2 2 0 0 1 2-2h5"/>')
};

function selected(){
 const ids=[...new Set([...(canvasState.selectedIds||[]),...(canvasState.selectedType==='object'&&canvasState.selectedId?[canvasState.selectedId]:[])])];
 const vids=[...new Set([...(canvasState.selectedVectorIds||[]),...(canvasState.selectedType==='vector'&&canvasState.selectedId?[canvasState.selectedId]:[])])];
 return{ids,vids,objects:(canvasState.objects||[]).filter(x=>ids.includes(x.id)),vectors:(canvasState.vectors||[]).filter(x=>vids.includes(x.id))};
}
function commit(message=''){
 renderCanvasObjects();renderCanvasInspector();markCanvasDirty();pushHistory();
 if(typeof v96SyncPage==='function')v96SyncPage();
 if(message)window.cuteToast?.(message);
}

/* ---------- compact top toolbar ---------- */
function toolbarHTML(){return `<div class="v137FormatToolbar">
 <div class="v137ToolGroup"><select class="v137Zoom" title="Zoom" onchange="setCanvasZoom(+this.value)"><option value=".5">50%</option><option value=".75">75%</option><option value="1" selected>100%</option><option value="1.25">125%</option><option value="1.5">150%</option></select></div>
 <div class="v137ToolGroup"><select class="v137Font" title="Schriftart" onchange="v137Text('fontFamily',this.value)"><option>Inter</option><option>Arial</option><option>Georgia</option><option>Trebuchet MS</option><option>Verdana</option><option>Times New Roman</option></select><input class="v137Size" title="Schriftgröße" type="number" min="6" max="180" value="16" onchange="v137Text('fontSize',+this.value)"></div>
 <div class="v137ToolGroup" aria-label="Schriftstil"><button title="Fett" onclick="v137ToggleText('fontWeight')">B</button><button title="Kursiv" onclick="v137ToggleText('fontStyle')"><i>I</i></button><button title="Unterstrichen" onclick="v137ToggleText('underline')"><u>U</u></button><button title="Durchgestrichen" onclick="v137ToggleText('strike')"><s>S</s></button><label title="Textfarbe">A<input type="color" value="#333333" onchange="v137Text('color',this.value)"></label></div>
 <div class="v137ToolGroup" aria-label="Textausrichtung"><button title="Linksbündig" onclick="v137Text('textAlign','left')">${icons.left}</button><button title="Zentriert" onclick="v137Text('textAlign','center')">${icons.center}</button><button title="Rechtsbündig" onclick="v137Text('textAlign','right')">${icons.right}</button><button title="Blocksatz" onclick="v137Text('textAlign','justify')">${icons.justify}</button></div>
 <div class="v137ToolGroup"><button title="Hyperlink" onclick="openHyperlinkDialog()">${icons.link}</button><button title="Formel" onclick="openFormulaDialog()">${window.v133Icon?.('formula')||'∑'}</button><button title="Graph" onclick="openGraphDialog()">${window.v133Icon?.('graph')||'⌁'}</button><button title="Tabelle" onclick="openTableDialog()">${window.v133Icon?.('table')||'▦'}</button></div>
 </div>`}
window.v137Text=function(prop,value){const s=selected(),targets=s.objects.filter(o=>['text','block','task','merke','file'].includes(o.kind));if(!targets.length)return window.cuteToast?.('Wähle zuerst einen Text ♡');targets.forEach(o=>{o.style||={};o.style[prop]=value});commit()};
window.v137ToggleText=function(kind){const targets=selected().objects.filter(o=>['text','block','task','merke','file'].includes(o.kind));if(!targets.length)return window.cuteToast?.('Wähle zuerst einen Text ♡');targets.forEach(o=>{o.style||={};if(kind==='fontWeight')o.style.fontWeight=String(o.style.fontWeight)==='700'?'400':'700';else if(kind==='fontStyle')o.style.fontStyle=o.style.fontStyle==='italic'?'normal':'italic';else{const key=kind==='strike'?'line-through':'underline',set=new Set(String(o.style.textDecoration||'').split(/\s+/).filter(x=>x&&x!=='none'));set.has(key)?set.delete(key):set.add(key);o.style.textDecoration=[...set].join(' ')||'none'}});commit()};
function organizeToolbar(){const host=q('.v134FormatTools');if(host&&host.dataset.v137!=='1'){host.dataset.v137='1';host.innerHTML=toolbarHTML()}qa('.v135MenuBar').forEach(x=>x.remove())}

/* ---------- viewer ---------- */
function viewerBar(){let bar=q('.v137ViewerBar');if(!bar){bar=document.createElement('div');bar.className='v137ViewerBar';bar.innerHTML=`<div class="v137ViewerTitle">${icons.note}<div><b id="v137ViewerName">Lernblatt</b><span>Nur ansehen · Links sind aktiv</span></div></div><button aria-label="Bearbeiten" title="Bearbeiten" onclick="v137SetViewMode(false)">${icons.close}<span>Bearbeiten</span></button>`;q('.canvasEditorShell')?.appendChild(bar)}return bar}
function lockViewChrome(){if(!document.body.classList.contains('v137ViewMode'))return;q('.canvasQuickNav')?.style.setProperty('display','none','important');q('#canvasQuickDrawer')?.style.setProperty('display','none','important')}
function watchViewChrome(){for(const el of [q('.canvasQuickNav'),q('#canvasQuickDrawer')].filter(Boolean)){if(el.dataset.v137ViewWatch==='1')continue;el.dataset.v137ViewWatch='1';new MutationObserver(()=>{if(document.body.classList.contains('v137ViewMode')&&el.style.getPropertyValue('display')!=='none')el.style.setProperty('display','none','important')}).observe(el,{attributes:true,attributeFilter:['style']})}}
window.v137SetViewMode=function(on){on=!!on;if(!editor())return;document.body.classList.toggle('v137ViewMode',on);canvasState.objects?.forEach(o=>o.editing=false);const mobileNav=q('.canvasQuickNav'),drawer=q('#canvasQuickDrawer');if(on){try{clearCanvasSelection()}catch(_){}closeEditorDrawer?.();lockViewChrome();requestAnimationFrame(lockViewChrome);setTimeout(lockViewChrome,80);setTimeout(lockViewChrome,280);viewerBar();const sh=(data.studySheets||[]).find(x=>x.id===selectedSheetId);const name=q('#v137ViewerName');if(name)name.textContent=sh?.title||q('.editorTitle b')?.textContent||'Lernblatt';setTimeout(()=>fitCanvasStage?.(),60)}else{mobileNav?.style.removeProperty('display');drawer?.style.removeProperty('display');q('.v137ViewerBar')?.remove();setTimeout(()=>{renderCanvasObjects();renderCanvasInspector();window.v132SyncHits?.();fitCanvasStage?.()},40)}};
window.v137ToggleViewMode=()=>v137SetViewMode(!document.body.classList.contains('v137ViewMode'));
function installViewButton(){const actions=q('.canvasTopbar .editorActions');if(!actions)return;let page=actions.querySelector('button[title="Seite & Ansicht"],button[title="Ansicht"],button[title="Seiteneinstellungen"]');if(page){page.title='Seiteneinstellungen';const span=page.querySelector('span');if(span)span.textContent='Seite'}const saveButton=actions.querySelector('button[title="Speichern"]');if(saveButton&&saveButton.dataset.v137Save!=='1'){saveButton.dataset.v137Save='1';saveButton.onclick=()=>v137SaveSheet()}if(!actions.querySelector('.v137ViewButton')){const b=document.createElement('button');b.className='v137ViewButton';b.title='Ansichtsmodus';b.innerHTML=icons.view+'<span>Ansicht</span>';b.onclick=()=>v137ToggleViewMode();actions.insertBefore(b,page||actions.firstChild)}}
document.addEventListener('click',e=>{if(!document.body.classList.contains('v137ViewMode'))return;const el=e.target instanceof Element?e.target.closest('.cobj'):null;if(!el)return;const o=(canvasState.objects||[]).find(x=>x.id===el.dataset.id);if(!o||!(o.linkUrl||o.linkSheetId||o.linkTargetId))return;e.preventDefault();e.stopImmediatePropagation();v137OpenLink(o.id)},true);

/* ---------- richer hyperlinks ---------- */
function linkOptions(current){const sheets=data.studySheets||[],quizzes=data.quizzes||[],tasks=data.homework||[];const group=(label,rows)=>rows.length?`<optgroup label="${label}">${rows.join('')}</optgroup>`:'';return `<option value="">Kein interner Link</option>`+
 group('Lernblätter, Hausaufgaben & Arbeitsblätter',sheets.map(x=>{const type=x.resourceType==='homework'?'Hausaufgabe':x.resourceType==='worksheet'?'Arbeitsblatt':'Lernblatt',v='sheet:'+x.id;return `<option value="${v}" ${current===v?'selected':''}>${esc(type+' · '+(x.title||'Ohne Titel'))}</option>`}))+
 group('Quizze',quizzes.map(x=>{const v='quiz:'+x.id;return `<option value="${v}" ${current===v?'selected':''}>${esc(x.name||'Quiz')}</option>`}))+
 group('Aufgabenliste',tasks.map(x=>{const v='task:'+x.id;return `<option value="${v}" ${current===v?'selected':''}>${esc((x.subject?x.subject+' · ':'')+(x.text||'Aufgabe'))}</option>`}))}
window.openHyperlinkDialog=function(editId=''){const old=(canvasState.objects||[]).find(x=>x.id===(editId||canvasState.selectedId)),current=old?.linkTargetType&&old?.linkTargetId?old.linkTargetType+':'+old.linkTargetId:old?.linkSheetId?'sheet:'+old.linkSheetId:'';openModal(`<div class="v135Modal"><div class="v135ModalHead"><div><span class="eyebrow">VERLINKEN</span><h2>Hyperlink</h2></div><button onclick="closeModal()">×</button></div><p>Öffnet im Ansichtsmodus eine Webseite, ein Lernblatt, eine Hausaufgabe, ein Arbeitsblatt oder ein Quiz.</p><div class="v135FormGrid"><label class="full">Anzeigetext<input id="v137LinkText" value="${esc(old?.text?.replace(/<[^>]*>/g,'')||'Lernlink')}"></label><label class="full">Web-Adresse<input id="v137LinkUrl" type="url" placeholder="https://…" value="${esc(old?.linkUrl||'')}"></label><label class="full">Studia-Inhalt<select id="v137LinkTarget">${linkOptions(current)}</select></label></div><div class="v135ActionRow"><button onclick="closeModal()">Abbrechen</button><button class="primary" onclick="v137SaveLink('${old?.id||''}')">Link speichern</button></div></div>`)};
window.v137SaveLink=function(editId=''){let o=(canvasState.objects||[]).find(x=>x.id===editId);if(!o||!['text','block','task','merke'].includes(o.kind)){o=newCanvasObject('body');o.x=110;o.y=150;o.w=330;o.h=54;canvasState.objects.push(o)}const raw=q('#v137LinkTarget')?.value||'',parts=raw.split(':');o.text=esc(q('#v137LinkText')?.value||'Lernlink');o.linkUrl=String(q('#v137LinkUrl')?.value||'').trim();o.linkTargetType=parts[0]||'';o.linkTargetId=parts.slice(1).join(':')||'';o.linkSheetId=o.linkTargetType==='sheet'?o.linkTargetId:'';o.style||={};o.style.color='#8f5f91';o.style.textDecoration='underline';closeModal();canvasState.selectedType='object';canvasState.selectedId=o.id;canvasState.selectedIds=[o.id];canvasState.selectedVectorIds=[];commit('Link eingefügt ♡')};
window.v137OpenLink=function(idv){const o=(canvasState.objects||[]).find(x=>x.id===idv);if(!o)return;const type=o.linkTargetType||(o.linkSheetId?'sheet':''),target=o.linkTargetId||o.linkSheetId,stayView=document.body.classList.contains('v137ViewMode');if(type==='sheet'&&target){openStudySheetEditor(target);if(stayView)setTimeout(()=>v137SetViewMode(true),900);return}if(type==='quiz'&&target){startQuiz(target);return}if(type==='task'&&target){openView('tasks');return}if(o.linkUrl){let url=o.linkUrl;if(!/^https?:\/\//i.test(url))url='https://'+url;window.open(url,'_blank','noopener')}};
window.v135OpenLink=window.v137OpenLink;
function decorateLinks(){for(const o of canvasState.objects||[]){if(!(o.linkUrl||o.linkSheetId||o.linkTargetId))continue;const el=q(`.cobj[data-id="${CSS.escape(o.id)}"]`);if(!el)continue;el.classList.add('v137Linked');if(!el.querySelector('.v135LinkBadge'))el.insertAdjacentHTML('beforeend',`<button class="v135LinkBadge" title="Link öffnen" onclick="event.stopPropagation();v137OpenLink('${o.id}')">${icons.link}</button>`)}}

/* ---------- appearance and arrangement ---------- */
window.v137Appearance=function(prop,value){const s=selected();s.objects.filter(x=>!x.locked).forEach(o=>{o.style||={};if(prop==='fill'){if(o.kind==='table')o.cellBackground=value;else o.style.background=value}else if(prop==='stroke'){if(o.kind==='table')o.borderColor=value;else o.style.borderColor=value}else if(prop==='strokeWidth'){if(o.kind==='table')o.borderWidth=+value;else o.style.borderWidth=+value}else if(prop==='corner'){if(o.kind==='table')o.borderRadius=+value;else o.style.borderRadius=+value}else if(prop==='opacity')o.style.opacity=+value;else if(prop==='dash'){if(o.kind==='table')o.borderStyle=value;else o.style.borderStyle=value}});s.vectors.filter(x=>!x.locked).forEach(v=>{if(prop==='fill')v.fill=value;if(prop==='stroke')v.stroke=value;if(prop==='strokeWidth')v.strokeWidth=+value;if(prop==='opacity')v.opacity=+value;if(prop==='dash')v.dash=value;if(prop==='corner'){if(v.type==='rect')v.rx=+value;else v.cornerRadius=+value}});commit()};
function inspector(){const host=q('#canvasInspector'),s=selected();if(!host||!s.ids.length&&!s.vids.length)return;host.querySelector('.v137Inspector')?.remove();const first=s.vectors[0]||s.objects[0],style=s.vectors[0]||((s.objects[0]?.kind==='table')?s.objects[0]:(s.objects[0]?.style||{})),fill=s.vectors[0]?.fill||s.objects[0]?.cellBackground||style.background||'#ffffff',stroke=s.vectors[0]?.stroke||s.objects[0]?.borderColor||style.borderColor||'#8d7369',sw=s.vectors[0]?.strokeWidth||s.objects[0]?.borderWidth||style.borderWidth||0,corner=s.vectors[0]?(s.vectors[0].type==='rect'?s.vectors[0].rx:s.vectors[0].cornerRadius):s.objects[0]?.borderRadius||style.borderRadius||0,dash=s.vectors[0]?.dash||s.objects[0]?.borderStyle||style.borderStyle||'solid',count=s.ids.length+s.vids.length;const wrap=document.createElement('div');wrap.className='v137Inspector';wrap.innerHTML=`<section class="v137InspectorSection"><div class="v137InspectorHead"><b>Aussehen</b><span>${count>1?count+' ausgewählt':'Auswahl'}</span></div><div class="v137AppearanceGrid"><label>Füllfarbe<input type="color" value="${fill==='transparent'?'#ffffff':fill}" onchange="v137Appearance('fill',this.value)"></label><label>Kontur<input type="color" value="${stroke==='transparent'?'#8d7369':stroke}" onchange="v137Appearance('stroke',this.value)"></label><label>Konturstärke<input type="number" min="0" max="30" value="${sw}" onchange="v137Appearance('strokeWidth',this.value)"></label><label>Linienart<select onchange="v137Appearance('dash',this.value)"><option value="solid" ${dash==='solid'?'selected':''}>Durchgezogen</option><option value="dashed" ${dash==='dashed'?'selected':''}>Gestrichelt</option><option value="dotted" ${dash==='dotted'?'selected':''}>Gepunktet</option></select></label><label>Ecken rund<input type="number" min="0" max="100" value="${corner||0}" onchange="v137Appearance('corner',this.value)"></label><label>Deckkraft<input type="range" min="0.1" max="1" step="0.05" value="${style.opacity??first?.opacity??1}" onchange="v137Appearance('opacity',this.value)"></label></div></section><section class="v137InspectorSection"><div class="v137InspectorHead"><b>Anordnen</b><span>${count>1?'Mehrfachauswahl':'Position'}</span></div><div class="v137ArrangeGrid"><button onclick="v135Align('left')">${icons.alignLeft}Links</button><button onclick="v135Align('centerX')">${icons.alignCenter}Mittig</button><button onclick="v135Align('right')">${icons.alignRight}Rechts</button><button onclick="v135Align('top')">${icons.top}Oben</button><button onclick="v135Align('centerY')">${icons.middle}Mitte</button><button onclick="v135Align('bottom')">${icons.bottom}Unten</button></div><div class="v137LayerActions"><button onclick="moveSelectedLayer(1)">${icons.front}Nach vorn</button><button onclick="moveSelectedLayer(-1)">${icons.back}Nach hinten</button></div></section>`;host.prepend(wrap)}

/* ---------- palette, mobile drawer and settings organization ---------- */
function cleanupDrawer(){qa('.v135MobileExtras').forEach(x=>x.remove());const d=q('#canvasQuickDrawer');if(!d)return;for(const row of qa('.mobileDrawerActions.rowish',d)){const tx=row.textContent||'';if(/An Bildschirm|50%|75%|100%/.test(tx))row.remove()}const text=d.textContent||'',isElements=d.dataset.v137Mode==='elements'||(innerWidth>=900&&d.dataset.v134Mode==='elements')||(!d.dataset.v137Mode&&/Text & Inhalt/.test(text)&&/Mathematik/.test(text));if(!isElements)d.querySelector('.v137ElementExtras')?.remove();if(isElements&&!d.querySelector('.v137ElementExtras')&&![...d.querySelectorAll('button')].some(b=>b.textContent.trim()==='Timeline')){const x=document.createElement('div');x.className='v137ElementExtras';x.innerHTML=`<button onclick="openTimelineDialog()">${icons.timeline}Timeline</button><button onclick="openChartDialog()">${icons.chart}Diagramm</button>`;(d.querySelector('.v133ElementGroups')||d.querySelector('.mobileDrawerSection')||d).appendChild(x)}if(/Text bearbeiten|Textformate|Schrift/.test(text)&&!d.querySelector('.v137MobileTextExtras')){const x=document.createElement('div');x.className='v137MobileTextExtras';x.innerHTML=`<button onclick="openHyperlinkDialog()">${icons.link}Hyperlink</button>`;(d.querySelector('.mobileTextEditor,.mobileDrawerSection')||d).appendChild(x)}const nav=q('.canvasQuickNav');for(const b of qa('button',nav)){const label=b.querySelector('span:last-child');if(label?.textContent.trim()==='Sticker')label.textContent='Deko'}}
function settingsCloud(){const view=q('#view-settings');if(!view||view.querySelector('.v137CloudSettings'))return;const box=document.createElement('div');box.className='section panel v137CloudSettings';box.innerHTML=`<h2>Geräte-Sync</h2><p class="small">Synchronisiere Studia kostenlos über Google Apps Script und dein eigenes Google Drive.</p><button class="primary" onclick="openAccountDialog()">${icons.lock} Geräte-Sync öffnen</button>`;view.appendChild(box)}
function notebookBrand(){const mark=q('.v134BrandMark');if(mark&&!mark.classList.contains('v137Notebook')){mark.classList.add('v137Notebook');mark.innerHTML=icons.note}}
function watchBrand(){const top=q('.canvasTopbar');if(!top||top.dataset.v137BrandWatch==='1')return;top.dataset.v137BrandWatch='1';new MutationObserver(()=>requestAnimationFrame(notebookBrand)).observe(top,{childList:true,subtree:true})}
function chrome(){if(!editor())return;organizeToolbar();installViewButton();notebookBrand();watchBrand();watchViewChrome();qa('.v135MenuBar').forEach(x=>x.remove());cleanupDrawer();decorateLinks();q('.v137ViewerBar')?.remove();document.body.classList.remove('v137ViewMode')}

/* ---------- sticker library with verified image loading ---------- */
const stickers=['title-1.png','title-2.png','title-3.png','title-4.png','pins-1.png','pins-2.png','notes-1.png','notes-2.png','notes-3.png','notes-4.png','notes-5.png','notes-6.png','notes-7.png'];
window.openStickerLibrary=function(){openModal(`<div class="v135Modal"><div class="v135ModalHead"><div><span class="eyebrow">DEKO</span><h2 class="v137DecorTitle">${icons.sticker} Sticker & Deko</h2></div><button onclick="closeModal()">×</button></div><p>Deine importierten Sticker werden vor dem Einfügen geladen, damit keine unsichtbaren Elemente entstehen.</p><div class="v135StickerGrid">${stickers.map((f,i)=>`<button title="Sticker ${i+1}" onclick="v137AddSticker('assets/stickers/${f}','Sticker ${i+1}')"><img src="assets/stickers/${f}" alt="Sticker ${i+1}"></button>`).join('')}</div></div>`)};
window.v137AddSticker=function(src,label){const img=new Image();img.onload=()=>{const ratio=Math.max(.35,Math.min(3,img.naturalWidth/Math.max(1,img.naturalHeight))),w=ratio>1.5?330:ratio<.72?150:230,h=Math.round(w/ratio),o={id:id(),z:nextCanvasZ(),kind:'image',src,name:label,x:150,y:150,w,h,rotation:0,locked:false,stickerAsset:true};canvasState.objects.push(o);closeModal();canvasState.selectedType='object';canvasState.selectedId=o.id;canvasState.selectedIds=[o.id];canvasState.selectedVectorIds=[];commit('Sticker eingefügt ♡')};img.onerror=()=>window.cuteToast?.('Sticker-Datei konnte nicht geladen werden');img.src=src};

/* ---------- page orientation persistence ---------- */
function syncActivePage(){if(!Array.isArray(canvasState.pages)||!canvasState.pages.length)return;const i=Math.max(0,Math.min(canvasState.pages.length-1,Number(canvasState.activePage)||0));canvasState.pages[i]={objects:deep(canvasState.objects||[]),vectors:deep(canvasState.vectors||[]),orientation:canvasState.orientation==='landscape'?'landscape':'portrait',pageStyle:deep(canvasState.pageStyle||{}),layerGroups:deep(canvasState.layerGroups||[])};canvasState.activePage=i}
const baseOrientation=window.setCanvasOrientation;
window.setCanvasOrientation=function(mode){const r=baseOrientation?.apply(this,arguments);syncActivePage();markCanvasDirty();return r};try{setCanvasOrientation=window.setCanvasOrientation}catch(_){}
const baseSaveSheet=window.saveCanvasSheet;
window.saveCanvasSheet=function(){syncActivePage();return baseSaveSheet?.apply(this,arguments)};try{saveCanvasSheet=window.saveCanvasSheet}catch(_){}
window.v137SaveSheet=function(){syncActivePage();if(!selectedSheetId)return baseSaveSheet?.();const sh=(data.studySheets||[]).find(x=>x.id===selectedSheetId);if(!sh)return baseSaveSheet?.();const active=canvasState.pages?.[canvasState.activePage]||{objects:canvasState.objects,vectors:canvasState.vectors,orientation:canvasState.orientation,pageStyle:canvasState.pageStyle,layerGroups:canvasState.layerGroups||[]};sh.canvasData={objects:deep(active.objects||[]),vectors:deep(active.vectors||[]),orientation:active.orientation==='landscape'?'landscape':'portrait',pageStyle:deep(active.pageStyle||{}),layerGroups:deep(active.layerGroups||[]),pages:deep(canvasState.pages||[]),activePage:Number(canvasState.activePage)||0};sh.html='';save();canvasState.lastSavedHash=canvasSnapshot();const status=q('.autosaveState');if(status){status.textContent='Gespeichert ✓';status.className='autosaveState saved'}window.cuteToast?.('Gespeichert ✓')};

/* ---------- marquee selection and table editing without click-through ---------- */
let marquee=null;
function worldPoint(cx,cy){const st=q('#canvasStage'),r=st?.getBoundingClientRect(),z=r&&canvasPageWidth()?r.width/canvasPageWidth():1;return r?{x:(cx-r.left)/z,y:(cy-r.top)/z,z}:null}
function boxOf(v){return typeof vectorBounds==='function'?vectorBounds(v):{x:v.x||0,y:v.y||0,w:v.w||1,h:v.h||1}}
function hitBox(a,b){return a.x<=b.x+b.w&&a.x+a.w>=b.x&&a.y<=b.y+b.h&&a.y+a.h>=b.y}
window.addEventListener('mousedown',e=>{if(!editor()||document.body.classList.contains('v137ViewMode')||e.button!==0||e.target.closest('.v132Hit,button,input,select,textarea,[contenteditable="true"]')||!e.target.closest('#canvasPage,#canvasStage'))return;const p=worldPoint(e.clientX,e.clientY);if(!p)return;const el=document.createElement('div');el.className='v137Marquee';q('#canvasPage')?.appendChild(el);marquee={sx:e.clientX,sy:e.clientY,start:p,el,moved:false,keep:e.shiftKey};const move=ev=>{if(!marquee)return;const cur=worldPoint(ev.clientX,ev.clientY);if(!cur)return;const dx=ev.clientX-marquee.sx,dy=ev.clientY-marquee.sy;if(!marquee.moved&&Math.hypot(dx,dy)<5)return;marquee.moved=true;ev.preventDefault();ev.stopImmediatePropagation();const x=Math.min(marquee.start.x,cur.x),y=Math.min(marquee.start.y,cur.y),w=Math.abs(cur.x-marquee.start.x),h=Math.abs(cur.y-marquee.start.y);Object.assign(el.style,{left:x+'px',top:y+'px',width:w+'px',height:h+'px'})};const up=ev=>{window.removeEventListener('mousemove',move,true);window.removeEventListener('mouseup',up,true);const m=marquee;marquee=null;m.el.remove();if(!m.moved)return;ev.preventDefault();ev.stopImmediatePropagation();const cur=worldPoint(ev.clientX,ev.clientY),rect={x:Math.min(m.start.x,cur.x),y:Math.min(m.start.y,cur.y),w:Math.abs(cur.x-m.start.x),h:Math.abs(cur.y-m.start.y)},old=m.keep?selected():{ids:[],vids:[]},ids=[...new Set([...old.ids,...canvasState.objects.filter(o=>hitBox({x:o.x,y:o.y,w:o.w,h:o.h},rect)).map(o=>o.id)])],vids=[...new Set([...old.vids,...canvasState.vectors.filter(v=>hitBox(boxOf(v),rect)).map(v=>v.id)])];canvasState.multiMode=false;canvasState.selectedIds=ids;canvasState.selectedVectorIds=vids;canvasState.selectedType=ids.length?'object':vids.length?'vector':null;canvasState.selectedId=ids.at(-1)||vids.at(-1)||null;if(ids.length+vids.length>1)window.v132ToggleMulti?.();else{renderCanvasObjects();renderCanvasInspector();window.v132SyncHits?.()}window.cuteToast?.((ids.length+vids.length)+' ausgewählt')};window.addEventListener('mousemove',move,{capture:true,passive:false});window.addEventListener('mouseup',up,{capture:true,passive:false})},{capture:true,passive:false});
window.addEventListener('dblclick',e=>{const hit=e.target instanceof Element?e.target.closest('.v132Hit[data-kind="object"]'):null;if(!hit)return;const o=(canvasState.objects||[]).find(x=>x.id===hit.dataset.id);if(o?.kind!=='table')return;e.preventDefault();e.stopImmediatePropagation();hit.style.pointerEvents='none';const under=document.elementFromPoint(e.clientX,e.clientY);hit.style.pointerEvents='';const td=under?.closest?.('td');if(td){o.activeCell={r:+td.dataset.r||0,c:+td.dataset.c||0};td.focus();renderCanvasInspector()}},{capture:true});

/* ---------- wrap existing render/open hooks ---------- */
const baseObjects=window.renderCanvasObjects;window.renderCanvasObjects=function(){const r=baseObjects.apply(this,arguments);decorateLinks();for(const v of canvasState.vectors||[]){const el=q(`.vectorObj[data-vector-wrap="${CSS.escape(v.id)}"]`);if(el)el.style.opacity=String(v.opacity??1)}return r};try{renderCanvasObjects=window.renderCanvasObjects}catch(_){}
const baseInspector=window.renderCanvasInspector;window.renderCanvasInspector=function(){const r=baseInspector.apply(this,arguments);inspector();return r};try{renderCanvasInspector=window.renderCanvasInspector}catch(_){}
const baseLayers=window.renderLayerList;window.renderLayerList=function(){const r=baseLayers.apply(this,arguments);qa('.v135LayerLock').forEach(b=>{b.setAttribute('aria-label',b.title||'Sperren');b.innerHTML=window.v133Icon?.(b.title==='Entsperren'?'lock':'unlock')||icons.lock});return r};try{renderLayerList=window.renderLayerList}catch(_){}
const baseV132=window.v132Open;if(baseV132)window.v132Open=function(){const r=baseV132.apply(this,arguments),mode=arguments[0];setTimeout(()=>{const d=q('#canvasQuickDrawer');if(d)d.dataset.v137Mode=mode||'';cleanupDrawer()},90);return r};
const baseV134=window.v134Open;if(baseV134)window.v134Open=function(){const r=baseV134.apply(this,arguments),mode=arguments[0];setTimeout(()=>{const d=q('#canvasQuickDrawer');if(d)d.dataset.v137Mode=mode||'';cleanupDrawer()},90);return r};
const baseSettings=window.renderSettings||((typeof renderSettings==='function')?renderSettings:null);if(baseSettings){window.renderSettings=function(){const r=baseSettings.apply(this,arguments);settingsCloud();return r};try{renderSettings=window.renderSettings}catch(_){}}
const baseSheet=window.renderSheetEditor;window.renderSheetEditor=function(){const r=baseSheet.apply(this,arguments);setTimeout(chrome,1050);return r};try{renderSheetEditor=window.renderSheetEditor}catch(_){}
const baseOpenSheet=window.openStudySheetEditor;if(baseOpenSheet)window.openStudySheetEditor=function(){const r=baseOpenSheet.apply(this,arguments);setTimeout(chrome,1120);return r};

window.addEventListener('resize',()=>setTimeout(()=>{if(editor()){organizeToolbar();installViewButton();cleanupDrawer()}},180));
setTimeout(()=>{settingsCloud();if(editor())chrome()},1250);
})();

/* v138.js consolidated */
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
function decorateInspector(){const host=q('#canvasInspector'),wrap=q('.v137Inspector',host),s=selection(),first=s.objects[0]||s.vectors[0];if(!wrap||!first)return;wrap.querySelector('.v138GeometrySection')?.remove();wrap.querySelector('.v138TransparentActions')?.remove();const b=s.objects[0]?{x:first.x,y:first.y,w:first.w,h:first.h}:vbox(first),rot=first.rotation||0,sec=document.createElement('section');sec.className='v137InspectorSection v138GeometrySection';sec.innerHTML=`<div class="v137InspectorHead"><b>Größe & Drehung</b><span>Direkt eingeben</span></div><div class="v138GeometryGrid"><label>X<input type="number" value="${Math.round(b.x)}" onchange="v138Geometry('x',this.value)"></label><label>Y<input type="number" value="${Math.round(b.y)}" onchange="v138Geometry('y',this.value)"></label><label>Breite<input type="number" min="20" value="${Math.round(b.w)}" onchange="v138Geometry('w',this.value)"></label><label>Höhe<input type="number" min="20" value="${Math.round(b.h)}" onchange="v138Geometry('h',this.value)"></label><label>Drehung<input type="number" value="${Math.round(rot)}" onchange="v138Geometry('rotation',this.value)"></label></div>`;wrap.appendChild(sec);const arrange=wrap.querySelector('.v137ArrangeGrid');if(arrange&&!wrap.querySelector('.v138ArrangeExtras'))arrange.insertAdjacentHTML('afterend','<div class="v138ArrangeExtras"><button onclick="v138Distribute(\'x\')">Horizontal verteilen</button><button onclick="v138Distribute(\'y\')">Vertikal verteilen</button></div>');qa('.v137ArrangeGrid button',wrap).forEach((b,i)=>b.setAttribute('onclick',`v138Align('${['left','centerX','right','top','centerY','bottom'][i]}')`))}

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
 return `<div class="mobileDrawerHead"><div><span class="mobileDrawerKicker">AUSWAHL</span><b>Eigenschaften</b></div><button onclick="closeEditorDrawer?.()">×</button></div><div class="v138ObjectTools">${textPanel}<section><h3>Aussehen</h3><div class="v138ObjectGrid"><label>Füllfarbe<input type="color" value="${fill==='transparent'?'#ffffff':fill}" onchange="v137Appearance('fill',this.value)"></label><label>Kontur<input type="color" value="${stroke==='transparent'?'#8d7369':stroke}" onchange="v137Appearance('stroke',this.value)"></label><label>Konturstärke<input type="number" min="0" max="30" value="${sw}" onchange="v137Appearance('strokeWidth',this.value)"></label><label>Linienart<select onchange="v137Appearance('dash',this.value)"><option value="solid" ${dash==='solid'?'selected':''}>Durchgezogen</option><option value="dashed" ${dash==='dashed'?'selected':''}>Gestrichelt</option><option value="dotted" ${dash==='dotted'?'selected':''}>Gepunktet</option></select></label><label>Ecken rund<input type="number" min="0" max="100" value="${corner||0}" onchange="v137Appearance('corner',this.value)"></label></div></section><section><h3>Größe & Drehung</h3><div class="v138ObjectGrid"><label>X<input type="number" value="${Math.round(b.x)}" onchange="v138Geometry('x',this.value)"></label><label>Y<input type="number" value="${Math.round(b.y)}" onchange="v138Geometry('y',this.value)"></label><label>Breite<input type="number" value="${Math.round(b.w)}" onchange="v138Geometry('w',this.value)"></label><label>Höhe<input type="number" value="${Math.round(b.h)}" onchange="v138Geometry('h',this.value)"></label><label>Drehung<input type="number" value="${Math.round(first.rotation||0)}" onchange="v138Geometry('rotation',this.value)"></label></div></section><section><h3>Anordnen</h3><div class="v138ObjectActions">${[['left','Links'],['centerX','Mittig'],['right','Rechts'],['top','Oben'],['centerY','Mitte'],['bottom','Unten']].map(x=>`<button onclick="v138Align('${x[0]}')">${x[1]}</button>`).join('')}</div></section></div>`
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
function polishToday(){const home=q('#view-home');if(!home)return;home.querySelector('.v138Version')?.remove();const eye=q('#headerEyebrow');if(eye&&eye.textContent!=='VERSION 166')eye.textContent='VERSION 166';const specs=[['Aufgabe','task'],['Test','test'],['Fächer','subjects'],['Lernen','learn']];qa('.homeMiniActions button',home).forEach((b,i)=>{const spec=specs[i];if(!spec||b.dataset.v138Today==='1')return;b.dataset.v138Today='1';b.classList.add('v138TodayAction');b.innerHTML=icons[spec[1]]+`<span>${spec[0]}</span>`})}
function watchVersion(){const eye=q('#headerEyebrow');if(eye&&!editor()&&eye.textContent!=='VERSION 166')eye.textContent='VERSION 166'}

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

/* v139.js consolidated */
/* Studia V139 — stable palettes, clean text formats and cloud onboarding */
(function(){
'use strict';
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
const editor=()=>document.body.classList.contains('editorMode')&&!!q('#view-sheet-editor.active');
const svg=d=>`<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const navIcons={
 text:svg('<path d="M5 5h14M12 5v14M8 19h8"/>'),
 elements:svg('<rect x="4" y="4" width="7" height="7" rx="2"/><circle cx="16.5" cy="7.5" r="3.5"/><path d="m5 20 3.5-6 3.5 6zM15 15h5v5h-5z"/>'),
 templates:svg('<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 8h8M8 12h8M8 16h5"/>'),
 pages:svg('<path d="M7 3h8l4 4v14H7zM15 3v5h4M4 7v14h11"/>'),
 layers:svg('<path d="m12 3 9 5-9 5-9-5zM4 12l8 4 8-4M4 16l8 4 8-4"/>'),
 chart:svg('<path d="M4 20V4M4 20h16"/><rect x="7" y="12" width="3" height="6" rx="1"/><rect x="12" y="8" width="3" height="10" rx="1"/><rect x="17" y="5" width="3" height="13" rx="1"/>'),
 timeline:svg('<path d="M4 12h16"/><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><path d="M5 10V6M12 14v4M19 10V6"/>'),
 sticker:svg('<path d="M12 3a8 8 0 0 0-8 8v6a4 4 0 0 0 4 4h5l7-7v-3a8 8 0 0 0-8-8z"/><path d="M13 21v-5a2 2 0 0 1 2-2h5"/>'),
 font:svg('<path d="M5 19 10.5 5h3L19 19M7 14h10M19 5v6M16 8h6"/>'),
 plus:svg('<path d="M12 5v14M5 12h14"/>'),
 edit:svg('<path d="m4 20 4.2-1 10-10-3.2-3.2-10 10zM14.8 5.8l3.2 3.2"/>')
};
let lastMode='elements',navObserver=null,drawerObserver=null,scheduled=false;
const schedule=()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;stabilize()})};

function navMarkup(){const item=(mode,label)=>`<button data-v133="${mode}" data-v138="${mode}" data-v139="${mode}" title="${label}"><span class="editorNavIcon">${navIcons[mode]}</span><span>${label}</span></button>`;return '<i class="v138NavSentinel v139NavSentinel" data-v128="v139" data-v134="v139" data-v138="sentinel"></i>'+item('text','Text')+item('elements','Elemente')+item('templates','Vorlagen')+item('pages','Seiten')+item('layers','Ebenen')}
function stableNav(){
 const nav=q('.canvasQuickNav');if(!editor()||!nav)return;const buttons=qa('button',nav),labels=buttons.map(b=>b.textContent.trim()).join('|'),valid=buttons.length===5&&labels==='Text|Elemente|Vorlagen|Seiten|Ebenen'&&buttons.every(b=>b.dataset.v139&&b.querySelector('svg'));
 if(!valid){const old=buttons.find(b=>b.classList.contains('active'))?.dataset.v138;if(old)lastMode=old;nav.innerHTML=navMarkup()}
 qa('button[data-v139]',nav).forEach(b=>{b.classList.toggle('active',b.dataset.v139===lastMode);b.onclick=()=>{lastMode=b.dataset.v139;if(typeof window.v138NavOpen==='function')window.v138NavOpen(lastMode,b);else window.v132Open?.(lastMode,b);setTimeout(stabilizeDrawer,40);setTimeout(stabilizeDrawer,140)}})
}
window.v139ForceNav=function(mode){if(mode)lastMode=mode;stableNav()};
function callTool(name){const fn=window[name];if(typeof fn!=='function')return window.cuteToast?.('Werkzeug konnte nicht geladen werden');try{fn()}catch(err){console.error('[Studia V139]',name,err);window.cuteToast?.('Werkzeug bitte noch einmal öffnen')}}
function toolButton(label,icon,fn){const b=document.createElement('button');b.type='button';b.innerHTML=navIcons[icon]+`<span>${label}</span>`;b.addEventListener('click',()=>callTool(fn));return b}
function ensureElementActions(){
 const d=q('#canvasQuickDrawer.open');if(!d||lastMode!=='elements')return;qa('.v137ElementExtras,.v138ElementTools',d).forEach(x=>x.remove());if(d.querySelector('.v140InsertTools')){qa('.v139InsertTools',d).forEach(x=>x.remove());return}let box=q('.v139InsertTools',d);if(!box){box=document.createElement('section');box.className='v139InsertTools';box.innerHTML='<div class="v139PaletteHead"><b>Diagramme & Deko</b><span>Einfügen</span></div><div class="v139InsertGrid"></div>';const grid=q('.v139InsertGrid',box);grid.append(toolButton('Diagramm','chart','openChartDialog'),toolButton('Timeline','timeline','openTimelineDialog'),toolButton('Sticker','sticker','openStickerLibrary'));(q('.v133ElementGroups',d)||q('.v134Palette',d)||d).appendChild(box)}
 for(const b of qa('button',d)){const name=b.textContent.trim();if(name==='Diagramm')b.onclick=()=>callTool('openChartDialog');if(name==='Timeline')b.onclick=()=>callTool('openTimelineDialog');if(name==='Sticker'||name==='Sticker öffnen'||name==='Süße Sticker')b.onclick=()=>callTool('openStickerLibrary')}
}
function ensureTextActions(){
 const d=q('#canvasQuickDrawer.open');if(!d)return;const isText=lastMode==='text'||/Textformate/.test(d.textContent||'');if(!isText)return;d.classList.add('v139TextDrawer');
 qa('.v128DesktopParityBar,.v129DesktopTextExtras,.v121DesktopFontActions,.v123DesktopTextActions,.v132DesktopTextExtras',d).forEach(x=>x.remove());
 if(d.querySelector('.v140TextTools')){qa('.v139TextHeaderTools',d).forEach(x=>x.remove());return}
 if(innerWidth>=900&&!q('.v139TextHeaderTools',d)){const box=document.createElement('div');box.className='v139TextHeaderTools';const font=document.createElement('button');font.type='button';font.innerHTML=navIcons.font+'<span>Schrift hinzufügen</span>';font.onclick=()=>callTool('v91PickFont');const add=document.createElement('button');add.type='button';add.innerHTML=navIcons.plus+'<span>Textformat erstellen</span>';add.onclick=()=>callTool('createCustomStylePreset');const manage=document.createElement('button');manage.type='button';manage.innerHTML=navIcons.edit+'<span>Formate verwalten</span>';manage.onclick=()=>callTool('openTextFormatManager');box.append(font,add,manage);d.prepend(box)}
}
function stabilizeDrawer(){if(!editor())return;const active=q('.canvasQuickNav button.active');if(active?.dataset.v139)lastMode=active.dataset.v139;ensureElementActions();ensureTextActions()}
function watchChrome(){
 const nav=q('.canvasQuickNav');if(nav&&nav.dataset.v139Watch!=='1'){nav.dataset.v139Watch='1';navObserver?.disconnect();navObserver=new MutationObserver(schedule);navObserver.observe(nav,{childList:true,subtree:true})}
 const drawer=q('#canvasQuickDrawer');if(drawer&&drawer.dataset.v139Watch!=='1'){drawer.dataset.v139Watch='1';drawerObserver?.disconnect();drawerObserver=new MutationObserver(schedule);drawerObserver.observe(drawer,{childList:true,subtree:true,attributes:true,attributeFilter:['class','data-v134-mode','data-v137-mode']})}
}
function stabilize(){if(!editor())return;stableNav();watchChrome();stabilizeDrawer()}

/* A click on truly empty paper always clears the old selection. */
document.addEventListener('pointerdown',e=>{if(!editor()||document.body.classList.contains('v137ViewMode')||(e.pointerType==='mouse'&&e.button!==0))return;const t=e.target instanceof Element?e.target:null;if(!t||t.closest('button,input,select,textarea,[contenteditable="true"],.v132Hit,.cobj,.vectorObj,.v138TransformHandle,.pathNode'))return;if(!t.closest('#canvasPage,#canvasStage,#canvasObjects,#v132InteractionLayer'))return;try{canvasState.multiMode=false;clearCanvasSelection();window.v132SyncHits?.();const d=q('#canvasQuickDrawer');if(d?.dataset.v137Mode==='properties')closeEditorDrawer?.()}catch(_){}},true);

/* Explain the exact Firebase flow inside the existing working cloud dialog. */
const baseAccount=window.openAccountDialog;
if(baseAccount)window.openAccountDialog=function(){const r=baseAccount.apply(this,arguments);const modal=q('#modalWrap .v135Modal');if(modal&&!q('.v139CloudGuide',modal)){const guide=document.createElement('div');guide.className='v139CloudGuide';guide.innerHTML=`<b>So verbindest du Handy und Laptop</b><ol><li>In Firebase ein kostenloses Projekt erstellen.</li><li>Authentication → Anmeldemethode → E-Mail/Passwort aktivieren.</li><li>Firestore Database erstellen und Regeln auf den eigenen Benutzer begrenzen.</li><li>Projekteinstellungen → Deine Apps → Web-App: die Konfiguration als JSON kopieren.</li><li>Auf beiden Geräten dieselbe Konfiguration, E-Mail und dasselbe Passwort verwenden.</li><li>Erstes Gerät: „Jetzt synchronisieren“. Zweites Gerät: „Cloud laden“.</li></ol><details><summary>Sichere Firestore-Regeln</summary><pre>rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null
                         && request.auth.uid == userId;
    }
  }
}</pre></details>`;const form=q('.v135FormGrid',modal);form?.before(guide)}return r};

const baseRender=window.renderSheetEditor;if(baseRender)window.renderSheetEditor=function(){const r=baseRender.apply(this,arguments);setTimeout(stabilize,980);setTimeout(stabilize,1450);return r};
const baseOpen=window.openStudySheetEditor;if(baseOpen)window.openStudySheetEditor=function(){const r=baseOpen.apply(this,arguments);setTimeout(stabilize,1050);setTimeout(stabilize,1500);return r};
window.addEventListener('resize',()=>setTimeout(stabilize,260));
new MutationObserver(()=>{if(editor())setTimeout(stabilize,0)}).observe(document.body,{attributes:true,attributeFilter:['class']});
setTimeout(stabilize,1500);
})();

/* v140.js consolidated */
/* Studia V140 — durable tools, frame sticker and Apps Script sync */
(function(){
'use strict';
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const editor=()=>document.body.classList.contains('editorMode')&&!!q('#view-sheet-editor.active');
const icon=d=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
const uploadIcon=icon('M12 16V4m0 0L7 9m5-5 5 5M5 14v5h14v-5');
const frameIcon='<svg viewBox="0 0 80 34" aria-hidden="true"><path d="M77 6v22c-4 0-7 3-7 5H10c0-2-3-5-7-5V6c4 0 7-3 7-5h60c0 2 3 5 7 5Z"/></svg>';
let wantedMode='elements',navGuard=0,elementMarkup='';

function rememberMode(){const a=q('.canvasQuickNav button.active');wantedMode=a?.dataset.v139||a?.dataset.v138||wantedMode}
function forceNav(){if(!editor())return;window.dispatchEvent(new Event('v140-stabilize'));if(typeof window.v138NavOpen!=='function')return;const nav=q('.canvasQuickNav');if(!nav)return;const labels=qa('button',nav).map(x=>x.textContent.trim()).join('|');if(labels!=='Text|Elemente|Vorlagen|Seiten|Ebenen'||qa('button svg',nav).length<5){q('.v139NavSentinel',nav)?.remove();nav.innerHTML='';if(typeof window.v139ForceNav==='function')window.v139ForceNav(wantedMode);else return}qa('button',nav).forEach(b=>{const mode=b.dataset.v139||b.dataset.v138;if(!mode)return;b.classList.toggle('active',mode===wantedMode);b.onclick=()=>{wantedMode=mode;window.v138NavOpen(mode,b);setTimeout(enhanceDrawer,0);setTimeout(enhanceDrawer,80)}})}
function guardNav(){clearInterval(navGuard);let n=0;navGuard=setInterval(()=>{forceNav();if(++n>24)clearInterval(navGuard)},100)}

function addToolCard(){const d=q('#canvasQuickDrawer.open');if(!d||wantedMode!=='elements')return;let box=q('.v140InsertTools',d);qa('.v138ElementTools,.v139InsertTools',d).forEach(x=>x.remove());if(box)return;box=document.createElement('section');box.className='v140InsertTools';box.innerHTML=`<div class="v140ToolHead"><b>Diagramme & Deko</b><span>direkt einfügen</span></div><div class="v140ToolGrid"><button data-v140-tool="chart">${icon('M4 20V4M4 20h16M8 17v-5m5 5V8m5 9V5')}<span>Diagramm</span></button><button data-v140-tool="timeline">${icon('M4 12h16M6 9v6m6-6v6m6-6v6')}<span>Timeline</span></button><button data-v140-tool="sticker">${icon('M12 3a8 8 0 0 0-8 8v6a4 4 0 0 0 4 4h5l7-7v-3a8 8 0 0 0-8-8Z')}<span>Sticker</span></button></div>`;
box.addEventListener('click',e=>{const b=e.target.closest('[data-v140-tool]');if(!b)return;e.preventDefault();e.stopPropagation();({chart:window.openChartDialog,timeline:window.openTimelineDialog,sticker:window.openStickerLibrary})[b.dataset.v140Tool]?.()});
(q('.v133ElementGroups',d)||q('.v134Palette',d)||d).appendChild(box)}
function addTextTools(){const d=q('#canvasQuickDrawer.open');if(!d||wantedMode!=='text')return;d.classList.add('v140TextDrawer');qa('.v138ElementTools,.v139InsertTools,.v140InsertTools,.v139TextHeaderTools,.v128DesktopParityBar,.v129DesktopTextExtras,.v121DesktopFontActions,.v123DesktopTextActions,.v132DesktopTextExtras',d).forEach(x=>x.remove());if(innerWidth<900||q('.v140TextTools',d))return;const bar=document.createElement('div');bar.className='v140TextTools';bar.innerHTML=`<button data-action="font">${uploadIcon}<span><b>Schrift hinzufügen</b><small>TTF, OTF, WOFF oder WOFF2</small></span></button><button data-action="preset">${icon('M12 5v14M5 12h14')}<span><b>Textformat erstellen</b><small>Aus der aktuellen Auswahl</small></span></button><button data-action="manage">${icon('M4 6h16M7 12h10M9 18h6')}<span><b>Formate verwalten</b><small>Sortieren und löschen</small></span></button>`;bar.onclick=e=>{const a=e.target.closest('button')?.dataset.action;if(a==='font')window.v91PickFont?.();if(a==='preset')window.createCustomStylePreset?.();if(a==='manage')window.openTextFormatManager?.()};d.prepend(bar)}
function enhanceDrawer(){if(!editor())return;rememberMode();const d=q('#canvasQuickDrawer.open');if(wantedMode==='elements'&&d&&!elementMarkup){const copy=d.cloneNode(true);qa('.v138ElementTools,.v139InsertTools,.v140InsertTools',copy).forEach(x=>x.remove());elementMarkup=copy.innerHTML}if(wantedMode==='elements')addToolCard();if(wantedMode==='text')addTextTools()}
function directDrawer(mode){const d=q('#canvasQuickDrawer');if(!d)return false;let html='';if(mode==='text'){try{html=mobileTextLibraryHTML()}catch(_){html='<div class="mobileDrawerSection mobileTextLibrary"><div class="mobileLibraryHead"><div><span class="mobileDrawerKicker">TEXT</span><b>Textformate</b></div><button onclick="openTextFormatManager()">Verwalten</button></div><div class="mobileDrawerActions"><button onclick="createCustomStylePreset()">＋ Neues Textformat</button></div></div>'}}else if(mode==='elements'&&elementMarkup)html=elementMarkup;else return false;try{openEditorGroup=mode==='text'?'textLibrary':'elements'}catch(_){}window.v139ForceNav?.(mode);d.dataset.v134Mode=mode;d.dataset.v137Mode=mode;d.classList.add('open');document.body.classList.add('editorDrawerOpen');d.innerHTML=html;qa('.canvasQuickNav button').forEach(x=>x.classList.toggle('active',(x.dataset.v139||x.dataset.v138)===mode));setTimeout(enhanceDrawer,0);return true}

/* The original AI ticket outline is rebuilt from dimensions, so corners and stroke never stretch. */
function frameSvg(w,h,color,width){w=Math.max(90,Math.round(w));h=Math.max(55,Math.round(h));width=Math.max(1,Math.min(30,+width||5));const m=width/2+2,r=Math.max(14,Math.min(48,h*.18,w*.08)),k=r*.55;const d=`M${w-m} ${m+r}V${h-m-r}C${w-m-k} ${h-m-r} ${w-m-r} ${h-m-k} ${w-m-r} ${h-m}H${m+r}C${m+r} ${h-m-k} ${m+k} ${h-m-r} ${m} ${h-m-r}V${m+r}C${m+k} ${m+r} ${m+r} ${m+k} ${m+r} ${m}H${w-m-r}C${w-m-r} ${m+k} ${w-m-k} ${m+r} ${w-m} ${m+r}Z`;return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><path d="${d}" fill="none" stroke="${esc(color)}" stroke-width="${width}" stroke-linejoin="round"/></svg>`}
function svgData(svg){return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)}
window.v140AddFrame=function(){const o={id:id(),z:nextCanvasZ(),kind:'image',src:'',name:'Ticket-Rahmen',x:130,y:160,w:460,h:170,rotation:0,locked:false,stickerAsset:true,frameAsset:true,style:{borderColor:'#4f4642',borderWidth:5}};o.src=svgData(frameSvg(o.w,o.h,o.style.borderColor,o.style.borderWidth));canvasState.objects.push(o);closeModal?.();canvasState.selectedType='object';canvasState.selectedId=o.id;canvasState.selectedIds=[o.id];canvasState.selectedVectorIds=[];renderCanvasObjects();renderCanvasInspector();markCanvasDirty();pushHistory();window.v132SyncHits?.();cuteToast?.('Rahmen eingefügt ♡')};
function refreshFrames(){for(const o of canvasState.objects||[]){if(!o.frameAsset)continue;o.style||={};const sig=[Math.round(o.w),Math.round(o.h),o.style.borderColor||'#4f4642',o.style.borderWidth||5].join(':');if(o.frameSignature===sig)continue;o.frameSignature=sig;o.src=svgData(frameSvg(o.w,o.h,o.style.borderColor||'#4f4642',o.style.borderWidth||5));const img=q(`.cobj[data-id="${CSS.escape(o.id)}"] img`);if(img)img.src=o.src}}
window.v140UploadSticker=function(){const input=document.createElement('input');input.type='file';input.accept='image/png,image/jpeg,image/webp,image/gif,image/svg+xml,.png,.jpg,.jpeg,.webp,.gif,.svg';input.onchange=()=>{const f=input.files?.[0];if(!f)return;const reader=new FileReader();reader.onload=()=>{const img=new Image();img.onload=()=>{const ratio=Math.max(.2,Math.min(5,img.naturalWidth/Math.max(1,img.naturalHeight))),w=ratio>1.5?320:ratio<.72?150:230,h=Math.round(w/ratio),o={id:id(),z:nextCanvasZ(),kind:'image',src:String(reader.result),name:f.name,x:150,y:150,w,h,rotation:0,locked:false,stickerAsset:true};canvasState.objects.push(o);closeModal?.();canvasState.selectedType='object';canvasState.selectedId=o.id;canvasState.selectedIds=[o.id];canvasState.selectedVectorIds=[];renderCanvasObjects();renderCanvasInspector();markCanvasDirty();pushHistory();window.v132SyncHits?.();cuteToast?.('Sticker-Datei eingefügt ♡')};img.onerror=()=>cuteToast?.('Diese Bilddatei konnte nicht geladen werden');img.src=String(reader.result)};reader.readAsDataURL(f)};input.click()};

const originalSticker=window.openStickerLibrary;
window.openStickerLibrary=function(){originalSticker?.();const modal=q('#modalWrap .v135Modal');if(!modal)return;let tools=q('.v140StickerImport',modal);if(!tools){tools=document.createElement('div');tools.className='v140StickerImport';tools.innerHTML=`<button onclick="v140UploadSticker()">${uploadIcon}<span><b>Eigene Stickerdatei</b><small>PNG, JPG, WebP, GIF oder SVG</small></span></button><button onclick="v140AddFrame()">${frameIcon}<span><b>Ticket-Rahmen</b><small>Aus deiner Illustrator-Datei · frei skalierbar</small></span></button>`;q('.v135StickerGrid',modal)?.before(tools)}};

/* Replace Firebase with a small, inspectable Apps Script/Google Drive sync. */
const syncUrlKey='studia-gas-url',syncSecretKey='studia-gas-key';
function syncState(s,bad=false){const el=q('#v140SyncState');if(el){el.textContent=s;el.classList.toggle('error',bad)}}
function syncConfig(){const url=String(q('#v140SyncUrl')?.value||'').trim(),key=String(q('#v140SyncKey')?.value||'').trim();if(!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec(?:\?.*)?$/.test(url))throw new Error('Bitte die bereitgestellte Web-App-URL mit /exec einfügen.');if(key.length<12)throw new Error('Der Sync-Schlüssel braucht mindestens 12 Zeichen.');localStorage.setItem(syncUrlKey,url);localStorage.setItem(syncSecretKey,key);return{url,key}}
window.openAccountDialog=function(){const url=localStorage.getItem(syncUrlKey)||'',key=localStorage.getItem(syncSecretKey)||'';openModal(`<div class="v135Modal v140SyncModal"><div class="v135ModalHead"><div><span class="eyebrow">GERÄTE-SYNC</span><h2>Google Apps Script</h2></div><button onclick="closeModal()">×</button></div><p>Synchronisiere Studia über eine private JSON-Datei in deinem eigenen Google Drive.</p><div class="v135FormGrid"><label class="full">Apps-Script-Web-App-URL<input id="v140SyncUrl" type="url" placeholder="https://script.google.com/macros/s/…/exec" value="${esc(url)}"></label><label class="full">Persönlicher Sync-Schlüssel<input id="v140SyncKey" autocomplete="off" placeholder="mindestens 12 Zeichen" value="${esc(key)}"></label></div><div id="v140SyncState" class="v140SyncState"></div><div class="v135ActionRow"><button onclick="v140SyncDownload()">Cloud laden</button><button class="primary" onclick="v140SyncUpload()">Jetzt synchronisieren</button></div><details class="v140SyncHelp"><summary>Einmalige Einrichtung anzeigen</summary><ol><li>Auf script.google.com ein neues Projekt öffnen.</li><li>Den Inhalt aus <b>google-apps-script/Code.gs</b> in den Editor kopieren.</li><li>Bereitstellen → Neue Bereitstellung → Web-App.</li><li>Ausführen als „Ich“, Zugriff „Jeder“, dann bereitstellen.</li><li>Die /exec-URL und denselben geheimen Schlüssel auf Handy und Laptop eintragen.</li></ol><p>Erst auf dem Gerät mit den aktuellen Daten „Jetzt synchronisieren“, danach auf dem anderen „Cloud laden“.</p></details></div>`)};
window.v140SyncUpload=async function(){try{const c=syncConfig();syncState('Daten werden hochgeladen …');const form=new FormData();form.set('action','save');form.set('key',c.key);form.set('payload',JSON.stringify(data));await fetch(c.url,{method:'POST',mode:'no-cors',body:form});syncState('Synchronisierung gesendet ✓');cuteToast?.('Studia wurde synchronisiert ♡')}catch(err){syncState(String(err.message||err),true)}};
window.v140SyncDownload=function(){try{const c=syncConfig(),cb='studiaSync_'+Date.now()+'_'+Math.random().toString(36).slice(2),script=document.createElement('script');syncState('Cloud-Daten werden geladen …');const done=()=>{delete window[cb];script.remove()};window[cb]=result=>{try{if(!result?.ok)throw new Error(result?.error||'Cloud-Daten konnten nicht geladen werden.');const remote=JSON.parse(result.payload||'{}');Object.keys(data).forEach(k=>delete data[k]);Object.assign(data,remote);save();syncState('Cloud-Daten geladen ✓');cuteToast?.('Cloud-Daten geladen ♡');setTimeout(()=>location.reload(),500)}catch(err){syncState(String(err.message||err),true)}finally{done()}};script.onerror=()=>{syncState('Web-App nicht erreichbar. Prüfe URL und Bereitstellung.',true);done()};const u=new URL(c.url);u.searchParams.set('action','load');u.searchParams.set('key',c.key);u.searchParams.set('callback',cb);script.src=u.toString();document.head.appendChild(script)}catch(err){syncState(String(err.message||err),true)}};
window.v135CloudAuth=()=>window.openAccountDialog();window.v135CloudUpload=silent=>silent?Promise.resolve():window.v140SyncUpload();window.v135CloudDownload=()=>window.v140SyncDownload();

const baseRender=window.renderCanvasObjects;window.renderCanvasObjects=function(){const r=baseRender.apply(this,arguments);refreshFrames();return r};try{renderCanvasObjects=window.renderCanvasObjects}catch(_){}
const baseInspector=window.renderCanvasInspector;window.renderCanvasInspector=function(){const r=baseInspector.apply(this,arguments);refreshFrames();return r};try{renderCanvasInspector=window.renderCanvasInspector}catch(_){}

/* A genuine paper click clears selection; empty drags remain marquee selection. */
document.addEventListener('click',e=>{if(!editor()||document.body.classList.contains('v137ViewMode'))return;const t=e.target instanceof Element?e.target:null;if(!t||t.closest('.cobj,.vectorObj,.v132Hit,.v138TransformHandle,.pathNode,button,input,select,textarea,[contenteditable="true"]')||!t.closest('#canvasPage,#canvasStage,#canvasObjects,#v132InteractionLayer'))return;canvasState.multiMode=false;clearCanvasSelection?.();window.v132SyncHits?.();renderCanvasInspector?.()},true);

const bodyWatch=new MutationObserver(()=>{if(editor()){guardNav();setTimeout(enhanceDrawer,0)}});bodyWatch.observe(document.body,{attributes:true,attributeFilter:['class']});
const navWatch=new MutationObserver(()=>{if(editor()){rememberMode();forceNav()}});
setTimeout(()=>{const nav=q('.canvasQuickNav');if(nav)navWatch.observe(nav,{childList:true,subtree:true});if(editor()){guardNav();enhanceDrawer()}},250);
document.addEventListener('click',e=>{const b=e.target.closest('.canvasQuickNav button');if(!b)return;const mode=b.dataset.v139||b.dataset.v138||b.dataset.v133;if(!mode)return;e.preventDefault();e.stopImmediatePropagation();wantedMode=mode;setTimeout(()=>{forceNav();if(directDrawer(mode))return;const current=q(`.canvasQuickNav button[data-v139="${mode}"]`)||q(`.canvasQuickNav button[data-v138="${mode}"]`);window.v138NavOpen?.(mode,current);setTimeout(enhanceDrawer,20)},0)},true);
window.addEventListener('resize',()=>setTimeout(()=>{forceNav();enhanceDrawer()},120));
})();

/* v141.js consolidated */
(function(){
'use strict';
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
const isEditor=()=>document.body.classList.contains('editorMode');
const isDesktop=()=>innerWidth>=900;
const icon=(path)=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>`;
const paletteIcon=icon('M12 3a9 9 0 1 0 0 18h1.5a2 2 0 0 0 0-4H12a2 2 0 0 1 0-4h5a4 4 0 0 0 0 0-8.2A8.9 8.9 0 0 0 12 3Z');
let openedDesktopOnce=false;
/* The retired GitHub sync must never keep running invisibly. */
localStorage.removeItem('studia-sync-auto');

function selectedStickerObjects(){
 const ids=new Set([...(canvasState?.selectedIds||[]),canvasState?.selectedId].filter(Boolean));
 return (canvasState?.objects||[]).filter(o=>ids.has(o.id)&&o.stickerAsset&&!o.frameAsset);
}
function commitSticker(message){
 renderCanvasObjects?.();renderCanvasInspector?.();markCanvasDirty?.();pushHistory?.();window.v132SyncHits?.();
 if(message)window.cuteToast?.(message);
}
window.v141StickerTint=function(color){const list=selectedStickerObjects();if(!list.length)return window.cuteToast?.('Wähle zuerst einen Sticker ♡');list.forEach(o=>o.tintColor=color);commitSticker('Stickerfarbe geändert ♡')};
window.v141StickerOriginal=function(){const list=selectedStickerObjects();if(!list.length)return;list.forEach(o=>delete o.tintColor);commitSticker('Originalfarben wiederhergestellt ♡')};
function applyStickerTints(){
 for(const o of canvasState?.objects||[]){
  if(!o.stickerAsset||o.frameAsset)continue;
  const el=q(`.cobj[data-id="${CSS.escape(o.id)}"]`);if(!el)continue;
  el.classList.toggle('v141StickerTinted',!!o.tintColor);
  if(o.tintColor){el.style.setProperty('--v141-sticker-color',o.tintColor);el.style.setProperty('--v141-sticker-mask',`url("${String(o.src||'').replace(/"/g,'%22')}")`)}
  else{el.style.removeProperty('--v141-sticker-color');el.style.removeProperty('--v141-sticker-mask')}
 }
}
function stickerPanelHTML(){
 const list=selectedStickerObjects(),color=list[0]?.tintColor||'#e7919b';if(!list.length)return '';
 return `<section class="v137InspectorSection v141StickerSection"><div class="v137InspectorHead"><b>Stickerfarbe</b><span>${list.length>1?list.length+' Sticker':'Deko'}</span></div><div class="v141StickerColor"><label>${paletteIcon}<span>Farbe</span><input type="color" value="${color}" onchange="v141StickerTint(this.value)"></label><button onclick="v141StickerOriginal()">Originalfarben</button></div><p>Die neue Farbe nutzt die transparente Form des Stickers. Mit „Originalfarben“ stellst du das Bild wieder her.</p></section>`;
}
function decorateDesktopInspector(){
 const wrap=q('#canvasInspector .v137Inspector');if(!wrap)return;
 wrap.querySelector('.v141StickerSection')?.remove();const html=stickerPanelHTML();if(html)wrap.insertAdjacentHTML('afterbegin',html);
 qa('.v138TransparentActions',wrap).forEach(x=>x.remove());
}
function addCompactTransparency(root){
 for(const label of qa('.v138ObjectGrid label',root)){
  const name=(label.firstChild?.textContent||label.textContent||'').trim();if(!/^Füllfarbe$|^Kontur$/.test(name)||label.querySelector('.v141TransparentIcon'))continue;
  const prop=name==='Füllfarbe'?'fill':'stroke',b=document.createElement('button');b.type='button';b.className='v141TransparentIcon';b.title=name==='Füllfarbe'?'Keine Füllung':'Keine Kontur';b.setAttribute('aria-label',b.title);b.innerHTML=icon('M4 4l16 16M7 4h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3Z');b.onclick=e=>{e.preventDefault();e.stopPropagation();window.v137Appearance?.(prop,'transparent')};label.classList.add('v141ColorWithNone');label.appendChild(b)
 }
}

function closeMobileProperties(){q('#v141PropertiesOverlay')?.remove();document.body.classList.remove('v141PropertiesOpen')}
window.v141CloseProperties=closeMobileProperties;
const baseProperties=window.v138OpenProperties;
window.v138OpenProperties=function(){
 if(!isEditor())return;
 if(isDesktop()){
  document.body.classList.remove('v135SideClosed');localStorage.setItem('studia-v135-side','open');
  try{window.v102RightTab?.('design')}catch(_){ }
  renderCanvasInspector?.();setTimeout(decorateDesktopInspector,0);return;
 }
 baseProperties?.();
 const drawer=q('#canvasQuickDrawer'),source=drawer?.innerHTML||'<div class="v138ObjectTools">Bitte zuerst etwas auswählen.</div>';
 drawer?.classList.remove('open');drawer?.removeAttribute('data-v137-mode');document.body.classList.remove('editorDrawerOpen');
 closeMobileProperties();
 const overlay=document.createElement('div');overlay.id='v141PropertiesOverlay';overlay.innerHTML=`<button class="v141PropertiesBackdrop" aria-label="Eigenschaften schließen" onclick="v141CloseProperties()"></button><section class="v141PropertiesSheet" role="dialog" aria-modal="true" aria-label="Eigenschaften"><div class="v141SheetHandle"></div><div class="v141PropertiesBody">${source}</div></section>`;
 document.body.appendChild(overlay);document.body.classList.add('v141PropertiesOpen');
 const body=q('.v141PropertiesBody',overlay),head=q('.mobileDrawerHead',body);if(head){const b=q('button',head);if(b)b.setAttribute('onclick','v141CloseProperties()')}
 qa('.v138TransparentActions',body).forEach(x=>x.remove());addCompactTransparency(body);const sticker=stickerPanelHTML();if(sticker)q('.v138ObjectTools',body)?.insertAdjacentHTML('afterbegin',sticker);
 requestAnimationFrame(()=>q('.v141PropertiesSheet',overlay)?.classList.add('open'));
};
try{v138OpenProperties=window.v138OpenProperties}catch(_){ }

function removeDuplicateTools(){
 qa('.v135MobileExtras,.v137ElementExtras,.v138ElementTools,.v139InsertTools,.v138TransparentActions').forEach(x=>x.remove());
 const drawer=q('#canvasQuickDrawer');if(!drawer)return;
 const mode=drawer.dataset.v139Mode||drawer.dataset.v138Mode||drawer.dataset.v137Mode||drawer.dataset.v134Mode||'',textView=!!drawer.querySelector('.mobileTextModeContent,.mobileTextEditor,.mobileTextLibrary')||/Text bearbeiten|Textformate/.test(drawer.textContent||'');
 if(mode!=='elements'||textView)qa('.v140InsertTools',drawer).forEach(x=>x.remove());
}
function watchDrawer(){const drawer=q('#canvasQuickDrawer');if(!drawer||drawer.dataset.v141Watch==='1')return;drawer.dataset.v141Watch='1';new MutationObserver(()=>requestAnimationFrame(removeDuplicateTools)).observe(drawer,{childList:true,subtree:true,attributes:true,attributeFilter:['class','data-v137-mode','data-v134-mode']})}

function repairDesktopChrome(){
 if(!isEditor()||!isDesktop()){openedDesktopOnce=false;return}
 if(!openedDesktopOnce){document.body.classList.remove('v135SideClosed');localStorage.setItem('studia-v135-side','open');openedDesktopOnce=true}
 const nav=q('.canvasQuickNav');if(nav){nav.style.removeProperty('display');nav.removeAttribute('hidden')}
 const side=q('#desktopEditorSidebar');if(side){side.style.removeProperty('display');side.removeAttribute('hidden')}
 if(typeof window.v139ForceNav==='function'&&qa('.canvasQuickNav button').length!==5)window.v139ForceNav('elements');
}

function cleanSettings(){
 const view=q('#view-settings');if(!view)return;
 qa('.v113SyncPanel',view).forEach(x=>x.remove());
 for(const panel of qa('.section.panel',view)){const text=panel.textContent||'';if(/GitHub Token|Gist-ID|GitHub-Sync|Firebase|Firecloud/i.test(text)&&!panel.classList.contains('v137CloudSettings'))panel.remove()}
 const box=q('.v137CloudSettings',view);if(box&&!box.classList.contains('v141GoogleSyncCard')){box.classList.add('v141GoogleSyncCard');box.innerHTML=`<div class="v141SettingsTitle"><span>${icon('M8 17a4 4 0 0 1 .7-7.9A5.5 5.5 0 0 1 19 10.5 3.5 3.5 0 0 1 18.5 17H8Z')}</span><div><h2>Google-Sync</h2><p class="small">Eine private Sicherung in deinem Google Drive – für Handy und Laptop.</p></div></div><button class="primary" onclick="openAccountDialog()">Google-Sync öffnen</button>`}
}

window.openAccountDialog=function(){
 const url=localStorage.getItem('studia-gas-url')||'',key=localStorage.getItem('studia-gas-key')||'';
 openModal(`<div class="v135Modal v140SyncModal v141SyncModal"><div class="v135ModalHead"><div><span class="eyebrow">GOOGLE DRIVE</span><h2>Handy und Laptop synchronisieren</h2></div><button onclick="closeModal()">×</button></div><p class="v141SyncIntro">Beide Geräte verwenden dieselbe private Sicherungsdatei über dein eigenes Google Apps Script und Google Drive.</p><div class="v135FormGrid"><label class="full">Apps-Script-Web-App-URL<input id="v140SyncUrl" type="url" placeholder="https://script.google.com/macros/s/…/exec" value="${String(url).replace(/&/g,'&amp;').replace(/"/g,'&quot;')}"></label><label class="full">Persönlicher Sync-Schlüssel<input id="v140SyncKey" autocomplete="off" placeholder="auf Handy und Laptop exakt gleich" value="${String(key).replace(/&/g,'&amp;').replace(/"/g,'&quot;')}"></label></div><div id="v140SyncState" class="v140SyncState"></div><div class="v141SyncChoices"><button class="v141Upload" onclick="v140SyncUpload()"><b>↑ Diesen Stand hochladen</b><span>Speichert die Daten von diesem Gerät in Google Drive und überschreibt dort die vorige Sicherung.</span></button><button class="v141Download" onclick="v141ConfirmDownload()"><b>↓ Sicherung auf dieses Gerät laden</b><span>Ersetzt die Daten auf diesem Gerät durch den Stand aus Google Drive.</span></button></div><div class="v141SyncWarning"><b>Wichtig:</b> Zuerst auf dem Gerät mit dem richtigen, neuesten Stand hochladen. Danach auf dem anderen Gerät herunterladen.</div><details class="v140SyncHelp"><summary>Einmalige Einrichtung anzeigen</summary><ol><li>Auf script.google.com ein neues Projekt öffnen.</li><li><b>google-apps-script/Code.gs</b> vollständig hineinkopieren.</li><li>Bereitstellen → Neue Bereitstellung → Web-App.</li><li>Ausführen als „Ich“, Zugriff „Jeder“, dann bereitstellen.</li><li>Dieselbe /exec-URL und denselben Schlüssel auf beiden Geräten eintragen.</li></ol></details></div>`);
};
window.v141ConfirmDownload=function(){if(confirm('Google-Sicherung laden? Die aktuellen Daten auf diesem Gerät werden ersetzt.'))window.v140SyncDownload?.()};

function makeDialogsReliable(){
 const modal=q('#modalWrap .v135Modal');if(!modal)return;
 if(q('#v135ChartLabels',modal))modal.classList.add('v141ChartDialog');
 if(q('#v135TimeLabels',modal))modal.classList.add('v141TimelineDialog');
}
function reconcile(){
 repairDesktopChrome();watchDrawer();removeDuplicateTools();cleanSettings();applyStickerTints();decorateDesktopInspector();makeDialogsReliable();
 if(!isEditor())closeMobileProperties();
}

const baseObjects=window.renderCanvasObjects;
window.renderCanvasObjects=function(){const r=baseObjects?.apply(this,arguments);applyStickerTints();return r};try{renderCanvasObjects=window.renderCanvasObjects}catch(_){ }
const baseInspector=window.renderCanvasInspector;
window.renderCanvasInspector=function(){const r=baseInspector?.apply(this,arguments);decorateDesktopInspector();return r};try{renderCanvasInspector=window.renderCanvasInspector}catch(_){ }
const baseSettings=window.renderSettings;
if(baseSettings)window.renderSettings=function(){const r=baseSettings.apply(this,arguments);requestAnimationFrame(cleanSettings);return r};try{renderSettings=window.renderSettings}catch(_){ }
const baseModal=window.openModal;
if(baseModal)window.openModal=function(){const r=baseModal.apply(this,arguments);requestAnimationFrame(makeDialogsReliable);return r};try{openModal=window.openModal}catch(_){ }

document.addEventListener('keydown',e=>{if(e.key==='Escape'&&q('#v141PropertiesOverlay'))closeMobileProperties()},true);
document.addEventListener('click',e=>{if(!isEditor())return;const b=e.target.closest('.v138Properties,button[title="Eigenschaften"],button[aria-label="Eigenschaften"]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();window.v138OpenProperties()},true);
const observer=new MutationObserver(()=>requestAnimationFrame(reconcile));observer.observe(document.body,{attributes:true,attributeFilter:['class']});
window.addEventListener('resize',()=>setTimeout(reconcile,100));setTimeout(reconcile,500);setTimeout(reconcile,1400);
})();

/* ===== Studia V145 — complete sync, mobile font scrolling and print ===== */
(function(){
'use strict';
const q=(s,r=document)=>r.querySelector(s), qa=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const isEditor=()=>document.body.classList.contains('editorMode')&&!!q('#view-sheet-editor.active');
const isDesktop=()=>innerWidth>=900;
const textKinds=new Set(['text','block','task','merke']);
const selectedText=()=>{try{const o=(canvasState?.objects||[]).find(x=>x.id===canvasState?.selectedId);return o&&textKinds.has(o.kind)?o:null}catch(_){return null}};

/* ---------- version ---------- */
function setVersion(){const e=q('#headerEyebrow');if(e&&e.textContent!=='VERSION 166')e.textContent='VERSION 166';document.title='Studia'}
setVersion();setTimeout(setVersion,250);setTimeout(setVersion,1800);

/* ---------- custom fonts: visible input + IndexedDB + previews ---------- */
const FONT_KEY='schoolbloom-v91-custom-fonts', FONT_OLD='schoolbloom-custom-fonts';
const FONT_DB='studia-fonts-v144', FONT_STORE='fonts';
function fontDB(){return new Promise((res,rej)=>{const r=indexedDB.open(FONT_DB,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(FONT_STORE))r.result.createObjectStore(FONT_STORE,{keyPath:'name'})};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function fontDBPut(obj){const db=await fontDB();return new Promise((res,rej)=>{const tx=db.transaction(FONT_STORE,'readwrite');tx.objectStore(FONT_STORE).put(obj);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error)})}
async function fontDBAll(){try{const db=await fontDB();return await new Promise((res,rej)=>{const r=db.transaction(FONT_STORE).objectStore(FONT_STORE).getAll();r.onsuccess=()=>res(r.result||[]);r.onerror=()=>rej(r.error)})}catch(_){return []}}
function localFonts(){try{return JSON.parse(localStorage.getItem(FONT_KEY)||'[]').filter(x=>x?.name&&x?.data)}catch(_){return []}}
function fontNameFromFile(f){return (f?.name||'Eigene Schrift').replace(/\.(ttf|otf|woff2?)$/i,'').trim()||'Eigene Schrift'}
async function installFont(font){if(!font?.name||!font?.data)return false;try{
  if(document.fonts?.check?.(`12px ${JSON.stringify(font.name)}`))return true;
  if('FontFace' in window&&document.fonts){const face=new FontFace(font.name,`url(${JSON.stringify(font.data)})`);await face.load();document.fonts.add(face);return true}
 }catch(err){console.warn('[Studia V145] FontFace load failed',err)}
 const sid='v144-font-'+font.name.replace(/[^a-z0-9_-]/gi,'-');if(!q('#'+CSS.escape(sid))){const st=document.createElement('style');st.id=sid;st.textContent=`@font-face{font-family:${JSON.stringify(font.name)};src:url(${JSON.stringify(font.data)});font-display:swap}`;document.head.appendChild(st)}return true;
}
async function allCustomFonts(){const map=new Map();for(const f of localFonts())map.set(f.name,f);for(const f of await fontDBAll())map.set(f.name,f);return [...map.values()]}
async function loadAllFonts(){for(const f of await allCustomFonts())await installFont(f);refreshDesktopFontSelects()}
function persistLegacyFont(font){
 try{let a=localFonts().filter(x=>x.name!==font.name);a.push(font);localStorage.setItem(FONT_KEY,JSON.stringify(a))}catch(e){console.warn('[Studia V145] local font cache full; IndexedDB remains active',e)}
 try{let a=JSON.parse(localStorage.getItem(FONT_OLD)||'[]');a=a.filter(x=>x?.name!==font.name&&x?.css!==font.name);a.push({name:font.name,css:font.name,data:font.data});localStorage.setItem(FONT_OLD,JSON.stringify(a))}catch(_){ }
}
window.v144HandleFontFile=async function(input){const f=input?.files?.[0];if(!f)return;try{
 if(f.size>8*1024*1024)throw new Error('Die Schriftdatei ist zu groß. Bitte unter 8 MB verwenden.');
 const dataUrl=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result||''));r.onerror=()=>rej(r.error);r.readAsDataURL(f)});
 const font={name:fontNameFromFile(f),data:dataUrl,type:f.type||''};
 /* Validate before claiming success. */
 if('FontFace' in window){const test=new FontFace(font.name,`url(${JSON.stringify(dataUrl)})`);await test.load();document.fonts?.add(test)}
 await fontDBPut(font);persistLegacyFont(font);await installFont(font);refreshDesktopFontSelects();
 try{window.v91LoadFonts?.()}catch(_){ }
 window.cuteToast?.(`Schrift „${font.name}“ hinzugefügt ♡`);
 if(q('#v144FontBrowser'))window.v144OpenFontBrowser();
 scheduleAutoPush(300);
 }catch(err){console.error(err);alert('Die Schrift konnte nicht hinzugefügt werden: '+String(err.message||err))}finally{input.value=''}};

function ensureGlobalFontInput(){if(q('#v144GlobalFontInput'))return;const inp=document.createElement('input');inp.id='v144GlobalFontInput';inp.type='file';inp.accept='.ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2';inp.hidden=true;inp.addEventListener('change',()=>v144HandleFontFile(inp));document.body.appendChild(inp)}
window.v144PickFont=function(){ensureGlobalFontInput();q('#v144GlobalFontInput')?.click()};
/* Make every old “add font” action use the reliable input. */
window.v91PickFont=window.v144PickFont;

const baseFonts=[
 {name:'Inter',css:'Inter, Arial, sans-serif'}, {name:'Arial',css:'Arial, sans-serif'},
 {name:'Lato',css:'Lato, Arial, sans-serif'}, {name:'Playfair Display',css:"'Playfair Display', Georgia, serif"},
 {name:'Georgia',css:'Georgia, serif'}, {name:'Verdana',css:'Verdana, sans-serif'},
 {name:'Trebuchet MS',css:"'Trebuchet MS', sans-serif"}, {name:'Times New Roman',css:"'Times New Roman', serif"}
];
async function fontChoices(){const custom=await allCustomFonts();return [...baseFonts,...custom.map(f=>({name:f.name,css:JSON.stringify(f.name),custom:true}))]}
function useFont(css){const o=selectedText();if(!o)return window.cuteToast?.('Wähle zuerst einen Text aus ♡');window.applyTextProperty?.('fontFamily',css);window.renderCanvasObjects?.();window.renderCanvasInspector?.()}
window.v144UseFont=function(css){useFont(css);q('#modalWrap')&&window.closeModal?.()};
window.v144OpenFontBrowser=async function(){const fonts=await fontChoices(),current=selectedText()?.style?.fontFamily||'';const cards=fonts.map(f=>`<button class="v144FontCard ${current&&String(current).includes(f.name)?'selected':''}" onclick='v144UseFont(${JSON.stringify(f.css)})'><span style="font-family:${esc(f.css)}">Aa Bb 123</span><b style="font-family:${esc(f.css)}">${esc(f.name)}</b><small>${f.custom?'Eigene Schrift':'Standard'}</small></button>`).join('');window.openModal?.(`<div class="v135Modal v144FontModal" id="v144FontBrowser"><div class="v135ModalHead"><div><span class="eyebrow">SCHRIFTEN</span><h2>Schrift auswählen</h2></div><button onclick="closeModal()">×</button></div><p>Du siehst jede Schrift direkt als Vorschau. Eigene TTF-, OTF-, WOFF- oder WOFF2-Dateien kannst du hier hinzufügen.</p><label class="v144RealFontUpload"><span><b>Aa＋</b><strong>Eigene Schrift hinzufügen</strong><small>TTF · OTF · WOFF · WOFF2</small></span><input type="file" accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2" onchange="v144HandleFontFile(this)"></label><div class="v144FontGrid">${cards}</div></div>`)};
window.v144UseFontInline=async function(css){useFont(css);await window.v96OpenFontPicker?.()};
const v145BaseMobileTextMode=window.mobileTextMode;
window.mobileTextMode=function(kind,btn){q('#mobileTextModeContent')?.classList.remove('v145FontScrollMode');return v145BaseMobileTextMode?.apply(this,arguments)};
try{mobileTextMode=window.mobileTextMode}catch(_){ }
window.v96OpenFontPicker=async function(){const o=selectedText();if(!o)return window.cuteToast?.('Wähle zuerst einen Text aus ♡');const content=q('#mobileTextModeContent');if(!content)return;const fonts=await fontChoices(),current=o.style?.fontFamily||'Arial';content.classList.add('v145FontScrollMode');content.scrollTop=0;content.innerHTML=`<div class="v96FontPicker v144InlineFontPicker v145InlineFontPicker"><div class="v96InlineHead"><button onclick="mobileTextMode('text')">‹</button><div><b>Schriftart</b><small>Alle Schriften sind hier vollständig scrollbar.</small></div></div><label class="v144RealFontUpload v144InlineUpload"><span><b>Aa＋</b><strong>Eigene Schrift hinzufügen</strong><small>TTF · OTF · WOFF · WOFF2</small></span><input type="file" accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2" onchange="v144HandleFontFile(this)"></label><div class="v144FontGrid v145FontScrollList">${fonts.map(f=>`<button class="v144FontCard ${String(current).includes(f.name)?'selected':''}" onclick='v144UseFontInline(${JSON.stringify(f.css)})'><span style="font-family:${esc(f.css)}">Aa Bb 123</span><b style="font-family:${esc(f.css)}">${esc(f.name)}</b><small>${f.custom?'Eigene Schrift':'Standard'}</small></button>`).join('')}</div></div>`};

function refreshDesktopFontSelects(){allCustomFonts().then(custom=>{for(const sel of qa('.v134FormatTools select.font,.v137Font')){const cur=sel.value;const list=[...baseFonts,...custom.map(f=>({name:f.name,css:f.name}))];sel.innerHTML=list.map(f=>`<option value="${esc(f.css)}" style="font-family:${esc(f.css)}">${esc(f.name)}</option>`).join('');if([...sel.options].some(o=>o.value===cur))sel.value=cur;sel.style.fontFamily=sel.value||'Arial'} })}

/* ---------- mobile text properties: reuse the full Text/Aussehen/Abstand/Position/Effekte controls ---------- */
const oldProperties=window.v138OpenProperties;
window.v138OpenProperties=function(){
 if(innerWidth>=900||!selectedText())return oldProperties?.apply(this,arguments);
 q('#v141PropertiesOverlay')?.remove();
 const html=(typeof window.mobileTextControlsHTML==='function'?window.mobileTextControlsHTML():typeof mobileTextControlsHTML==='function'?mobileTextControlsHTML():'');
 const overlay=document.createElement('div');overlay.id='v141PropertiesOverlay';overlay.className='v144TextPropertiesOverlay';overlay.innerHTML=`<button class="v141PropertiesBackdrop" aria-label="Eigenschaften schließen" onclick="v141CloseProperties()"></button><section class="v141PropertiesSheet v144TextPropertiesSheet"><div class="v141SheetHandle"></div><div class="v144TextPropHead"><div><b>Text</b><small>Eigenschaften</small></div><button onclick="v141CloseProperties()">×</button></div><div class="v144TextPropertiesBody">${html}</div></section>`;document.body.appendChild(overlay);document.body.classList.add('v141PropertiesOpen');requestAnimationFrame(()=>q('.v141PropertiesSheet',overlay)?.classList.add('open'));
};
try{v138OpenProperties=window.v138OpenProperties}catch(_){ }

/* ---------- desktop left rail: visually only Text / Elemente / Vorlagen ---------- */
function desktopTextHub(){
 if(!isEditor()||!isDesktop())return;
 const nav=q('.canvasQuickNav');if(nav){for(const b of qa('button',nav)){const label=b.textContent.trim();b.classList.toggle('v144DesktopHiddenNav',label==='Seiten'||label==='Ebenen')}}
 const drawer=q('#canvasQuickDrawer.open');if(!drawer)return;
 const active=qa('.canvasQuickNav button').find(b=>b.classList.contains('active'))?.textContent.trim();
 if(active!=='Text'&&!/Textformate|Text bearbeiten|Schrift/.test(drawer.textContent||''))return;
 qa('.v139TextHeaderTools,.v128DesktopParityBar,.v129DesktopTextExtras,.v121DesktopFontActions,.v123DesktopTextActions,.v132DesktopTextExtras').forEach(x=>x.remove());
 if(!q('.v144DesktopTextHub',drawer)){
   const hub=document.createElement('div');hub.className='v144DesktopTextHub';hub.innerHTML=`<button onclick="v144OpenFontBrowser()"><span class="v144HubIcon">Aa</span><span><b>Schriften</b><small>Vorschau & auswählen</small></span></button><label class="v144HubUpload"><span class="v144HubIcon">＋</span><span><b>Schrift hinzufügen</b><small>TTF · OTF · WOFF</small></span><input type="file" accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2" onchange="v144HandleFontFile(this)"></label><button onclick="createCustomStylePreset()"><span class="v144HubIcon">H1</span><span><b>Textformat</b><small>Eigenes Format erstellen</small></span></button>`;drawer.prepend(hub)
 }
}
const drawerObserver=new MutationObserver(()=>requestAnimationFrame(desktopTextHub));
setTimeout(()=>{const d=q('#canvasQuickDrawer');if(d)drawerObserver.observe(d,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});desktopTextHub()},700);
window.addEventListener('resize',()=>setTimeout(desktopTextHub,100));
document.addEventListener('click',e=>{if(e.target.closest('.canvasQuickNav button'))setTimeout(desktopTextHub,50)},true);

/* ---------- sticker color: ensure it is available on both property surfaces ---------- */
function ensureStickerColorUI(){
 if(!isEditor())return;let selected=[];try{const ids=new Set([...(canvasState.selectedIds||[]),canvasState.selectedId].filter(Boolean));selected=(canvasState.objects||[]).filter(o=>ids.has(o.id)&&o.stickerAsset&&!o.frameAsset)}catch(_){return}if(!selected.length)return;
 const color=selected[0].tintColor||'#e7919b';
 for(const host of [q('#canvasInspector'),q('.v141PropertiesBody'),q('.v144TextPropertiesBody')].filter(Boolean)){
  if(q('.v144StickerColors',host))continue;const section=document.createElement('section');section.className='v144StickerColors';section.innerHTML=`<div><b>Stickerfarbe</b><small>Farbe des Stickers ändern</small></div><label><input type="color" value="${color}" onchange="v141StickerTint(this.value)"><span>Farbe</span></label><button onclick="v141StickerOriginal()">Original</button>`;host.prepend(section)
 }
}
const oldInspector144=window.renderCanvasInspector;window.renderCanvasInspector=function(){const r=oldInspector144?.apply(this,arguments);requestAnimationFrame(ensureStickerColorUI);return r};try{renderCanvasInspector=window.renderCanvasInspector}catch(_){ }

/* ---------- group duplication: duplicated group always gets a fresh independent group id ---------- */
window.duplicateSelected=function(){
 try{
  const ids=new Set([...(canvasState.selectedIds||[]),canvasState.selectedType==='object'?canvasState.selectedId:null].filter(Boolean));
  const vids=new Set([...(canvasState.selectedVectorIds||[]),canvasState.selectedType==='vector'?canvasState.selectedId:null].filter(Boolean));
  const groupIds=new Set();
  for(const o of canvasState.objects||[])if(ids.has(o.id)&&o.groupId)groupIds.add(o.groupId);
  for(const v of canvasState.vectors||[])if(vids.has(v.id)&&v.groupId)groupIds.add(v.groupId);
  if(groupIds.size){for(const o of canvasState.objects||[])if(groupIds.has(o.groupId))ids.add(o.id);for(const v of canvasState.vectors||[])if(groupIds.has(v.groupId))vids.add(v.id)}
  if(!ids.size&&!vids.size)return window.cuteToast?.('Wähle zuerst etwas aus ♡');
  const clone=x=>typeof structuredClone==='function'?structuredClone(x):JSON.parse(JSON.stringify(x));
  const newIds=[],newVids=[],map=new Map(),seed=(crypto.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2));
  const newGroup=old=>{if(!old)return '';if(!map.has(old))map.set(old,'grp-v144-'+seed+'-'+map.size);return map.get(old)};let z=typeof nextCanvasZ==='function'?nextCanvasZ():100;
  for(const src of (canvasState.objects||[]).filter(o=>ids.has(o.id))){const o=clone(src);o.id=typeof id==='function'?id():'o-'+crypto.randomUUID();o.x=(+o.x||0)+18;o.y=(+o.y||0)+18;o.z=z++;o.locked=false;o.editing=false;if(o.groupId)o.groupId=newGroup(o.groupId);canvasState.objects.push(o);newIds.push(o.id)}
  for(const src of (canvasState.vectors||[]).filter(v=>vids.has(v.id))){const v=clone(src);v.id=typeof id==='function'?id():'v-'+crypto.randomUUID();v.z=z++;v.locked=false;if(v.groupId)v.groupId=newGroup(v.groupId);if(v.x!=null){v.x=(+v.x||0)+18;v.y=(+v.y||0)+18}if(v.cx!=null){v.cx=(+v.cx||0)+18;v.cy=(+v.cy||0)+18}if(Array.isArray(v.points))v.points=v.points.map(p=>[(+p[0]||0)+18,(+p[1]||0)+18]);canvasState.vectors.push(v);newVids.push(v.id)}
  canvasState.selectedIds=newIds;canvasState.selectedVectorIds=newVids;canvasState.selectedType=newIds.length?'object':'vector';canvasState.selectedId=newIds.at(-1)||newVids.at(-1)||null;canvasState.multiMode=false;
  renderCanvasObjects?.();renderVectors?.();renderCanvasInspector?.();renderLayerList?.();markCanvasDirty?.();pushHistory?.();window.v132SyncHits?.();window.cuteToast?.('Als getrennte Gruppe dupliziert ♡');
 }catch(err){console.error('[Studia V145] duplicate',err);window.cuteToast?.('Duplizieren fehlgeschlagen')}
};
try{duplicateSelected=window.duplicateSelected}catch(_){ }

/* ---------- automatic Google Apps Script sync: complete Studia state ---------- */
const SYNC_URL='studia-gas-url',SYNC_KEY='studia-gas-key',DEVICE='studia-auto-device-v145',LAST_REMOTE='studia-auto-last-remote-v145',LAST_LOCAL='studia-auto-last-local-v145',LAST_HASH='studia-auto-last-hash-v145';
let syncPushTimer=null,syncBusy=false,syncApplying=false,lastPullAt=0,pollTimer=null,localDirtyAt=0,fileCache=null,filesDirty=true;
const nativeLSSet=Storage.prototype.setItem,nativeLSRemove=Storage.prototype.removeItem;
function deviceId(){let d=localStorage.getItem(DEVICE);if(!d){d=crypto.randomUUID?.()||'dev-'+Date.now().toString(36)+Math.random().toString(36).slice(2);nativeLSSet.call(localStorage,DEVICE,d)}return d}
function readSyncConfig(fromUI=false){const url=String((fromUI?q('#v144SyncUrl')?.value:null)||localStorage.getItem(SYNC_URL)||'').trim(),key=String((fromUI?q('#v144SyncKey')?.value:null)||localStorage.getItem(SYNC_KEY)||'').trim();return{url,key,valid:/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec(?:\?.*)?$/.test(url)&&key.length>=12}}
function setSyncStatus(text,bad=false){const el=q('#v144SyncStatus');if(el){el.textContent=text;el.classList.toggle('error',bad)}const chip=q('#v144SyncChip');if(chip){chip.textContent=bad?'Sync-Fehler':text;chip.classList.toggle('error',bad)}}
function syncableStorageKey(k){k=String(k||'');if(!(k.startsWith('schoolhub')||k.startsWith('schoolbloom')||k.startsWith('studia-')))return false;if(k===SYNC_URL||k===SYNC_KEY||k===DEVICE||k===LAST_REMOTE||k===LAST_LOCAL||k===LAST_HASH||k===FONT_KEY||k===FONT_OLD)return false;if(k.startsWith('studia-auto-')||k.startsWith('studia-sync-')||k.startsWith('studia-local-backup-')||k.startsWith('studia-daily-backup-'))return false;return true}
function syncLocalStorage(){const out={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&syncableStorageKey(k))out[k]=localStorage.getItem(k)}return out}
function fastHash(input){let h=2166136261>>>0;input=String(input||'');for(let i=0;i<input.length;i++){h^=input.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(36)}
function blobToURL(blob){return new Promise((res,rej)=>{if(!blob)return res('');const r=new FileReader();r.onload=()=>res(String(r.result||''));r.onerror=()=>rej(r.error);r.readAsDataURL(blob)})}
function urlToBlob(url){const [head,body]=String(url||'').split(',');if(!body)return new Blob([]);const mime=(head.match(/data:([^;]+)/)||[])[1]||'application/octet-stream',bin=atob(body),u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);return new Blob([u8],{type:mime})}
async function liveSyncFiles(){try{const db=await dbOpen();return await new Promise((res,rej)=>{const r=db.transaction(STORE).objectStore(STORE).getAll();r.onsuccess=()=>res(r.result||[]);r.onerror=()=>rej(r.error)})}catch(err){console.warn('[Studia V145] files unavailable',err);return[]}}
async function serializedFiles(){if(!filesDirty&&fileCache)return fileCache;const out=[];for(const f of await liveSyncFiles())out.push({id:f.id,name:f.name||'',type:f.type||f.blob?.type||'',data:await blobToURL(f.blob||new Blob([]))});fileCache=out;filesDirty=false;return out}
function filesSignature(files){return fastHash((files||[]).map(f=>`${f.id}|${f.name}|${f.type}|${String(f.data||'').length}`).join('§'))}
function fontsSignature(fonts){return fastHash((fonts||[]).map(f=>`${f.name}|${String(f.data||'').length}`).join('§'))}
async function fullStateEnvelope(){const localStorageState=syncLocalStorage(),files=await serializedFiles(),fonts=await allCustomFonts();const stateHash=fastHash(JSON.stringify(localStorageState)+'|'+filesSignature(files)+'|'+fontsSignature(fonts));return{format:'studia-full-auto-v145',version:145,updatedAt:localDirtyAt||Date.now(),deviceId:deviceId(),stateHash,state:{localStorage:localStorageState,files,fonts}}}
async function restoreFiles(remoteFiles){const remoteSig=filesSignature(remoteFiles),local=await liveSyncFiles(),localSig=fastHash(local.map(f=>`${f.id}|${f.name||''}|${f.type||f.blob?.type||''}|${f.blob?.size||0}`).join('§'));/* data URLs encode size, so use id/name count fast path first */const sameIds=local.length===(remoteFiles||[]).length&&local.every((f,i)=>{const r=(remoteFiles||[]).find(x=>x.id===f.id);return !!r&&r.name===(f.name||'')});if(sameIds){fileCache=remoteFiles||[];filesDirty=false;return}try{const db=await dbOpen();await new Promise((res,rej)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).clear();tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error)});for(const f of remoteFiles||[])await dbPut({id:f.id,name:f.name||'',type:f.type||'',blob:urlToBlob(f.data||'')});fileCache=remoteFiles||[];filesDirty=false}catch(err){console.warn('[Studia V145] file restore failed',err)}}
async function restoreFonts(fonts){for(const f of fonts||[]){if(!f?.name||!f?.data)continue;await fontDBPut(f);persistLegacyFont(f);await installFont(f)}refreshDesktopFontSelects();try{window.v91LoadFonts?.()}catch(_){ }}
function currentMainDataString(){return localStorage.getItem('schoolhub-v1')||''}
function noteLocalChange(delay=700){if(syncApplying)return;localDirtyAt=Date.now();nativeLSSet.call(localStorage,LAST_LOCAL,String(localDirtyAt));clearTimeout(syncPushTimer);if(readSyncConfig().valid)syncPushTimer=setTimeout(()=>autoPush(),delay)}
function scheduleAutoPush(delay=700){noteLocalChange(delay)}
window.scheduleAutoPush=scheduleAutoPush;
function jsonpLoad(c,action='load'){return new Promise((resolve,reject)=>{const cb='studiaAuto_'+Date.now()+'_'+Math.random().toString(36).slice(2),script=document.createElement('script'),timeout=setTimeout(()=>done(new Error('Zeitüberschreitung beim Sync')),15000);function done(err,val){clearTimeout(timeout);try{delete window[cb]}catch(_){ }script.remove();err?reject(err):resolve(val)}window[cb]=r=>done(null,r);script.onerror=()=>done(new Error('Web-App nicht erreichbar. Prüfe /exec-URL und Bereitstellung.'));const u=new URL(c.url);u.searchParams.set('action',action);u.searchParams.set('key',c.key);u.searchParams.set('callback',cb);u.searchParams.set('_',Date.now());script.src=u.toString();document.head.appendChild(script)})}
async function readRemote(c){const result=await jsonpLoad(c,'load');if(!result?.ok){const msg=String(result?.error||'');if(/noch keine|keine Sicherung|Keine Daten/i.test(msg))return null;throw new Error(msg||'Cloud-Daten konnten nicht geladen werden.')}let env;try{env=JSON.parse(result.payload||'{}')}catch(_){throw new Error('Cloud-Daten sind beschädigt.')}return{env,serverStamp:Date.parse(result.updatedAt||'')||0}}
function remoteTimestamp(env){return +env?.updatedAt||0}
async function applyFullRemote(env,serverStamp){if(!env||typeof env!=='object')throw new Error('Cloud-Daten ungültig.');/* backwards compatibility: v144 data-only envelope */if(env.format==='studia-auto-v144'||env.format==='studia-auto-v145'){const remoteData=env.data;if(!remoteData||typeof remoteData!=='object')throw new Error('Cloud-Daten ungültig.');syncApplying=true;try{const target=window.data||data;Object.keys(target).forEach(k=>delete target[k]);Object.assign(target,JSON.parse(JSON.stringify(remoteData)));nativeLSSet.call(localStorage,'schoolhub-v1',JSON.stringify(target));await restoreFonts(env.extras?.fonts||[]);nativeLSSet.call(localStorage,LAST_REMOTE,String(remoteTimestamp(env)||serverStamp||Date.now()));localDirtyAt=0;window.renderAll?.();if(isEditor()&&typeof selectedSheetId!=='undefined'&&selectedSheetId)setTimeout(()=>window.openStudySheetEditor?.(selectedSheetId),80);return true}finally{syncApplying=false}}
 const state=env.state||{},remoteLS=state.localStorage||{};if(!remoteLS||typeof remoteLS!=='object')throw new Error('Cloud-Sicherung enthält keinen Studia-Stand.');
 const currentState=syncLocalStorage(),currentFiles=await serializedFiles(),currentFonts=await allCustomFonts(),currentHash=fastHash(JSON.stringify(currentState)+'|'+filesSignature(currentFiles)+'|'+fontsSignature(currentFonts));if(env.stateHash&&env.stateHash===currentHash){nativeLSSet.call(localStorage,LAST_REMOTE,String(remoteTimestamp(env)||serverStamp||Date.now()));nativeLSSet.call(localStorage,LAST_HASH,env.stateHash);localDirtyAt=0;return false}
 syncApplying=true;try{
  for(let i=localStorage.length-1;i>=0;i--){const k=localStorage.key(i);if(k&&syncableStorageKey(k)&&!(k in remoteLS))nativeLSRemove.call(localStorage,k)}
  for(const [k,v] of Object.entries(remoteLS))if(syncableStorageKey(k))nativeLSSet.call(localStorage,k,String(v));
  const main=remoteLS['schoolhub-v1'];if(main){try{const parsed=JSON.parse(main),target=window.data||data;Object.keys(target).forEach(k=>delete target[k]);Object.assign(target,parsed)}catch(err){console.warn('[Studia V145] main data parse failed',err)}}
  await restoreFiles(state.files||[]);await restoreFonts(state.fonts||[]);
  nativeLSSet.call(localStorage,LAST_REMOTE,String(remoteTimestamp(env)||serverStamp||Date.now()));if(env.stateHash)nativeLSSet.call(localStorage,LAST_HASH,env.stateHash);localDirtyAt=0;
  setSyncStatus('Alles synchronisiert ✓');window.cuteToast?.('Handy und Laptop sind aktuell ♡');window.renderAll?.();
  if(isEditor()&&typeof selectedSheetId!=='undefined'&&selectedSheetId&&(data.studySheets||[]).some(x=>x.id===selectedSheetId))setTimeout(()=>window.openStudySheetEditor?.(selectedSheetId),80);
  return true
 }finally{syncApplying=false}
}
async function autoPush(){if(syncBusy||syncApplying||!localDirtyAt)return false;const c=readSyncConfig();if(!c.valid)return false;syncBusy=true;try{setSyncStatus('Synchronisiere alles …');/* prevent an older device from overwriting a newer remote edit */let remote=null;try{remote=await readRemote(c)}catch(err){if(!/noch keine|keine Sicherung|Keine Daten/i.test(String(err.message||err)))console.warn('[Studia V145] pre-push check',err)}if(remote?.env){const rt=remoteTimestamp(remote.env),seen=+localStorage.getItem(LAST_REMOTE)||0;if(rt>seen&&rt>localDirtyAt){await applyFullRemote(remote.env,remote.serverStamp);return false}}
 const env=await fullStateEnvelope(),payload=JSON.stringify(env),form=new FormData();form.set('action','save');form.set('key',c.key);form.set('payload',payload);await fetch(c.url,{method:'POST',mode:'no-cors',body:form});nativeLSSet.call(localStorage,LAST_LOCAL,String(env.updatedAt));nativeLSSet.call(localStorage,LAST_HASH,env.stateHash||'');localDirtyAt=0;setSyncStatus('Alles synchronisiert ✓');setTimeout(()=>autoPull(false),1400);return true
 }catch(err){console.warn('[Studia V145] auto push failed',err);setSyncStatus('Sync fehlgeschlagen',true);return false}finally{syncBusy=false}}
async function autoPull(force=false){if(syncBusy||syncApplying)return false;const c=readSyncConfig();if(!c.valid)return false;const now=Date.now();if(!force&&now-lastPullAt<4500)return false;lastPullAt=now;syncBusy=true;try{if(force)setSyncStatus('Prüfe alle Daten …');const remote=await readRemote(c);if(!remote){if(localDirtyAt)await autoPush();return false}const rt=remoteTimestamp(remote.env),last=+localStorage.getItem(LAST_REMOTE)||0;if(!force&&rt&&rt<=last)return false;if(localDirtyAt&&rt&&rt<=localDirtyAt){setTimeout(()=>autoPush(),120);return false}const changed=await applyFullRemote(remote.env,remote.serverStamp);if(!changed)setSyncStatus('Alles synchronisiert ✓');return changed}catch(err){console.warn('[Studia V145] auto pull failed',err);if(force)setSyncStatus(String(err.message||err),true);return false}finally{syncBusy=false}}
window.v144AutoPull=()=>autoPull(true);window.v144AutoPush=()=>{if(!localDirtyAt)localDirtyAt=Date.now();return autoPush()};

/* Every Studia save + relevant localStorage/file change schedules an automatic sync. */
try{const baseSave=window.save||save;window.__v145BaseSave=baseSave;window.save=function(){const r=baseSave.apply(this,arguments);if(!syncApplying)noteLocalChange(550);return r};try{save=window.save}catch(_){ }}catch(err){console.warn('[Studia V145] save hook unavailable',err)}
try{Storage.prototype.setItem=function(k,v){const r=nativeLSSet.call(this,k,v);if(this===localStorage&&!syncApplying&&syncableStorageKey(k))noteLocalChange(700);return r};Storage.prototype.removeItem=function(k){const r=nativeLSRemove.call(this,k);if(this===localStorage&&!syncApplying&&syncableStorageKey(k))noteLocalChange(700);return r}}catch(err){console.warn('[Studia V145] storage hook unavailable',err)}
try{const put=window.dbPut||dbPut,del=window.dbDelete||dbDelete;window.dbPut=async function(){const r=await put.apply(this,arguments);if(!syncApplying){filesDirty=true;noteLocalChange(650)}return r};window.dbDelete=async function(){const r=await del.apply(this,arguments);if(!syncApplying){filesDirty=true;noteLocalChange(650)}return r};try{dbPut=window.dbPut;dbDelete=window.dbDelete}catch(_){ }}catch(err){console.warn('[Studia V145] file hooks unavailable',err)}

/* One-time setup only. There are no manual upload/download buttons. */
window.openAccountDialog=function(){const c=readSyncConfig();window.openModal?.(`<div class="v135Modal v144SyncModal"><div class="v135ModalHead"><div><span class="eyebrow">AUTOMATISCHER SYNC</span><h2>Handy + Laptop</h2></div><button onclick="closeModal()">×</button></div><p><b>Alles</b> wird synchronisiert: Fächer, Themen, Lernblätter, Texte im Editor, Hausaufgaben, Arbeitsblätter, Karteikarten, Quizze, Tests, Einstellungen, Textformate, eigene Schriften und hochgeladene Dateien.</p><div class="v135FormGrid"><label class="full">Apps-Script-Web-App-URL<input id="v144SyncUrl" type="url" placeholder="https://script.google.com/macros/s/…/exec" value="${esc(c.url)}" oninput="v144RememberSyncConfig()"></label><label class="full">Persönlicher Sync-Schlüssel<input id="v144SyncKey" autocomplete="off" placeholder="auf Handy und Laptop exakt gleich" value="${esc(c.key)}" oninput="v144RememberSyncConfig()"></label></div><div class="v144AutoSyncCard"><span class="v144SyncDot"></span><div><b>Vollautomatisch</b><small>Nach Änderungen · beim Öffnen · bei Internet-Rückkehr · regelmäßig im Vordergrund · beim Herunterziehen zum Aktualisieren</small></div></div><div id="v144SyncStatus" class="v140SyncState">${c.valid?'Automatischer Voll-Sync ist eingerichtet':'URL und Schlüssel einmal eintragen'}</div><div class="v135ActionRow"><button class="primary" onclick="v144ConnectSync()">Automatisch verbinden</button></div><details class="v140SyncHelp"><summary>Einmalige Einrichtung</summary><ol><li>In <b>script.google.com</b> ein Projekt erstellen.</li><li><b>google-apps-script/Code.gs</b> aus dieser ZIP hineinkopieren.</li><li>Bereitstellen → Neue Bereitstellung → Web-App.</li><li>Ausführen als „Ich“, Zugriff „Jeder“.</li><li>Die <b>/exec</b>-URL und denselben Schlüssel auf Handy und Laptop eintragen.</li></ol></details></div>`) };
window.v144RememberSyncConfig=function(){const c=readSyncConfig(true);nativeLSSet.call(localStorage,SYNC_URL,c.url);nativeLSSet.call(localStorage,SYNC_KEY,c.key);setSyncStatus(c.valid?'Automatik bereit ✓':'URL oder Schlüssel noch unvollständig',!c.valid&&!!(c.url||c.key))};
window.v144ConnectSync=async function(){v144RememberSyncConfig();const c=readSyncConfig();if(!c.valid)return setSyncStatus('Bitte gültige /exec-URL und mindestens 12 Zeichen Schlüssel eingeben.',true);nativeLSSet.call(localStorage,'studia-sync-auto','0');setSyncStatus('Verbindung wird geprüft …');const remote=await autoPull(true);if(!remote){localDirtyAt=Date.now();await autoPush()}setSyncStatus('Automatischer Voll-Sync aktiv ✓');startPolling();setTimeout(()=>window.closeModal?.(),700)};
window.v140SyncUpload=()=>{noteLocalChange(0);return autoPush()};window.v140SyncDownload=()=>autoPull(true);window.v135CloudUpload=()=>{noteLocalChange(0);return autoPush()};window.v135CloudDownload=()=>autoPull(true);

function startPolling(){if(pollTimer)clearInterval(pollTimer);if(!readSyncConfig().valid)return;pollTimer=setInterval(()=>{if(document.visibilityState==='visible'&&navigator.onLine!==false)autoPull(false)},8000)}
window.addEventListener('online',()=>{autoPull(true);if(localDirtyAt)setTimeout(()=>autoPush(),500)});window.addEventListener('focus',()=>autoPull(false));document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')autoPull(false)});window.addEventListener('pageshow',()=>setTimeout(()=>autoPull(false),350));

/* Pull-to-refresh gesture: force a cloud check. Safari's own reload also triggers pageshow. */
let pull=null;function scrollTop(){return Math.max(0,document.scrollingElement?.scrollTop||document.documentElement.scrollTop||0)}
function pullIndicator(){let el=q('#v144PullSync');if(!el){el=document.createElement('div');el.id='v144PullSync';el.innerHTML='<span>↻</span><b>Zum Aktualisieren ziehen</b>';document.body.appendChild(el)}return el}
document.addEventListener('touchstart',e=>{if(e.touches.length!==1||scrollTop()>2||isEditor()||q('.modalWrap.show,.modalWrap.open'))return;pull={y:e.touches[0].clientY,d:0}}, {passive:true});
document.addEventListener('touchmove',e=>{if(!pull||e.touches.length!==1)return;pull.d=Math.max(0,e.touches[0].clientY-pull.y);const el=pullIndicator();el.classList.toggle('ready',pull.d>58);el.style.transform=`translate(-50%,${Math.min(72,pull.d*.55)-78}px)`}, {passive:true});
document.addEventListener('touchend',()=>{if(!pull)return;const ready=pull.d>58,el=q('#v144PullSync');pull=null;if(el){el.style.transform='translate(-50%,-78px)';el.classList.remove('ready')}if(ready){window.cuteToast?.('Prüfe Änderungen …');autoPull(true)}}, {passive:true});

/* Initial boot */
ensureGlobalFontInput();loadAllFonts();startPolling();setTimeout(()=>{desktopTextHub();ensureStickerColorUI();if(readSyncConfig().valid)autoPull(false)},1200);
})();
/* ===== /Studia V145 ===== */


/* ===== Studia V149 — persistent always-sync hardening ===== */
(()=>{
'use strict';
const q=(s,r=document)=>r.querySelector(s);
/* The old disconnect action is intentionally disabled. Sync configuration stays
   stored on the device until browser/site data itself is cleared. */
try{window.v113ForgetSync=()=>window.cuteToast?.('Geräte-Sync bleibt verbunden ♡')}catch(_){ }

/* V145 already syncs the complete Studia state after save/localStorage/file writes.
   This adds a debounced safety net for UI changes that an older code path might
   forget to route through save(). */
let extraSyncTimer=null;
function queueSync(delay){
  clearTimeout(extraSyncTimer);
  extraSyncTimer=setTimeout(()=>{try{window.scheduleAutoPush?.(0)}catch(_){ }},delay);
}
document.addEventListener('input',e=>{
  if(e.target?.closest?.('#v144SyncUrl,#v144SyncKey'))return;
  queueSync(900);
},true);
document.addEventListener('change',e=>{
  if(e.target?.closest?.('#v144SyncUrl,#v144SyncKey'))return;
  queueSync(350);
},true);

/* Keep a single current version label after all historical startup scripts finish. */
function version(){const e=q('#headerEyebrow');if(e&&e.textContent!=='VERSION 166')e.textContent='VERSION 166';document.title='Studia'}
version();setTimeout(version,450);setTimeout(version,1900);
})();
/* ===== /Studia V149 ===== */


/* ===== Studia V150 — account sync like Auftragshelfer + reliable desktop rail ===== */
(()=>{
'use strict';
if(window.__STUDIA_V150__)return;window.__STUDIA_V150__=true;
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const inEditor=()=>document.body.classList.contains('editorMode')&&!!q('#view-sheet-editor.active');
const desktop=()=>innerWidth>=900&&inEditor();
function setVersion150(){const e=q('#headerEyebrow');if(e&&e.textContent!=='VERSION 166')e.textContent='VERSION 166';document.documentElement.classList.add('v151Ready');document.title='Studia'}
setVersion150();setTimeout(setVersion150,300);setTimeout(setVersion150,1800);

/* Disable the older key-based V145 transport. Its local save hooks may remain,
   but without the old key it cannot make network requests. */
try{localStorage.removeItem('studia-gas-key');localStorage.setItem('studia-sync-auto','0')}catch(_){ }

/* ---------- laptop rail: independent from all historical .canvasQuickNav rebuilders ---------- */
const railHTML=`
<button data-v151="text" aria-label="Text"><span class="editorNavIcon"><svg viewBox="0 0 24 24"><path d="M5 5h14M12 5v14M8.5 19h7"/></svg></span><span>Text</span></button>
<button data-v151="elements" aria-label="Elemente"><span class="editorNavIcon"><svg viewBox="0 0 24 24"><rect x="4" y="4" width="6" height="6" rx="1.4"/><circle cx="17" cy="7" r="3"/><path d="M4.5 19l3.2-5.5L11 19zM14 14h6v6h-6z"/></svg></span><span>Elemente</span></button>
<button data-v151="templates" aria-label="Vorlagen"><span class="editorNavIcon"><svg viewBox="0 0 24 24"><rect x="6" y="4" width="12" height="15" rx="2"/><path d="M9 8h6M9 11h6M9 14h4"/></svg></span><span>Vorlagen</span></button>`;
let v151RailMode='elements';
function injectDesktopTextTools(){
 const d=q('#canvasQuickDrawer');if(!desktop()||!d)return;
 if(!/Textformate|TEXT|Textformat/.test(d.textContent||''))return;
 qa('.v144DesktopTextHub,.v139TextHeaderTools,.v140TextTools,.v128DesktopParityBar,.v129DesktopTextExtras,.v121DesktopFontActions,.v123DesktopTextActions,.v132DesktopTextExtras',d).forEach(x=>x.remove());
 if(q('.v150DesktopTextTools',d))return;
 const hub=document.createElement('div');hub.className='v150DesktopTextTools';
 hub.innerHTML=`<button type="button" onclick="v144OpenFontBrowser()"><span class="v150TextToolIcon">Aa</span><span><strong>Schriften</strong><small>Vorschau & auswählen</small></span></button>
 <label class="v150FontUpload"><span class="v150TextToolIcon">＋</span><span><strong>Schrift hinzufügen</strong><small>TTF · OTF · WOFF · WOFF2</small></span><input type="file" accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2" onchange="v150FontPicked(this)"></label>
 <button class="v150TextFormatsAction" type="button" onclick="createCustomStylePreset()"><span class="v150TextToolIcon">H1</span><span><strong>Textformat erstellen</strong><small>Eigenes Format speichern</small></span></button>`;
 d.prepend(hub);
}
window.v150FontPicked=async function(input){
 try{
   if(typeof window.v144HandleFontFile==='function')await window.v144HandleFontFile(input);
   else throw new Error('Schrift-Import ist nicht geladen.');
 }catch(err){console.error('[Studia] font import',err);alert('Schrift konnte nicht hinzugefügt werden: '+String(err?.message||err))}
 finally{v150FontCacheDirty=true;v150MarkDirty(450);setTimeout(injectDesktopTextTools,80)}
};
function openV151Panel(mode,btn){
 if(!desktop())return;
 v151RailMode=mode;
 qa('#v151DesktopRail button[data-v151]').forEach(b=>b.classList.toggle('active',b===btn));
 /* Let V134 keep its internal desktop mode in sync, but the visible rail itself is ours. */
 try{
   if(typeof window.v134Open==='function')window.v134Open(mode,btn);
   else if(typeof window.v132Open==='function')window.v132Open(mode,btn);
   else if(typeof window.editorOpenGroup==='function')window.editorOpenGroup(mode==='text'?'textLibrary':mode,btn);
 }catch(err){console.warn('[Studia V151] open panel fallback',err);try{window.editorOpenGroup?.(mode==='text'?'textLibrary':mode,btn)}catch(_){}}
 /* Clicking Text always means the text-format library, even when a text object is selected. */
 if(mode==='text'){
   try{window.editorOpenGroup?.('textLibrary',btn)}catch(_){ }
   setTimeout(injectDesktopTextTools,0);setTimeout(injectDesktopTextTools,80);
 }
 if(mode==='templates')setTimeout(()=>{try{window.renderPageTemplates?.()}catch(_){}},30);
}
window.v151OpenRail=openV151Panel;
window.v150OpenRail=openV151Panel;
function ensureDesktopRail(){
 if(!desktop())return;
 const left=q('.v102DesktopLeft'),drawer=q('#canvasQuickDrawer');if(!left||!drawer)return;
 let rail=q('#v151DesktopRail',left);
 if(!rail){rail=document.createElement('nav');rail.id='v151DesktopRail';rail.className='v150DesktopRail v151DesktopRail';rail.setAttribute('aria-label','Editor-Werkzeuge');rail.innerHTML=railHTML;left.insertBefore(rail,drawer)}
 if(qa('button[data-v151]',rail).length!==3)rail.innerHTML=railHTML;
 qa('button[data-v151]',rail).forEach(b=>{b.onclick=e=>{e.preventDefault();e.stopPropagation();openV151Panel(b.dataset.v151,b)}});
 const active=rail.querySelector(`[data-v151="${v151RailMode}"]`)||rail.querySelector('[data-v151="elements"]');qa('button[data-v151]',rail).forEach(b=>b.classList.toggle('active',b===active));
 if(!rail.dataset.opened){rail.dataset.opened='1';setTimeout(()=>openV151Panel(v151RailMode,active),0)}
 if(v151RailMode==='text')setTimeout(injectDesktopTextTools,0);
}
let railScheduled=false;function scheduleRail(){if(railScheduled)return;railScheduled=true;requestAnimationFrame(()=>{railScheduled=false;ensureDesktopRail()})}
const railObserver=new MutationObserver(()=>{if(desktop()&&!q('#v151DesktopRail'))scheduleRail()});railObserver.observe(document.body,{childList:true,subtree:true});
document.addEventListener('click',e=>{if(e.target.closest?.('#v151DesktopRail [data-v151="text"]'))setTimeout(injectDesktopTextTools,20)},false);
window.addEventListener('resize',()=>setTimeout(scheduleRail,80));
const baseRender150=window.renderSheetEditor;if(baseRender150)window.renderSheetEditor=function(){const r=baseRender150.apply(this,arguments);setTimeout(scheduleRail,140);return r};try{renderSheetEditor=window.renderSheetEditor}catch(_){ }
setTimeout(scheduleRail,150);

/* ---------- username/password account sync ---------- */
const URL_KEY='studia-gas-url';
const TOKEN_KEY='studia-account-token-v150';
const USER_KEY='studia-account-username-v150';
const DEVICE_KEY='studia-account-device-v150';
const LAST_REMOTE='studia-account-last-remote-v150';
const LAST_LOCAL='studia-account-last-local-v150';
const TECH_PREFIXES=['studia-account-','studia-auto-','studia-sync-','studia-local-backup-','studia-daily-backup-'];
let v150User=null,v150Busy=false,v150Applying=false,v150DirtyAt=0,v150PushTimer=null,v150Poll=null,v150LastCheck=0;
let v150FileCache=null,v150FilesDirty=true,v150FontCache=null,v150FontCacheDirty=true;
const token=()=>String(localStorage.getItem(TOKEN_KEY)||'');
const username=()=>String(localStorage.getItem(USER_KEY)||'');
function scriptUrl(){const saved=String(localStorage.getItem(URL_KEY)||'').trim(),file=String(window.STUDIA_SYNC_CONFIG?.scriptUrl||'').trim();return (saved||file).replace(/\/$/,'')}
function urlValid(u=scriptUrl()){return /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec(?:\?.*)?$/.test(String(u||''))}
function accountConfigured(){return urlValid()&&!!token()}
function deviceId(){let d=localStorage.getItem(DEVICE_KEY);if(!d){d=crypto.randomUUID?.()||'dev-'+Date.now().toString(36)+Math.random().toString(36).slice(2);localStorage.setItem(DEVICE_KEY,d)}return d}
function accountStatus(text,bad=false){const el=q('#v150AccountStatus');if(el){el.textContent=text;el.classList.toggle('error',bad)}}
function actionFor(path,method='GET'){const m=String(method).toUpperCase(),map={'/api/me':'me','/api/state':'state','/api/state/meta':'state_meta','/api/auth/register':'register','/api/auth/login':'login','/api/auth/google':'google_login','/api/auth/recover':'recover'};if(path==='/api/state'&&m!=='GET')return'state_put';return map[path]||''}
async function request(path,options={}){
 const base=scriptUrl();if(!urlValid(base))throw new Error('Apps-Script-Web-App-URL fehlt oder ist keine /exec-URL.');
 const method=String(options.method||'GET').toUpperCase(),action=actionFor(path,method);if(!action)throw new Error('Unbekannte Sync-Aktion.');let response;
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
 try{
  if(method==='GET'){
    const u=new URL(base);u.searchParams.set('action',action);if(token())u.searchParams.set('token',token());for(const[k,v]of Object.entries(options.query||{}))if(v!==undefined&&v!==null)u.searchParams.set(k,String(v));u.searchParams.set('_',Date.now());
    response=await fetch(u.toString(),{method:'GET',redirect:'follow',cache:'no-store',signal:controller.signal});
  }else{
    let payload={};if(options.body){if(typeof options.body==='string'){try{payload=JSON.parse(options.body)}catch{payload={value:options.body}}}else payload=options.body}
    payload.action=action;if(token())payload.token=token();
    response=await fetch(base,{method:'POST',redirect:'follow',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload),signal:controller.signal});
  }
 }catch(err){if(err?.name==='AbortError')throw new Error('Studia-Sync hat zu lange gebraucht. Prüfe Internet oder Apps-Script-URL.');throw err}finally{clearTimeout(timer)}
 const raw=await response.text();let data;try{data=JSON.parse(raw)}catch{throw new Error('Google-Sync hat keine gültige Antwort geliefert. Prüfe die Apps-Script-Bereitstellung.')}
 if(data?.ok===false){const err=new Error(data.error||'Synchronisierung fehlgeschlagen.');err.status=Number(data.status||400);throw err}return data;
}
function syncKey(k){k=String(k||'');if(!(k.startsWith('schoolhub')||k.startsWith('schoolbloom')||k.startsWith('studia-')))return false;if(k===URL_KEY||k===TOKEN_KEY||k===USER_KEY||k===DEVICE_KEY||k===LAST_REMOTE||k===LAST_LOCAL||k==='studia-gas-key')return false;if(TECH_PREFIXES.some(p=>k.startsWith(p)))return false;return true}
function packLocalStorage(){const out={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&syncKey(k))out[k]=localStorage.getItem(k)}return out}
function fastHash(s){let h=2166136261>>>0;s=String(s||'');for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(36)}
function blobToData(blob){return new Promise((res,rej)=>{if(!blob)return res('');const r=new FileReader();r.onload=()=>res(String(r.result||''));r.onerror=()=>rej(r.error);r.readAsDataURL(blob)})}
function dataToBlob(url){const [head,body]=String(url||'').split(',');if(!body)return new Blob([]);const mime=(head.match(/data:([^;]+)/)||[])[1]||'application/octet-stream',bin=atob(body),u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);return new Blob([u8],{type:mime})}
async function readFiles(){if(!v150FilesDirty&&v150FileCache)return v150FileCache;try{const db=await dbOpen();const rows=await new Promise((res,rej)=>{const r=db.transaction(STORE).objectStore(STORE).getAll();r.onsuccess=()=>res(r.result||[]);r.onerror=()=>rej(r.error)}),out=[];for(const f of rows)out.push({id:f.id,name:f.name||'',type:f.type||f.blob?.type||'',data:await blobToData(f.blob||new Blob([]))});v150FileCache=out;v150FilesDirty=false;return out}catch(err){console.warn('[V150] files',err);return[]}}
function fontDB150(){return new Promise((res,rej)=>{const r=indexedDB.open('studia-fonts-v144',1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('fonts'))r.result.createObjectStore('fonts',{keyPath:'name'})};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function readFonts(){if(!v150FontCacheDirty&&v150FontCache)return v150FontCache;try{const db=await fontDB150(),rows=await new Promise((res,rej)=>{const r=db.transaction('fonts').objectStore('fonts').getAll();r.onsuccess=()=>res(r.result||[]);r.onerror=()=>rej(r.error)});v150FontCache=rows;v150FontCacheDirty=false;return rows}catch(_){return[]}}
async function envelope(){const ls=packLocalStorage(),files=await readFiles(),fonts=await readFonts(),updatedAt=v150DirtyAt||Date.now(),stateHash=fastHash(JSON.stringify(ls)+'|'+files.map(f=>f.id+':'+String(f.data||'').length).join('|')+'|'+fonts.map(f=>f.name+':'+String(f.data||'').length).join('|'));return{format:'studia-account-full-v151',version:151,updatedAt,deviceId:deviceId(),stateHash,state:{localStorage:ls,files,fonts}}}
async function clearAndRestoreFiles(files){try{const db=await dbOpen();await new Promise((res,rej)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).clear();tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error)});for(const f of files||[])await dbPut({id:f.id,name:f.name||'',type:f.type||'',blob:dataToBlob(f.data||'')});v150FileCache=files||[];v150FilesDirty=false}catch(err){console.warn('[V150] restore files',err)}}
async function clearAndRestoreFonts(fonts){try{const db=await fontDB150();await new Promise((res,rej)=>{const tx=db.transaction('fonts','readwrite');const st=tx.objectStore('fonts');st.clear();for(const f of fonts||[])if(f?.name&&f?.data)st.put(f);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error)});v150FontCache=fonts||[];v150FontCacheDirty=false;for(const f of fonts||[]){if(!f?.name||!f?.data)continue;try{if('FontFace'in window&&document.fonts){const face=new FontFace(f.name,`url(${JSON.stringify(f.data)})`);await face.load();document.fonts.add(face)}}catch(_){const sid='v150-font-'+f.name.replace(/[^a-z0-9_-]/gi,'-');if(!q('#'+CSS.escape(sid))){const st=document.createElement('style');st.id=sid;st.textContent=`@font-face{font-family:${JSON.stringify(f.name)};src:url(${JSON.stringify(f.data)});font-display:swap}`;document.head.appendChild(st)}}}try{window.v91LoadFonts?.()}catch(_){ }}catch(err){console.warn('[V150] restore fonts',err)}}
async function applyEnvelope(env,serverUpdated){if(!env?.state?.localStorage)throw new Error('Cloud-Stand ist ungültig.');v150Applying=true;try{const remote=env.state.localStorage;for(let i=localStorage.length-1;i>=0;i--){const k=localStorage.key(i);if(k&&syncKey(k)&&!(k in remote))localStorage.removeItem(k)}for(const[k,v]of Object.entries(remote))if(syncKey(k))localStorage.setItem(k,String(v));const main=remote['schoolhub-v1'];if(main){try{const parsed=JSON.parse(main),target=window.data||data;Object.keys(target).forEach(k=>delete target[k]);Object.assign(target,parsed)}catch(err){console.warn('[V150] data parse',err)}}await clearAndRestoreFiles(env.state.files||[]);await clearAndRestoreFonts(env.state.fonts||[]);localStorage.setItem(LAST_REMOTE,String(Number(serverUpdated||env.updatedAt||Date.now())));v150DirtyAt=0;window.renderAll?.();if(inEditor()&&typeof selectedSheetId!=='undefined'&&selectedSheetId&&(window.data||data)?.studySheets?.some(x=>x.id===selectedSheetId))setTimeout(()=>window.openStudySheetEditor?.(selectedSheetId),80);return true}finally{v150Applying=false}}
function v150MarkDirty(delay=500){if(v150Applying)return;v150DirtyAt=Date.now();try{localStorage.setItem(LAST_LOCAL,String(v150DirtyAt))}catch(_){ }clearTimeout(v150PushTimer);if(accountConfigured())v150PushTimer=setTimeout(v150Push,delay)}
window.v150MarkDirty=v150MarkDirty;
async function v150Push(){if(v150Busy||v150Applying||!v150DirtyAt||!accountConfigured()||navigator.onLine===false)return false;v150Busy=true;try{accountStatus('Synchronisiert …');/* Last-write-wins across devices: if the cloud changed after this device's last cloud snapshot AND is newer than this local edit, pull it instead of overwriting it. */const meta=await request('/api/state/meta'),remoteAt=Number(meta.updatedAt||0),lastRemote=Number(localStorage.getItem(LAST_REMOTE)||0),localAt=Number(v150DirtyAt||0);if(remoteAt>lastRemote&&remoteAt>localAt){const cloud=await request('/api/state');if(cloud.data)await applyEnvelope(cloud.data,Number(cloud.updatedAt||remoteAt));accountStatus('✓ Neueren Stand vom anderen Gerät geladen');return true}const env=await envelope(),r=await request('/api/state',{method:'PUT',body:{data:env}});localStorage.setItem(LAST_REMOTE,String(Number(r.updatedAt||Date.now())));v150DirtyAt=0;accountStatus('✓ Automatisch synchronisiert');return true}catch(err){console.warn('[V150] push',err);accountStatus(navigator.onLine===false?'Offline – wird später synchronisiert':'Sync-Fehler – versucht es automatisch erneut',true);return false}finally{v150Busy=false}}
async function v150Pull(force=false){if(v150Busy||v150Applying||!accountConfigured()||navigator.onLine===false)return false;if(v150DirtyAt){v150MarkDirty(250);return false}const now=Date.now();if(!force&&now-v150LastCheck<3500)return false;v150LastCheck=now;v150Busy=true;try{if(force)accountStatus('Prüfe Änderungen …');const meta=await request('/api/state/meta');const remoteAt=Number(meta.updatedAt||0),last=Number(localStorage.getItem(LAST_REMOTE)||0);if(!force&&remoteAt<=last){accountStatus('✓ Automatisch synchronisiert');return false}const r=await request('/api/state');if(!r.data){v150DirtyAt=Date.now();setTimeout(v150Push,0);return false}await applyEnvelope(r.data,Number(r.updatedAt||remoteAt||Date.now()));accountStatus('✓ Automatisch synchronisiert');window.cuteToast?.('Alle Geräte sind aktuell ♡');return true}catch(err){console.warn('[V150] pull',err);if(err.status===401){localStorage.removeItem(TOKEN_KEY);v150User=null;accountStatus('Anmeldung muss erneuert werden.',true)}else accountStatus(navigator.onLine===false?'Offline – wird später synchronisiert':'Sync-Fehler – versucht es automatisch erneut',true);return false}finally{v150Busy=false}}
window.v150Push=v150Push;window.v150Pull=()=>v150Pull(true);
function startAccountPolling(){if(v150Poll)clearInterval(v150Poll);if(!accountConfigured())return;v150Poll=setInterval(()=>{if(document.visibilityState==='visible')v150Pull(false)},5000);setTimeout(()=>v150Pull(true),250)}

async function initAccount(){if(!accountConfigured())return;try{/* Persisted dirty timestamp survives a fast app close, so the next open still uploads the last edit instead of losing it. */const pending=Number(localStorage.getItem(LAST_LOCAL)||0),seen=Number(localStorage.getItem(LAST_REMOTE)||0);if(pending>seen)v150DirtyAt=Math.max(v150DirtyAt,pending);const me=await request('/api/me');v150User=me.user;localStorage.setItem(USER_KEY,v150User?.username||username());startAccountPolling()}catch(err){console.warn('[V150] account init',err);if(err.status===401){localStorage.removeItem(TOKEN_KEY);v150User=null}}}
window.v150RememberUrl=function(){const field=q('#v150ScriptUrl'),u=String(field?.value||scriptUrl()||'').trim().replace(/\/$/,'');if(field&&u)localStorage.setItem(URL_KEY,u);accountStatus(urlValid(u)?'Web-App verbunden ✓':'Bitte eine gültige /exec-URL eintragen.',!urlValid(u));return urlValid(u)};
window.v150Login=async function(){const u=String(q('#v150Username')?.value||'').trim(),p=String(q('#v150Password')?.value||'');v150RememberUrl();if(!u||p.length<8)return accountStatus('Benutzername und Passwort (mind. 8 Zeichen) eingeben.',true);try{accountStatus('Anmelden …');const r=await request('/api/auth/login',{method:'POST',body:{username:u,password:p}});localStorage.setItem(TOKEN_KEY,r.token);localStorage.setItem(USER_KEY,r.user?.username||u);v150User=r.user;accountStatus('Angemeldet · lade deine Studia-Daten …');const state=await request('/api/state');if(state.data)await applyEnvelope(state.data,Number(state.updatedAt||Date.now()));else{v150DirtyAt=Date.now();await v150Push()}startAccountPolling();window.closeModal?.();window.cuteToast?.('Dauerhaft angemeldet ♡')}catch(err){accountStatus(String(err.message||err),true)}};
window.v150Register=async function(){const u=String(q('#v150Username')?.value||'').trim(),p=String(q('#v150Password')?.value||'');v150RememberUrl();if(u.length<3||p.length<8)return accountStatus('Benutzername mind. 3 Zeichen, Passwort mind. 8 Zeichen.',true);try{accountStatus('Konto wird erstellt …');const r=await request('/api/auth/register',{method:'POST',body:{username:u,password:p}});localStorage.setItem(TOKEN_KEY,r.token);localStorage.setItem(USER_KEY,r.user?.username||u);v150User=r.user;v150DirtyAt=Date.now();await v150Push();startAccountPolling();window.openModal?.(`<div class="v135Modal v150AccountModal"><div class="v135ModalHead"><div><span class="eyebrow">KONTO ERSTELLT</span><h2>Wiederherstellungscode</h2></div><button onclick="closeModal()">×</button></div><p>Diesen Code sicher speichern. Damit kannst du dein Passwort zurücksetzen, falls du es vergisst.</p><div class="v150AccountState" style="font-size:14px;letter-spacing:.08em;text-align:center">${esc(r.recoveryCode||'')}</div><div class="v150PermanentNote"><b>✓ Dauerhaft</b><span>Du bleibst auf diesem Gerät angemeldet und Studia synchronisiert automatisch.</span></div></div>`)}catch(err){accountStatus(String(err.message||err),true)}};
window.openAccountDialog=function(){const logged=!!token(),name=v150User?.username||username(),url=scriptUrl();window.openModal?.(`<div class="v135Modal v150AccountModal"><div class="v135ModalHead"><div><span class="eyebrow">KONTO & SYNC</span><h2>Studia-Konto</h2></div><button onclick="closeModal()">×</button></div>${logged?`<div class="v150AccountHero"><span class="v150AccountAvatar">S</span><div><b>${esc(name||'Studia')}</b><small>dauerhaft angemeldet</small></div></div><div class="v150PermanentNote"><b>✓ Immer Sync</b><span>Fächer, Themen, Lernblätter, Hausaufgaben, Editor-Texte, Karteikarten, Quizze, Tests, Einstellungen, Schriften und Dateien werden automatisch auf allen Geräten gleich gehalten.</span></div><div id="v150AccountStatus" class="v150AccountState">✓ Automatisch synchronisiert</div>`:`<div class="v150AccountForm"><label>Benutzername<input id="v150Username" autocomplete="username" minlength="3" maxlength="32" value="${esc(name)}" placeholder="z. B. Stella"></label><label>Passwort<input id="v150Password" type="password" autocomplete="current-password" minlength="8" placeholder="mindestens 8 Zeichen"></label></div><div id="v150AccountStatus" class="v150AccountState">Mit demselben Konto auf Handy und Laptop anmelden.</div><div class="v150AccountActions"><button class="primary" onclick="v150Login()">Anmelden</button><button onclick="v150Register()">Konto erstellen</button></div>`}${urlValid(String(window.STUDIA_SYNC_CONFIG?.scriptUrl||''))?'':`<details class="v150AccountSetup" ${urlValid(url)?'':'open'}><summary>Einmalige Google-Sync-Einrichtung</summary><div class="v150AccountForm"><label>Apps-Script-Web-App-URL<input id="v150ScriptUrl" type="url" value="${esc(url)}" placeholder="https://script.google.com/macros/s/…/exec" oninput="v150RememberUrl()"></label><small>Wenn du die URL einmal in google-sync-config.js einträgst, brauchst du sie auf keinem Gerät mehr einzugeben.</small></div></details>`}</div>`)};

/* Automatic save hooks. The old V145 functions remain local-only because its key
   was disabled above. */
try{const prev=window.save||save;window.save=function(){const r=prev.apply(this,arguments);v150MarkDirty(650);return r};try{save=window.save}catch(_){ }}catch(_){ }
try{const prevSet=Storage.prototype.setItem,prevRemove=Storage.prototype.removeItem;Storage.prototype.setItem=function(k,v){const r=prevSet.call(this,k,v);if(this===localStorage&&!v150Applying&&syncKey(k))v150MarkDirty(750);return r};Storage.prototype.removeItem=function(k){const r=prevRemove.call(this,k);if(this===localStorage&&!v150Applying&&syncKey(k))v150MarkDirty(750);return r}}catch(_){ }
try{const prevPut=window.dbPut||dbPut,prevDelete=window.dbDelete||dbDelete;window.dbPut=async function(){const r=await prevPut.apply(this,arguments);if(!v150Applying){v150FilesDirty=true;v150MarkDirty(650)}return r};window.dbDelete=async function(){const r=await prevDelete.apply(this,arguments);if(!v150Applying){v150FilesDirty=true;v150MarkDirty(650)}return r};try{dbPut=window.dbPut;dbDelete=window.dbDelete}catch(_){ }}catch(_){ }
if(typeof window.v144HandleFontFile==='function'){const prevFont=window.v144HandleFontFile;window.v144HandleFontFile=async function(){const r=await prevFont.apply(this,arguments);v150FontCacheDirty=true;v150MarkDirty(450);return r}}
document.addEventListener('input',e=>{if(e.target?.closest?.('#v150Username,#v150Password,#v150ScriptUrl'))return;v150MarkDirty(900)},true);
document.addEventListener('change',e=>{if(e.target?.closest?.('#v150Username,#v150Password,#v150ScriptUrl'))return;v150MarkDirty(450)},true);
document.addEventListener('pointerup',e=>{if(inEditor()&&e.target?.closest?.('#canvasViewport'))v150MarkDirty(650)},true);
window.addEventListener('online',()=>{if(v150DirtyAt)setTimeout(v150Push,350);else v150Pull(true)});window.addEventListener('focus',()=>v150Pull(false));window.addEventListener('pageshow',()=>setTimeout(()=>v150Pull(false),250));document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')v150Pull(false)});

/* pull down outside editor -> immediately check the account cloud */
let pull150=null;function scrollTop150(){return Math.max(0,document.scrollingElement?.scrollTop||document.documentElement.scrollTop||0)}
function indicator150(){let x=q('#v150PullSync');if(!x){x=document.createElement('div');x.id='v150PullSync';x.innerHTML='<span>↻</span><b>Zum Synchronisieren ziehen</b>';document.body.appendChild(x)}return x}
document.addEventListener('touchstart',e=>{if(!accountConfigured()||e.touches.length!==1||scrollTop150()>2||inEditor()||q('.modalWrap.show,.modalWrap.open'))return;pull150={y:e.touches[0].clientY,d:0}},{passive:true});
document.addEventListener('touchmove',e=>{if(!pull150||e.touches.length!==1)return;pull150.d=Math.max(0,e.touches[0].clientY-pull150.y);const x=indicator150();x.classList.toggle('ready',pull150.d>62);x.style.transform=`translate(-50%,${Math.min(76,pull150.d*.56)-82}px)`},{passive:true});
document.addEventListener('touchend',()=>{if(!pull150)return;const ready=pull150.d>62,x=q('#v150PullSync');pull150=null;if(x){x.style.transform='translate(-50%,-82px)';x.classList.remove('ready')}if(ready){window.cuteToast?.('Prüfe alle Geräte …');v150Pull(true)}},{passive:true});

function polishAccountSettings(){
 const view=q('#view-settings');if(!view)return;const box=q('.v137CloudSettings',view);if(!box)return;
 box.classList.add('v141GoogleSyncCard');
 box.innerHTML=`<div class="v141SettingsTitle"><span>☁</span><div><h2>Studia-Konto</h2><p class="small">Benutzername + Passwort · dauerhaft angemeldet · automatische Synchronisierung auf allen Geräten.</p></div></div><button class="primary" onclick="openAccountDialog()">Konto & Sync öffnen</button>`;
}
const accountSettingsObserver=new MutationObserver(()=>{if(q('#view-settings.active'))requestAnimationFrame(polishAccountSettings)});accountSettingsObserver.observe(document.body,{attributes:true,attributeFilter:['class'],subtree:true});
setTimeout(polishAccountSettings,500);
setTimeout(()=>{ensureDesktopRail();initAccount();polishAccountSettings();setVersion150()},350);
})();
/* ===== /Studia V150 ===== */

/* ===== Studia V152 — direct desktop panels + real partial text editing ===== */
(()=>{
'use strict';
if(window.__STUDIA_V152__)return;window.__STUDIA_V152__=true;
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const desktop=()=>innerWidth>=900&&document.body.classList.contains('editorMode')&&!!q('#view-sheet-editor.active');
const mobile=()=>innerWidth<900&&document.body.classList.contains('editorMode')&&!!q('#view-sheet-editor.active');
const textKinds=new Set(['text','block','task','merke','file']);
function st(){try{return typeof canvasState!=='undefined'?canvasState:window.canvasState}catch(_){return window.canvasState}}
function textObj(id){return (st()?.objects||[]).find(o=>String(o.id)===String(id)&&textKinds.has(o.kind)&&!o.isChecklist)||null}
function selectedText(){const s=st();return s?.selectedType==='object'?textObj(s.selectedId):null}
function textEl(id){return q(`.cobj[data-id="${CSS.escape(String(id))}"]`)}

/* ---------- Desktop rail panels: no legacy drawer router ---------- */
let panelMode='elements';
function panelShell(title,kicker,body){return `<div class="v152Panel"><div class="v152PanelHead"><div><span>${esc(kicker)}</span><b>${esc(title)}</b></div></div><div class="v152PanelScroll">${body}</div></div>`}
function textPanel(){
 const presets=typeof window.canvasPresets==='function'?window.canvasPresets():[];
 const cards=presets.map(p=>`<button class="v152TextFormatCard" type="button" onclick="${p.bundle?`insertSavedTextFormat('${esc(p.id)}')`:`addCanvasText('${esc(p.id)}')`}"><span class="v152FormatGlyph" style="font-family:${esc(p.fontFamily||'Arial')};font-weight:${esc(p.fontWeight||700)};color:${esc(p.color||'#725b53')}">${p.id==='h1'?'H1':p.id==='h2'?'H2':'Aa'}</span><span><b>${esc(p.name||'Textformat')}</b><small>${p.bundle?'Gruppe':p.type==='block'?'Text + Kasten':'Text'}</small></span></button>`).join('');
 return panelShell('Text','TEXT',`<div class="v152TextActions">
   <button type="button" onclick="window.v144OpenFontBrowser?.()"><span class="v152ToolGlyph">Aa</span><span><b>Schriften</b><small>Vorschau & auswählen</small></span></button>
   <label><span class="v152ToolGlyph">＋</span><span><b>Schrift hinzufügen</b><small>TTF · OTF · WOFF · WOFF2</small></span><input type="file" accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2" onchange="v152FontPicked(this)"></label>
   <button type="button" onclick="createCustomStylePreset()"><span class="v152ToolGlyph">H1</span><span><b>Textformat erstellen</b><small>Eigenes Format speichern</small></span></button>
 </div><div class="v152SectionTitle"><b>Textformate</b><button type="button" onclick="openTextFormatManager()">Verwalten</button></div><div class="v152TextFormatList">${cards||'<div class="v152Empty">Noch keine Textformate.</div>'}</div><button class="v152WideAction" type="button" onclick="createCustomStylePreset()">＋ Neues Textformat</button>`)
}
function templatePanel(){
 let own=[];try{own=JSON.parse(localStorage.getItem('schoolbloom-page-templates')||'[]')}catch(_){own=[]}
 const defs=[['clean','Clean Notes','Klare Überschrift + Merkkasten','clean'],['cute','Cute Study','Pastell, Sticker und Aufgabe','cute'],['exam','Exam Prep','Definitionen + Aufgaben','exam'],['blank','Leer','Komplett frei gestalten','blank']];
 const built=defs.map(([id,name,desc,kind])=>`<button class="v152TemplateCard" type="button" onclick="applyCanvasTemplate('${id}')"><span class="v152TemplatePreview ${kind}"><i></i><i></i><i></i></span><span><b>${name}</b><small>${desc}</small></span></button>`).join('');
 const custom=own.map(t=>`<button class="v152TemplateCard" type="button" onclick="applySavedPageTemplate('${esc(t.id)}')"><span class="v152TemplatePreview own"><i></i><i></i><i></i></span><span><b>${esc(t.name||'Eigene Vorlage')}</b><small>Eigene Seitenvorlage</small></span></button>`).join('');
 return panelShell('Vorlagen','VORLAGEN',`<div class="v152TemplateActions"><button type="button" onclick="saveCurrentPageTemplate()">＋ Aktuelle Seite als Vorlage</button><button type="button" onclick="openPageTemplateManager()">Verwalten</button></div><div class="v152SectionTitle"><b>Vorlagen auswählen</b><span>${defs.length+own.length} Vorlagen</span></div><div class="v152TemplateList">${built}${custom}</div>`)
}
function v152PanelIcon(name){const p={
 text:'<path d="M5 5h14M12 5v14M8.5 19h7"/>',image:'<rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="m6 17 4-4 3 3 2-2 3 3"/>',file:'<path d="M7 3h7l4 4v14H7zM14 3v5h4"/>',check:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8 12 2.5 2.5L16 9"/>',
 rect:'<rect x="5" y="6" width="14" height="12" rx="2"/>',circle:'<circle cx="12" cy="12" r="7"/>',triangle:'<path d="m12 5 7 14H5z"/>',line:'<path d="M5 17 19 7"/>',curve:'<path d="M4 16c4-8 7 3 11-5 2-4 4-3 5-3"/>',star:'<path d="m12 4 2.4 5 5.6.8-4 3.9.9 5.5L12 16.6 7.1 19.2 8 13.7 4 9.8 9.6 9z"/>',
 formula:'<path d="M18 5H8l5 7-5 7h10"/>',graph:'<path d="M5 19V5M5 19h14M8 15l3-4 3 2 4-6"/>',table:'<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M4 10h16M10 5v14"/>',sticker:'<path d="M12 20c-4.7-3.3-7-5.8-7-9a4 4 0 0 1 7-2.7A4 4 0 0 1 19 11c0 3.2-2.3 5.7-7 9Z"/>',tape:'<path d="M6 8h12v8H6zM8 8l2 8M14 8l2 8"/>',grid:'<rect x="5" y="5" width="14" height="14" rx="2"/><path d="M5 10h14M5 15h14M10 5v14M15 5v14"/>',lined:'<path d="M5 6h14M5 10h14M5 14h14M5 18h14"/>',search:'<circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/>'};return `<svg class="v165PanelIcon" viewBox="0 0 24 24" aria-hidden="true">${p[name]||p.rect}</svg>`}
function tile(label,iconName,action){return `<button class="v152ElementTile" type="button" data-v152-label="${esc(label.toLowerCase())}" onclick="${action}"><span>${v152PanelIcon(iconName)}</span><b>${esc(label)}</b></button>`}
function elementsPanel(){
 const sections=[
  ['Basis',[['Textfeld','text','addCanvasTextBox()'],['Bild / Foto','image','openCanvasMediaPicker()'],['Datei','file',"document.getElementById('canvasAnyFileInput')?.click()"],['Checkliste','check','addCanvasChecklist()']]],
  ['Formen',[['Rechteck','rect',"addVectorShape('rect')"],['Kreis','circle',"addVectorShape('ellipse')"],['Dreieck','triangle',"addVectorShape('triangle')"],['Linie','line',"window.addVectorLine?.()||addCanvasDivider()"],['Kurve','curve',"window.addVectorCurve?.()||window.setVectorTool?.('pen')"],['Stern','star','window.addRoundedStar?.()']]],
  ['Lernen & Mathe',[['Formel','formula','openFormulaDialog()'],['Graph','graph','openGraphDialog()'],['Tabelle','table','openTableDialog()'],['Trennlinie','line','addCanvasDivider()']]],
  ['Deko',[['Sticker','sticker','toggleStickerPanel()'],['Klebeband','tape','addTapeSticker()'],['Kariert','grid',"addPaperSticker('grid')"],['Liniert','lined',"addPaperSticker('line')"]]]
 ];
 const body=`<label class="v152Search">${v152PanelIcon('search')}<input type="search" placeholder="Elemente suchen" oninput="v152FilterElements(this.value)"></label>${sections.map(([title,items])=>`<section class="v152ElementSection"><div class="v152SectionTitle"><b>${title}</b></div><div class="v152ElementGrid">${items.map(x=>tile(...x)).join('')}</div></section>`).join('')}<div class="v152Empty v152ElementEmpty" hidden>Keine passenden Elemente.</div>`;
 return panelShell('Elemente','ELEMENTE',body)
}
window.v152FilterElements=function(value){const term=String(value||'').trim().toLowerCase(),d=q('#canvasQuickDrawer');let n=0;qa('.v152ElementTile',d).forEach(b=>{const ok=!term||(b.dataset.v152Label||'').includes(term);b.hidden=!ok;if(ok)n++});qa('.v152ElementSection',d).forEach(s=>s.hidden=!qa('.v152ElementTile:not([hidden])',s).length);const empty=q('.v152ElementEmpty',d);if(empty)empty.hidden=!!n};
window.v152OpenPanel=function(mode){if(!desktop())return false;if(!['text','elements','templates'].includes(mode))mode='elements';panelMode=mode;const d=q('#canvasQuickDrawer');if(!d)return false;d.classList.add('open','v152DesktopDrawer');d.classList.remove('v147DesktopDrawer');d.dataset.v152Mode=mode;d.innerHTML=mode==='text'?textPanel():mode==='templates'?templatePanel():elementsPanel();document.body.classList.add('editorDrawerOpen');qa('#v151DesktopRail button[data-v151]').forEach(b=>b.classList.toggle('active',b.dataset.v151===mode));return true};
window.v152FontPicked=async function(input){try{if(!input?.files?.[0])return;if(typeof window.v144HandleFontFile!=='function')throw new Error('Schrift-Import ist nicht geladen.');await window.v144HandleFontFile(input);window.cuteToast?.('Schrift hinzugefügt ♡');setTimeout(()=>window.v152OpenPanel('text'),80)}catch(err){console.error('[Studia V152] font import',err);alert('Schrift konnte nicht hinzugefügt werden: '+String(err?.message||err))}finally{if(input)input.value=''}};
function ensureV152Rail(){if(!desktop())return null;const left=q('.v102DesktopLeft'),drawer=q('#canvasQuickDrawer');if(!left||!drawer)return null;let rail=q('#v151DesktopRail',left);if(!rail){rail=document.createElement('nav');rail.id='v151DesktopRail';rail.className='v150DesktopRail v151DesktopRail';rail.setAttribute('aria-label','Editor-Werkzeuge');rail.innerHTML=`<button data-v151="text" aria-label="Text"><span class="editorNavIcon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14M12 5v14M8.5 19h7"/></svg></span><span>Text</span></button><button data-v151="elements" aria-label="Elemente"><span class="editorNavIcon"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="1.4"/><circle cx="17" cy="7" r="3"/><path d="M5 19l3-5 3 5M14 14h6v6h-6z"/></svg></span><span>Elemente</span></button><button data-v151="templates" aria-label="Vorlagen"><span class="editorNavIcon"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="4" width="12" height="16" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/></svg></span><span>Vorlagen</span></button>`;left.insertBefore(rail,drawer)}return rail}
window.v152EnsureRail=ensureV152Rail;
/* Capture before the old V151 bubble handler: Text/Vorlagen always open our real panel. */
document.addEventListener('click',e=>{if(!desktop())return;const b=e.target instanceof Element?e.target.closest('#v151DesktopRail button[data-v151]'):null;if(!b)return;e.preventDefault();e.stopImmediatePropagation();window.v152OpenPanel(b.dataset.v151)},true);
setTimeout(()=>{if(desktop()){ensureV152Rail();window.v152OpenPanel(panelMode)}},650);new MutationObserver(()=>{if(desktop()&&!q('#v151DesktopRail'))requestAnimationFrame(ensureV152Rail)}).observe(document.body,{childList:true,subtree:true});

/* ---------- One drag surface per text object. Tap = caret, drag = move. ---------- */
let activeDrag=null;
function scale(){const s=q('#canvasStage');if(!s)return 1;const r=s.getBoundingClientRect(),w=typeof window.canvasPageWidth==='function'?window.canvasPageWidth():794;return r.width/w||window.canvasZoom||1}
function layer(){let l=q('#v152TextHitLayer');const stage=q('#canvasStage');if(!stage)return null;if(!l){l=document.createElement('div');l.id='v152TextHitLayer';stage.appendChild(l)}l.style.width=(typeof window.canvasPageWidth==='function'?window.canvasPageWidth():794)+'px';l.style.height=(typeof window.canvasPageHeight==='function'?window.canvasPageHeight():1123)+'px';return l}
function selectDirect(id){try{window.selectCanvasObject?.(id)}catch(_){const s=st();if(!s)return;s.selectedType='object';s.selectedId=id;s.selectedIds=[id];s.selectedVectorIds=[];window.renderCanvasInspector?.();window.renderLayerList?.()}}
function placeCaret(el,x,y){try{let range=null;if(document.caretPositionFromPoint){const p=document.caretPositionFromPoint(x,y);if(p){range=document.createRange();range.setStart(p.offsetNode,p.offset);range.collapse(true)}}else if(document.caretRangeFromPoint)range=document.caretRangeFromPoint(x,y);if(range&&el.contains(range.startContainer)){const s=getSelection();s.removeAllRanges();s.addRange(range);return true}}catch(_){ }return false}
function patchEditingText(){const s=st(),id=s?.objects?.find(o=>o.editing&&textKinds.has(o.kind)&&!o.isChecklist)?.id;qa('#canvasObjects .cobj.v152EditingText').forEach(el=>{if(String(el.dataset.id)!==String(id))el.classList.remove('v152EditingText')});if(!id)return;const el=textEl(id);if(el){el.classList.add('v152EditingText');el.style.setProperty('pointer-events','auto','important')}/* kill all historical hit/move overlays for this editing text */qa(`[data-id="${CSS.escape(String(id))}"].v132Hit,[data-id="${CSS.escape(String(id))}"].v131MoveProxy,[data-id="${CSS.escape(String(id))}"].v129MoveProxy,[data-id="${CSS.escape(String(id))}"].v126MoveProxy`).forEach(x=>x.style.setProperty('pointer-events','none','important'))}
function beginEdit(id,x,y){const o=textObj(id);if(!o||o.locked)return false;(st()?.objects||[]).forEach(v=>{if(v!==o)v.editing=false});o.editing=true;window.renderCanvasObjects?.();window.renderCanvasInspector?.();requestAnimationFrame(()=>{const el=textEl(id);if(!el)return;el.classList.add('v152EditingText');try{el.focus({preventScroll:true})}catch(_){el.focus()}if(Number.isFinite(x)&&Number.isFinite(y))placeCaret(el,x,y);patchEditingText();syncTextHits()});return true}
window.v152BeginTextEdit=beginEdit;
function syncTextHits(){const l=layer();if(!l)return;l.replaceChildren();for(const o of st()?.objects||[]){if(!textKinds.has(o.kind)||o.isChecklist||o.locked||o.editing)continue;const hit=document.createElement('div');hit.className='v152TextHit';hit.dataset.id=o.id;hit.style.left=(+o.x||0)+'px';hit.style.top=(+o.y||0)+'px';hit.style.width=Math.max(18,(+o.w||80)-16)+'px';hit.style.height=Math.max(18,(+o.h||40)-16)+'px';hit.style.transform=`rotate(${+o.rotation||0}deg)`;hit.style.transformOrigin='50% 50%';hit.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;e.preventDefault();e.stopPropagation();selectDirect(o.id);const z=scale();activeDrag={pid:e.pointerId,id:o.id,sx:e.clientX,sy:e.clientY,ox:+o.x||0,oy:+o.y||0,z,moved:false,hit};try{hit.setPointerCapture?.(e.pointerId)}catch(_){ }},{passive:false});hit.addEventListener('pointermove',e=>{const d=activeDrag;if(!d||d.pid!==e.pointerId||d.id!==o.id)return;const dx=(e.clientX-d.sx)/d.z,dy=(e.clientY-d.sy)/d.z;if(!d.moved&&Math.hypot(dx,dy)<5)return;d.moved=true;e.preventDefault();const W=typeof window.canvasPageWidth==='function'?window.canvasPageWidth():794,H=typeof window.canvasPageHeight==='function'?window.canvasPageHeight():1123;o.x=Math.max(0,Math.min(Math.max(0,W-o.w),d.ox+dx));o.y=Math.max(0,Math.min(Math.max(0,H-o.h),d.oy+dy));const el=textEl(o.id);if(el){el.style.left=o.x+'px';el.style.top=o.y+'px'}hit.style.left=o.x+'px';hit.style.top=o.y+'px';window.markCanvasDirty?.(false)},{passive:false});const end=e=>{const d=activeDrag;if(!d||d.pid!==e.pointerId||d.id!==o.id)return;activeDrag=null;try{hit.releasePointerCapture?.(e.pointerId)}catch(_){ }if(d.moved){window.pushHistory?.();window.renderCanvasInspector?.();window.v132SyncHits?.();syncTextHits()}else beginEdit(o.id,e.clientX,e.clientY)};hit.addEventListener('pointerup',end);hit.addEventListener('pointercancel',()=>{activeDrag=null;syncTextHits()});l.appendChild(hit)}patchEditingText()}
const baseRender=window.renderCanvasObjects;window.renderCanvasObjects=function(){const r=baseRender?.apply(this,arguments);requestAnimationFrame(syncTextHits);return r};try{renderCanvasObjects=window.renderCanvasObjects}catch(_){ }
const v152ObjectRoot=q('#canvasObjects');if(v152ObjectRoot)new MutationObserver(()=>requestAnimationFrame(syncTextHits)).observe(v152ObjectRoot,{childList:true});setTimeout(syncTextHits,650);

/* ---------- Partial rich-text formatting: selected words only ---------- */
let savedRange=null,savedObjectId=null,selTimer=null;
function editingEl(id=savedObjectId||st()?.selectedId){return id?q(`.cobj[data-id="${CSS.escape(String(id))}"][contenteditable="true"]`):null}
function rangeInside(el,r){if(!el||!r)return false;const n=r.commonAncestorContainer;return n===el||el.contains(n.nodeType===1?n:n.parentNode)}
function rememberRange(){if(!document.body.classList.contains('editorMode'))return false;const s=getSelection?.();if(!s||!s.rangeCount)return false;const r=s.getRangeAt(0);if(r.collapsed)return false;const node=r.commonAncestorContainer.nodeType===1?r.commonAncestorContainer:r.commonAncestorContainer.parentElement,el=node?.closest?.('.cobj[contenteditable="true"]');if(!el||!rangeInside(el,r))return false;const o=textObj(el.dataset.id);if(!o)return false;try{savedRange=r.cloneRange();savedObjectId=o.id;return true}catch(_){return false}}
function restoreRange(){if(!savedRange||!savedObjectId)return false;const el=editingEl(savedObjectId);if(!el||!rangeInside(el,savedRange)){savedRange=null;savedObjectId=null;return false}try{const s=getSelection();s.removeAllRanges();s.addRange(savedRange.cloneRange());el.focus({preventScroll:true});return true}catch(_){return false}}
function hasRange(){if(rememberRange())return true;return !!(savedRange&&savedObjectId&&editingEl(savedObjectId)&&!savedRange.collapsed)}
function syncHTML(push=true){const id=savedObjectId||st()?.selectedId,el=editingEl(id),o=textObj(id);if(!el||!o)return;o.text=el.innerHTML;window.markCanvasDirty?.();if(push)window.pushHistory?.();try{const s=getSelection();if(s?.rangeCount)savedRange=s.getRangeAt(0).cloneRange()}catch(_){ }}
function exec(cmd,value=null){if(!hasRange()||!restoreRange())return false;try{document.execCommand('styleWithCSS',false,true)}catch(_){ }let ok=false;try{ok=document.execCommand(cmd,false,value)}catch(_){ }syncHTML(true);return ok!==false}
function fontSize(px){if(!hasRange()||!restoreRange())return false;try{document.execCommand('styleWithCSS',false,false);document.execCommand('fontSize',false,'7');const el=editingEl(savedObjectId);el?.querySelectorAll('font[size="7"]').forEach(n=>{n.removeAttribute('size');n.style.fontSize=`${Math.max(6,Math.min(180,Number(px)||16))}px`});syncHTML(true);return true}catch(_){return false}}
function rich(prop,value){if(!hasRange())return false;if(prop==='color')return exec('foreColor',value);if(prop==='fontFamily')return exec('fontName',String(value).replace(/^['"]|['"]$/g,''));if(prop==='fontSize')return fontSize(value);if(prop==='fontWeight'){restoreRange();const on=!!document.queryCommandState?.('bold'),want=Number(value)>=600;if(on!==want)return exec('bold');return true}if(prop==='fontStyle'){restoreRange();const on=!!document.queryCommandState?.('italic'),want=String(value)==='italic';if(on!==want)return exec('italic');return true}if(prop==='textDecoration'){restoreRange();const on=!!document.queryCommandState?.('underline'),want=String(value).includes('underline');if(on!==want)return exec('underline');return true}if(prop==='textAlign'){const m={left:'justifyLeft',center:'justifyCenter',right:'justifyRight',justify:'justifyFull'};return m[value]?exec(m[value]):false}return false}
window.v152RememberRange=rememberRange;window.v152RestoreRange=restoreRange;window.v152HasRange=hasRange;
document.addEventListener('selectionchange',()=>{clearTimeout(selTimer);selTimer=setTimeout(()=>{rememberRange();updateMobileBar()},0)});
document.addEventListener('pointerup',e=>{if(e.target.closest?.('.cobj[contenteditable="true"]'))setTimeout(()=>{rememberRange();updateMobileBar()},10)},true);
document.addEventListener('keyup',e=>{if(e.target.closest?.('.cobj[contenteditable="true"]'))setTimeout(()=>{rememberRange();updateMobileBar()},0)},true);
document.addEventListener('pointerdown',e=>{if(e.target.closest?.('.v134FormatTools,.v137FormatToolbar,#canvasInspector,#canvasQuickDrawer,#v152SelectionBar,#v152FormatPopover,.v144FontModal'))rememberRange()},true);
const baseApply=window.applyTextProperty;window.applyTextProperty=function(prop,value){if(rich(prop,value))return;return baseApply?.apply(this,arguments)};try{applyTextProperty=window.applyTextProperty}catch(_){ }
const baseFormat=window.formatSelectedText;window.formatSelectedText=function(cmd){const map={bold:'bold',italic:'italic',underline:'underline',strikeThrough:'strikeThrough',insertUnorderedList:'insertUnorderedList',insertOrderedList:'insertOrderedList'};if(map[cmd]&&hasRange())return exec(map[cmd]);return baseFormat?.apply(this,arguments)};try{formatSelectedText=window.formatSelectedText}catch(_){ }
const b134=window.v134ToggleText;window.v134ToggleText=function(prop){if(hasRange()){const m={fontWeight:'bold',fontStyle:'italic',textDecoration:'underline'};if(m[prop])return exec(m[prop])}return b134?.apply(this,arguments)};
const b137=window.v137ToggleText;window.v137ToggleText=function(kind){if(hasRange()){const m={fontWeight:'bold',fontStyle:'italic',underline:'underline',strike:'strikeThrough'};if(m[kind])return exec(m[kind])}return b137?.apply(this,arguments)};
const b137t=window.v137Text;window.v137Text=function(prop,value){if(rich(prop,value))return;return b137t?.apply(this,arguments)};

/* ---------- Mobile selection toolbar ---------- */
let bar=null,pop=null;
function rangeInfo(){if(!mobile())return null;const s=getSelection?.();if(!s||!s.rangeCount||s.isCollapsed)return null;const r=s.getRangeAt(0),n=r.commonAncestorContainer.nodeType===1?r.commonAncestorContainer:r.commonAncestorContainer.parentElement,el=n?.closest?.('.cobj[contenteditable="true"]');return el?{r,el}:null}
function ensureBar(){if(bar)return bar;bar=document.createElement('div');bar.id='v152SelectionBar';bar.innerHTML=`<button type="button" data-a="bold"><b>B</b></button><button type="button" data-a="italic"><i>I</i></button><button type="button" data-a="underline"><u>U</u></button><label class="v152SelectionColor" title="Farbe"><span>●</span><input type="color" value="#333333"></label><button type="button" data-a="format"><b>Aa</b><span>Format</span></button>`;document.body.appendChild(bar);bar.addEventListener('pointerdown',e=>{rememberRange();if(e.target.closest('button'))e.preventDefault()},true);bar.querySelector('[data-a="bold"]').onclick=()=>{restoreRange();window.formatSelectedText?.('bold');updateMobileBar()};bar.querySelector('[data-a="italic"]').onclick=()=>{restoreRange();window.formatSelectedText?.('italic');updateMobileBar()};bar.querySelector('[data-a="underline"]').onclick=()=>{restoreRange();window.formatSelectedText?.('underline');updateMobileBar()};bar.querySelector('input[type=color]').addEventListener('input',e=>{restoreRange();window.applyTextProperty?.('color',e.target.value);updateMobileBar()});bar.querySelector('[data-a="format"]').onclick=togglePop;return bar}
function hideBar(){bar?.classList.remove('show');pop?.remove();pop=null}
function updateMobileBar(){const info=rangeInfo();if(!info){hideBar();return}rememberRange();const b=ensureBar(),rect=info.r.getBoundingClientRect(),bw=b.offsetWidth||230,bh=b.offsetHeight||42;let left=(rect.left+rect.right)/2-bw/2;left=Math.max(8,Math.min(innerWidth-bw-8,left));let top=rect.top-bh-9;if(top<58)top=Math.min(innerHeight-bh-8,rect.bottom+9);b.style.left=left+'px';b.style.top=top+'px';b.classList.add('show');if(pop){pop.style.left=Math.max(8,Math.min(innerWidth-pop.offsetWidth-8,left))+'px';pop.style.top=Math.min(innerHeight-pop.offsetHeight-8,top+bh+6)+'px'}}
function applyPreset(id){const p=(window.canvasPresets?.()||[]).find(x=>x.id===id);if(!p)return;restoreRange();if(p.fontFamily)window.applyTextProperty?.('fontFamily',p.fontFamily);if(p.fontSize)window.applyTextProperty?.('fontSize',p.fontSize);if(p.color)window.applyTextProperty?.('color',p.color);if(p.fontWeight)window.applyTextProperty?.('fontWeight',p.fontWeight);if(p.fontStyle)window.applyTextProperty?.('fontStyle',p.fontStyle);updateMobileBar()}
function togglePop(){rememberRange();if(pop){pop.remove();pop=null;return}const presets=window.canvasPresets?.()||[];pop=document.createElement('div');pop.id='v152FormatPopover';pop.innerHTML=`<div class="v152PopHead">TEXTFORMAT</div>${presets.map(p=>`<button type="button" data-id="${esc(p.id)}"><span style="font-family:${esc(p.fontFamily||'Arial')};font-weight:${esc(p.fontWeight||700)};color:${esc(p.color||'#725b53')}">Aa</span><b>${esc(p.name||'Format')}</b></button>`).join('')}`;document.body.appendChild(pop);pop.addEventListener('pointerdown',e=>{rememberRange();e.preventDefault()},true);pop.onclick=e=>{const b=e.target.closest('button[data-id]');if(!b)return;applyPreset(b.dataset.id);pop.remove();pop=null};updateMobileBar()}
window.v152ApplyPresetToSelection=applyPreset;
window.addEventListener('resize',()=>{setTimeout(syncTextHits,50);setTimeout(updateMobileBar,50)});

/* Keep one current visible version. */
function version(){const e=q('#headerEyebrow');if(e&&e.textContent!=='VERSION 166')e.textContent='VERSION 166';document.documentElement.classList.add('v151Ready');document.title='Studia'}
setTimeout(version,0);setTimeout(version,100);setTimeout(version,800);setTimeout(version,2200);
})();
/* ===== /Studia V152 ===== */

/* ===== Studia V164 — safe editor-only tools (no boot/navigation changes) ===== */
(function(){
'use strict';
const q=(s,r=document)=>r.querySelector(s), qa=(s,r=document)=>[...r.querySelectorAll(s)];
const isEditor=()=>document.body.classList.contains('editorMode')&&!!q('#view-sheet-editor.active');
const textKinds=new Set(['text','block','task','merke','file']);
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const svg=(body,cls='')=>`<svg class="v164Icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
const I={
 plus:svg('<path d="M12 5v14M5 12h14"/>'),
 font:svg('<path d="M5 19 10.2 5h3.6L19 19M7.4 13h9.2"/>'),
 left:svg('<path d="M4 6h14M4 10h10M4 14h14M4 18h9"/>'),
 center:svg('<path d="M5 6h14M7 10h10M5 14h14M7 18h10"/>'),
 right:svg('<path d="M6 6h14M10 10h10M6 14h14M11 18h9"/>'),
 justify:svg('<path d="M4 6h16M4 10h16M4 14h16M4 18h16"/>'),
 link:svg('<path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1"/>'),
 paint:svg('<path d="M14 4 20 10 11 19H5v-6l9-9Z"/><path d="m12 6 6 6M5 19l-1 1"/>'),
 edit:svg('<path d="m4 20 4.2-1 10.6-10.6a2.1 2.1 0 0 0-3-3L5.2 16 4 20Z"/><path d="m14.5 6.5 3 3"/>'),
 trash:svg('<path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/>'),
 close:svg('<path d="m6 6 12 12M18 6 6 18"/>')
};

/* ---------- compact, safe desktop text toolbar ---------- */
function storedFontNames(){
 const out=[];
 for(const key of ['schoolbloom-v91-custom-fonts','schoolbloom-custom-fonts']){
  try{for(const f of JSON.parse(localStorage.getItem(key)||'[]'))if(f?.name&&!out.includes(f.name))out.push(f.name)}catch(_){ }
 }
 return out;
}
function fontOptions(){
 const base=['Arial','Inter','Trebuchet MS','Verdana','Georgia','Times New Roman'];
 return [...new Set([...base,...storedFontNames()])].map(n=>`<option value="${esc(n)}" style="font-family:${esc(n)}">${esc(n)}</option>`).join('');
}
function toolbarHTML(){return `<div class="v164FormatToolbar v165FormatToolbar">
 <div class="v164ToolGroup v164FontGroup v165FontGroup">
  <button class="v165FontMenuBtn" type="button" title="Schrift auswählen · Vorschau" onclick="v165ToggleFontMenu(this)"><span class="v165FontSample" style="font-family:Inter">Inter</span><svg class="v164Icon v165Chevron" viewBox="0 0 24 24"><path d="m7 9 5 5 5-5"/></svg></button>
  <button class="v165AddFontBtn" type="button" title="Schrift hinzufügen" onclick="v164AddFont()">${I.plus}<span>Schrift</span></button>
  <input class="v164Size v165Size" title="Schriftgröße" type="number" min="6" max="180" value="16" onchange="applyTextProperty('fontSize',+this.value)">
 </div>
 <div class="v164ToolGroup v164TextStyle v165TextStyle" aria-label="Textformat">
  <button type="button" title="Fett" onclick="formatSelectedText('bold')"><b>B</b></button>
  <button type="button" title="Kursiv" onclick="formatSelectedText('italic')"><i>I</i></button>
  <button type="button" title="Unterstrichen" onclick="formatSelectedText('underline')"><u>U</u></button>
  <button type="button" title="Durchgestrichen" onclick="formatSelectedText('strikeThrough')"><s>S</s></button>
  <label class="v164Color v165Color" title="Textfarbe"><span>A</span><input type="color" value="#333333" onchange="applyTextProperty('color',this.value)"></label>
 </div>
 <div class="v164ToolGroup v164Align v165Align" aria-label="Ausrichtung">
  <button type="button" title="Linksbündig" onclick="applyTextProperty('textAlign','left')">${I.left}</button>
  <button type="button" title="Zentriert" onclick="applyTextProperty('textAlign','center')">${I.center}</button>
  <button type="button" title="Rechtsbündig" onclick="applyTextProperty('textAlign','right')">${I.right}</button>
  <button type="button" title="Blocksatz" onclick="applyTextProperty('textAlign','justify')">${I.justify}</button>
 </div>
 <div class="v164ToolGroup v164Actions v165Actions">
  <button type="button" title="Hyperlink auf markierten Text" onclick="v164Hyperlink()">${I.link}</button>
  <button class="v165PainterBtn" type="button" title="Format übertragen (I)" onclick="v165ToggleFormatPainter()">${I.paint}</button>
 </div>
 </div>`}
function populateFonts(){try{window.v165RefreshFontButton?.()}catch(_){}}
function ensureToolbar(){
 if(!isEditor()||innerWidth<900)return;const host=q('.v134FormatTools');if(!host)return;
 if(host.dataset.v164!=='1'){host.dataset.v164='1';host.innerHTML=toolbarHTML()}
 populateFonts();syncPainterButton();normalizeEditorIcons();
}
window.v164AddFont=function(){window.v91PickFont?.();setTimeout(populateFonts,700);setTimeout(populateFonts,1800)};

/* ---------- shift-click = multi-select, including text hit layer ---------- */
function toggleObject(id){
 if(typeof window.toggleObjectInMultiSelection==='function')return window.toggleObjectInMultiSelection(id);
 const set=new Set(canvasState.selectedIds||[]);set.has(id)?set.delete(id):set.add(id);canvasState.selectedIds=[...set];canvasState.selectedVectorIds=canvasState.selectedVectorIds||[];canvasState.selectedType=canvasState.selectedIds.length?'object':canvasState.selectedVectorIds.length?'vector':null;canvasState.selectedId=canvasState.selectedIds.at(-1)||canvasState.selectedVectorIds.at(-1)||null;canvasState.multiMode=(canvasState.selectedIds.length+canvasState.selectedVectorIds.length)>1;renderCanvasObjects?.();renderCanvasInspector?.();
}
document.addEventListener('pointerdown',e=>{
 if(!isEditor()||!e.shiftKey)return;const hit=e.target instanceof Element?e.target.closest('.v152TextHit'):null;if(!hit)return;
 e.preventDefault();e.stopImmediatePropagation();toggleObject(hit.dataset.id);
},{capture:true,passive:false});

/* ---------- selected-word hyperlinks ---------- */
function selectedEditable(){const s=getSelection?.();if(!s?.rangeCount)return null;const r=s.getRangeAt(0),n=r.commonAncestorContainer.nodeType===1?r.commonAncestorContainer:r.commonAncestorContainer.parentElement;return n?.closest?.('.cobj[contenteditable="true"]')||null}
window.v164Hyperlink=function(){
 if(window.v152HasRange?.()){
  window.v152RememberRange?.();const s=getSelection?.(),text=s?.toString?.().trim()||'markierter Text';
  openModal?.(`<div class="v135Modal v164LinkModal"><div class="v135ModalHead"><div><span class="eyebrow">HYPERLINK</span><h2>Markierten Text verlinken</h2></div><button class="v164IconOnly" onclick="closeModal()">${I.close}</button></div><p class="v164LinkSelection">${esc(text)}</p><div class="v135FormGrid"><label class="full">Web-Adresse<input id="v164RichLinkUrl" type="text" placeholder="https://…"></label></div><div class="v135ActionRow"><button onclick="closeModal()">Abbrechen</button><button class="primary" onclick="v164ApplyRichLink()">Link speichern</button></div></div>`);return;
 }
 window.openHyperlinkDialog?.();
};
window.v164ApplyRichLink=function(){
 let url=q('#v164RichLinkUrl')?.value.trim()||'';if(!url)return;
 if(!/^[a-z][a-z0-9+.-]*:/i.test(url)&&!url.startsWith('#'))url='https://'+url;
 if(!window.v152RestoreRange?.())return;
 const el=selectedEditable();if(!el)return;
 try{document.execCommand('createLink',false,url)}catch(_){return}
 el.querySelectorAll('a[href]').forEach(a=>{a.target='_blank';a.rel='noopener noreferrer'});
 const o=(canvasState.objects||[]).find(x=>String(x.id)===String(el.dataset.id));if(o)o.text=el.innerHTML;
 markCanvasDirty?.();pushHistory?.();closeModal?.();cuteToast?.('Link gesetzt ♡');
};

/* ---------- real format painter ---------- */
let painter=null;
function nodePath(node,root){const parts=[];let n=node;while(n&&n!==root){const p=n.parentNode;if(!p)break;parts.push([].indexOf.call(p.childNodes,n));n=p}return parts.reverse().join('.')}
function currentRangeSignature(){
 const s=getSelection?.();if(!s?.rangeCount||s.isCollapsed)return '';const r=s.getRangeAt(0),el=selectedEditable();if(!el)return '';
 return `${el.dataset.id}|${nodePath(r.startContainer,el)}:${r.startOffset}|${nodePath(r.endContainer,el)}:${r.endOffset}`;
}
function captureRangeFormat(){
 if(!window.v152HasRange?.()||!window.v152RestoreRange?.())return null;const s=getSelection?.();if(!s?.rangeCount)return null;const r=s.getRangeAt(0),el=selectedEditable();if(!el)return null;
 const n=r.startContainer.nodeType===1?r.startContainer:r.startContainer.parentElement,cs=getComputedStyle(n||el),block=getComputedStyle(el);
 return {mode:'range',sourceSig:currentRangeSignature(),style:{fontFamily:cs.fontFamily,fontSize:parseFloat(cs.fontSize)||16,color:cs.color,bold:!!document.queryCommandState?.('bold'),italic:!!document.queryCommandState?.('italic'),underline:!!document.queryCommandState?.('underline'),strike:!!document.queryCommandState?.('strikeThrough'),textAlign:block.textAlign||'left'}};
}
function captureObjectFormat(){
 const o=(canvasState.objects||[]).find(x=>String(x.id)===String(canvasState.selectedId));if(!o||!textKinds.has(o.kind))return null;
 const st=o.style||{};return {mode:'object',sourceId:o.id,style:{fontFamily:st.fontFamily,fontSize:st.fontSize,color:st.color,fontWeight:st.fontWeight,fontStyle:st.fontStyle,textDecoration:st.textDecoration,textAlign:st.textAlign,lineHeight:st.lineHeight,letterSpacing:st.letterSpacing}};
}
function syncPainterButton(){q('.v164PainterBtn')?.classList.toggle('active',!!painter);document.body.classList.toggle('v164PainterOn',!!painter)}
function stopPainter(msg=''){painter=null;syncPainterButton();if(msg)cuteToast?.(msg)}
window.v164ToggleFormatPainter=function(){
 if(painter){stopPainter();return}
 window.v152RememberRange?.();painter=captureRangeFormat()||captureObjectFormat();
 if(!painter){cuteToast?.('Markiere Text oder wähle ein Textfeld aus ♡');return}
 syncPainterButton();cuteToast?.('Format aufgenommen · Ziel markieren ♡');
};
function setToggle(cmd,want){const on=!!document.queryCommandState?.(cmd);if(on!==!!want)document.execCommand(cmd,false,null)}
function applyRangePainter(){
 if(!painter||painter.mode!=='range'||!window.v152RestoreRange?.())return false;const el=selectedEditable();if(!el)return false;const st=painter.style;
 try{
  document.execCommand('styleWithCSS',false,true);
  if(st.fontFamily)document.execCommand('fontName',false,String(st.fontFamily).replace(/^['"]|['"]$/g,''));
  if(st.color)document.execCommand('foreColor',false,st.color);
  document.execCommand('styleWithCSS',false,false);document.execCommand('fontSize',false,'7');
  el.querySelectorAll('font[size="7"]').forEach(n=>{n.removeAttribute('size');n.style.fontSize=`${Math.max(6,Math.min(180,Number(st.fontSize)||16))}px`});
  document.execCommand('styleWithCSS',false,true);setToggle('bold',st.bold);setToggle('italic',st.italic);setToggle('underline',st.underline);setToggle('strikeThrough',st.strike);
  const align={left:'justifyLeft',center:'justifyCenter',right:'justifyRight',justify:'justifyFull'}[st.textAlign];if(align)document.execCommand(align,false,null);
 }catch(_){return false}
 const o=(canvasState.objects||[]).find(x=>String(x.id)===String(el.dataset.id));if(o)o.text=el.innerHTML;markCanvasDirty?.();pushHistory?.();renderCanvasInspector?.();return true;
}
function applyObjectPainter(id){
 if(!painter||painter.mode!=='object'||String(id)===String(painter.sourceId))return false;const o=(canvasState.objects||[]).find(x=>String(x.id)===String(id));if(!o||!textKinds.has(o.kind))return false;o.style||={};
 for(const [k,v] of Object.entries(painter.style))if(v!==undefined&&v!==null&&v!=='')o.style[k]=v;
 renderCanvasObjects?.();renderCanvasInspector?.();markCanvasDirty?.();pushHistory?.();return true;
}
document.addEventListener('pointerup',e=>{
 if(!painter||!isEditor()||e.target.closest?.('.v164FormatToolbar'))return;
 if(painter.mode==='range'){
  setTimeout(()=>{if(!painter)return;window.v152RememberRange?.();const sig=currentRangeSignature();if(!sig||sig===painter.sourceSig)return;if(applyRangePainter())stopPainter('Format übertragen ♡')},20);
 }else{
  const hit=e.target instanceof Element?e.target.closest('[data-id]'):null,id=hit?.dataset?.id;if(!id)return;setTimeout(()=>{if(applyObjectPainter(id))stopPainter('Format übertragen ♡')},0);
 }
},true);

/* ---------- Illustrator-like shortcuts without touching typing ---------- */
function typingTarget(){const a=document.activeElement;return !!(a&&(a.matches?.('input,textarea,select')||a.isContentEditable))}
function cutSelection(){copySelectedCanvasItems?.();if(typeof performDeleteSelectedCanvasItem==='function')performDeleteSelectedCanvasItem();else deleteSelectedCanvasItem?.()}
function chooseSelectTool(){try{setVectorTool?.('select')}catch(_){ }if(document.body.classList.contains('v132SelectionOff'))window.v132ToggleSelection?.()}
document.addEventListener('keydown',e=>{
 if(!isEditor()||innerWidth<900)return;const mod=e.ctrlKey||e.metaKey,key=e.key.toLowerCase(),typing=typingTarget();
 /* In text editing, keep native browser text shortcuts instead of canvas shortcuts. */
 if(typing){if(mod&&['a','c','v','x','z','y'].includes(key))e.stopPropagation();if(mod&&key==='k'){e.preventDefault();e.stopImmediatePropagation();window.v152RememberRange?.();window.v164Hyperlink()}return}
 if(mod&&e.shiftKey&&key==='z'){e.preventDefault();e.stopImmediatePropagation();redoCanvas?.();return}
 if(mod&&key==='x'){e.preventDefault();e.stopImmediatePropagation();cutSelection();return}
 if(key==='escape'&&painter){e.preventDefault();e.stopImmediatePropagation();stopPainter('Format übertragen beendet');return}
 if(mod||e.altKey)return;
 if(key==='v'){e.preventDefault();e.stopImmediatePropagation();chooseSelectTool();return}
 if(key==='t'){e.preventDefault();e.stopImmediatePropagation();addCanvasTextBox?.();return}
 if(key==='m'){e.preventDefault();e.stopImmediatePropagation();addVectorShape?.('rect');return}
 if(key==='l'){e.preventDefault();e.stopImmediatePropagation();addVectorShape?.('ellipse');return}
 if(key==='p'){e.preventDefault();e.stopImmediatePropagation();setVectorTool?.('pen');return}
 if(key==='i'){e.preventDefault();e.stopImmediatePropagation();(window.v165ToggleFormatPainter||window.v164ToggleFormatPainter)?.();return}
},{capture:true});

/* ---------- help + icon cleanup ---------- */
window.openShortcutHelp=function(){openModal?.(`<div class="shortcutModal v164ShortcutModal"><div class="presetModalHead"><div><span class="eyebrow">DESKTOP</span><h2>Tastenkürzel</h2></div><button class="miniIcon" onclick="closeModal()">${I.close}</button></div><div class="shortcutGrid">
 <span><kbd>Ctrl/⌘ Z</kbd> Rückgängig</span><span><kbd>Ctrl/⌘ ⇧ Z</kbd> Wiederholen</span>
 <span><kbd>Ctrl/⌘ C</kbd> Kopieren</span><span><kbd>Ctrl/⌘ X</kbd> Ausschneiden</span>
 <span><kbd>Ctrl/⌘ V</kbd> Einfügen</span><span><kbd>Ctrl/⌘ D</kbd> Duplizieren</span>
 <span><kbd>Ctrl/⌘ A</kbd> Alles auswählen</span><span><kbd>Shift + Klick</kbd> Mehrfachauswahl</span>
 <span><kbd>Ctrl/⌘ G</kbd> Gruppieren</span><span><kbd>Ctrl/⌘ ⇧ G</kbd> Gruppe lösen</span>
 <span><kbd>V</kbd> Auswahl</span><span><kbd>T</kbd> Textfeld</span>
 <span><kbd>M</kbd> Rechteck</span><span><kbd>L</kbd> Kreis / Ellipse</span>
 <span><kbd>P</kbd> Zeichenstift</span><span><kbd>I</kbd> Format übertragen</span>
 <span><kbd>Ctrl/⌘ K</kbd> Hyperlink</span><span><kbd>Shift + Pfeil</kbd> 10 px bewegen</span>
 </div></div>`)};
function normalizeEditorIcons(){
 if(!isEditor())return;
 const map={Umbenennen:I.edit,Löschen:I.trash,'Leiste schließen':I.close};
 for(const [title,ico] of Object.entries(map))for(const b of qa(`button[title="${title}"]`)){
  if(b.closest('.v164FormatToolbar'))continue;
  if(!b.querySelector('svg')&&(b.childElementCount===0||/^[×✎✕]$/.test(b.textContent.trim())))b.innerHTML=ico;
 }
 qa('.v135LayerGroupHead button svg,.v135SideClose svg,.v164IconOnly svg').forEach(s=>s.classList.add('v164Icon'));
}

/* Do not observe the DOM continuously. Hook only editor renders and a few safe timers. */
const baseRenderSheet=window.renderSheetEditor;if(baseRenderSheet)window.renderSheetEditor=function(){const r=baseRenderSheet.apply(this,arguments);setTimeout(ensureToolbar,80);setTimeout(normalizeEditorIcons,120);return r};
try{renderSheetEditor=window.renderSheetEditor}catch(_){ }
const baseLayer=window.renderLayerList;if(baseLayer)window.renderLayerList=function(){const r=baseLayer.apply(this,arguments);requestAnimationFrame(normalizeEditorIcons);return r};
try{renderLayerList=window.renderLayerList}catch(_){ }
window.addEventListener('resize',()=>setTimeout(ensureToolbar,100));
setTimeout(ensureToolbar,600);setTimeout(ensureToolbar,1500);setTimeout(()=>{const e=q('#headerEyebrow');if(e)e.textContent='VERSION 166'},2400);
})();
/* ===== /Studia V164 ===== */


/* ===== Studia V165 — precise text editing, cute chrome, print isolation & sticker palette ===== */
(function(){
'use strict';
if(window.__STUDIA_V165__)return;window.__STUDIA_V165__=true;
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
const editor=()=>document.body.classList.contains('editorMode')&&!!q('#view-sheet-editor.active');
const textKinds=new Set(['text','block','task','merke','file']);
const state=()=>{try{return canvasState}catch(_){return window.canvasState}};
const selectedTextObj=()=>{const s=state();return (s?.objects||[]).find(o=>String(o.id)===String(s?.selectedId)&&textKinds.has(o.kind))||null};
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

/* ---------- text: middle edits, border moves ---------- */
let drag165=null;
function zoom165(){const st=q('#canvasStage');if(!st)return 1;const r=st.getBoundingClientRect();return r.width/Math.max(1,(typeof canvasPageWidth==='function'?canvasPageWidth():794))||1}
function chooseText165(id){try{selectCanvasObject(id)}catch(_){const s=state();if(!s)return;s.selectedType='object';s.selectedId=id;s.selectedIds=[id];s.selectedVectorIds=[];renderCanvasInspector?.()}}
function toggleMulti165(id){if(typeof toggleObjectInMultiSelection==='function')return toggleObjectInMultiSelection(id);const s=state();if(!s)return;const set=new Set(s.selectedIds||[]);set.has(id)?set.delete(id):set.add(id);s.selectedIds=[...set];s.selectedType=s.selectedIds.length?'object':null;s.selectedId=s.selectedIds.at(-1)||null;s.multiMode=s.selectedIds.length>1;renderCanvasObjects?.();renderCanvasInspector?.()}
function dragStart165(e,o,wrap){if(o.locked)return;e.preventDefault();e.stopImmediatePropagation();chooseText165(o.id);const z=zoom165();drag165={id:o.id,pid:e.pointerId,sx:e.clientX,sy:e.clientY,ox:+o.x||0,oy:+o.y||0,z,moved:false,wrap};try{e.currentTarget.setPointerCapture?.(e.pointerId)}catch(_){}document.body.classList.add('v165MovingText')}
function dragMove165(e){const d=drag165;if(!d||d.pid!==e.pointerId)return;const s=state(),o=(s?.objects||[]).find(x=>String(x.id)===String(d.id));if(!o)return;const dx=(e.clientX-d.sx)/d.z,dy=(e.clientY-d.sy)/d.z;if(!d.moved&&Math.hypot(dx,dy)<3)return;d.moved=true;e.preventDefault();let nx=d.ox+dx,ny=d.oy+dy;const W=typeof canvasPageWidth==='function'?canvasPageWidth():794,H=typeof canvasPageHeight==='function'?canvasPageHeight():1123;nx=Math.max(0,Math.min(Math.max(0,W-o.w),nx));ny=Math.max(0,Math.min(Math.max(0,H-o.h),ny));try{if(typeof snapObjectPosition==='function'){const sn=snapObjectPosition(o,nx,ny);nx=sn.x;ny=sn.y}}catch(_){}o.x=nx;o.y=ny;const el=q(`.cobj[data-id="${CSS.escape(String(o.id))}"]`);if(el){el.style.left=nx+'px';el.style.top=ny+'px'}if(d.wrap){d.wrap.style.left=nx+'px';d.wrap.style.top=ny+'px'}markCanvasDirty?.(false)}
function dragEnd165(e){const d=drag165;if(!d||d.pid!==e.pointerId)return;drag165=null;document.body.classList.remove('v165MovingText');try{clearGuides?.()}catch(_){}if(d.moved){pushHistory?.();renderCanvasInspector?.();window.v132SyncHits?.()}setTimeout(buildTextInteractions165,0)}
function addMoveEdge165(wrap,edge,o){const h=document.createElement('div');h.className=`v165TextMoveEdge ${edge}`;h.title='Am Rand ziehen = Textfeld bewegen';h.addEventListener('pointerdown',e=>{if(e.shiftKey){e.preventDefault();e.stopImmediatePropagation();toggleMulti165(o.id);return}dragStart165(e,o,wrap)},{capture:true,passive:false});h.addEventListener('pointermove',dragMove165,{passive:false});h.addEventListener('pointerup',dragEnd165);h.addEventListener('pointercancel',dragEnd165);wrap.appendChild(h)}
function buildTextInteractions165(){if(!editor())return;const layer=q('#v152TextHitLayer'),s=state();if(!layer||!s)return;const current=qa(':scope > .v165TextInteraction',layer);if(current.length&&current.length===(s.objects||[]).filter(o=>textKinds.has(o.kind)&&!o.isChecklist&&!o.editing).length&&!q(':scope > .v152TextHit',layer))return;layer.replaceChildren();for(const o of s.objects||[]){if(!textKinds.has(o.kind)||o.isChecklist||o.editing)continue;const wrap=document.createElement('div');wrap.className='v165TextInteraction'+(((s.selectedIds||[]).includes(o.id)||String(s.selectedId)===String(o.id))?' selected':'')+(o.locked?' locked':'');wrap.dataset.id=o.id;Object.assign(wrap.style,{left:(+o.x||0)+'px',top:(+o.y||0)+'px',width:Math.max(18,+o.w||80)+'px',height:Math.max(18,+o.h||40)+'px',transform:`rotate(${+o.rotation||0}deg)`,transformOrigin:'50% 50%'});const edit=document.createElement('div');edit.className='v165TextEditArea';edit.title=o.locked?'Textfeld ist gesperrt':'In die Mitte klicken = Text bearbeiten';edit.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;if(e.shiftKey){e.preventDefault();e.stopImmediatePropagation();toggleMulti165(o.id);return}e.preventDefault();e.stopImmediatePropagation();chooseText165(o.id);if(o.locked)return;if(painter165){if(applyObject165(o.id,painter165.style))stopPainter165('Format übertragen ♡');return}const x=e.clientX,y=e.clientY;setTimeout(()=>window.v152BeginTextEdit?.(o.id,x,y),0)},{capture:true,passive:false});wrap.appendChild(edit);for(const edge of ['top','right','bottom','left'])addMoveEdge165(wrap,edge,o);layer.appendChild(wrap)}layer.dataset.v165='1'}
function scheduleText165(){requestAnimationFrame(()=>requestAnimationFrame(buildTextInteractions165))}
const renderObjects165=window.renderCanvasObjects;if(renderObjects165)window.renderCanvasObjects=function(){const r=renderObjects165.apply(this,arguments);scheduleText165();return r};try{renderCanvasObjects=window.renderCanvasObjects}catch(_){}
setTimeout(buildTextInteractions165,750);setTimeout(buildTextInteractions165,1700);

/* Keep selection/range intact when the user reaches for a toolbar control. */
document.addEventListener('pointerdown',e=>{if(e.target.closest?.('.v165FormatToolbar,#v165FontMenu,.v165FontMenu'))window.v152RememberRange?.()},true);

/* ---------- font dropdown with real previews ---------- */
function customFonts165(){const out=[];for(const k of ['schoolbloom-v91-custom-fonts','schoolbloom-custom-fonts']){try{for(const f of JSON.parse(localStorage.getItem(k)||'[]'))if(f?.name&&!out.includes(f.name))out.push(f.name)}catch(_){}}return out}
function fontList165(){return [...new Set(['Inter','Arial','Trebuchet MS','Verdana','Georgia','Times New Roman',...customFonts165()])]}
function currentFont165(){const s=getSelection?.();if(s?.rangeCount&&!s.isCollapsed){const r=s.getRangeAt(0),n=r.startContainer.nodeType===1?r.startContainer:r.startContainer.parentElement,el=n?.closest?.('.cobj[contenteditable="true"]');if(el){const cs=getComputedStyle(n||el);return String(cs.fontFamily||'Inter').split(',')[0].replace(/["']/g,'').trim()}}const o=selectedTextObj();return String(o?.style?.fontFamily||'Inter').split(',')[0].replace(/["']/g,'').trim()}
window.v165RefreshFontButton=function(){const b=q('.v165FontMenuBtn'),sample=q('.v165FontSample',b);if(!sample)return;const f=currentFont165()||'Inter';sample.textContent=f;sample.style.fontFamily=`"${f}", sans-serif`;const size=q('.v165Size');const o=selectedTextObj();if(size&&o?.style?.fontSize)size.value=o.style.fontSize}
function closeFont165(){q('#v165FontMenu')?.remove();q('.v165FontMenuBtn')?.classList.remove('open')}
window.v165ToggleFontMenu=function(btn){window.v152RememberRange?.();const old=q('#v165FontMenu');if(old){closeFont165();return}const r=btn.getBoundingClientRect(),menu=document.createElement('div');menu.id='v165FontMenu';menu.className='v165FontMenu';menu.style.left=Math.min(innerWidth-264,Math.max(8,r.left))+'px';menu.style.top=(r.bottom+7)+'px';menu.innerHTML=`<div class="v165FontMenuHead"><b>Schrift</b><span>Vorschau</span></div><div class="v165FontMenuList">${fontList165().map(f=>`<button type="button" data-font="${esc(f)}" style="font-family:'${esc(f)}',sans-serif"><span class="v165FontAa">Aa</span><span>${esc(f)}</span></button>`).join('')}</div>`;document.body.appendChild(menu);btn.classList.add('open');menu.addEventListener('pointerdown',e=>{window.v152RememberRange?.();if(e.target.closest('button'))e.preventDefault()},true);menu.addEventListener('click',e=>{const b=e.target.closest('button[data-font]');if(!b)return;const f=b.dataset.font;window.v152RestoreRange?.();applyTextProperty?.('fontFamily',f);const sm=q('.v165FontSample');if(sm){sm.textContent=f;sm.style.fontFamily=`"${f}",sans-serif`}closeFont165()})}
document.addEventListener('pointerdown',e=>{if(q('#v165FontMenu')&&!e.target.closest?.('#v165FontMenu,.v165FontMenuBtn'))closeFont165()},true);
document.addEventListener('selectionchange',()=>setTimeout(window.v165RefreshFontButton,0));

/* ---------- format painter: range -> range OR object -> range/object ---------- */
let painter165=null;
function rangeStyle165(){window.v152RememberRange?.();if(!window.v152HasRange?.()||!window.v152RestoreRange?.())return null;const s=getSelection?.();if(!s?.rangeCount||s.isCollapsed)return null;const r=s.getRangeAt(0),n=r.startContainer.nodeType===1?r.startContainer:r.startContainer.parentElement,el=n?.closest?.('.cobj[contenteditable="true"]');if(!el)return null;const cs=getComputedStyle(n||el),bs=getComputedStyle(el);return{fontFamily:cs.fontFamily,fontSize:parseFloat(cs.fontSize)||16,color:cs.color,bold:!!document.queryCommandState?.('bold'),italic:!!document.queryCommandState?.('italic'),underline:!!document.queryCommandState?.('underline'),strike:!!document.queryCommandState?.('strikeThrough'),textAlign:bs.textAlign||'left',lineHeight:bs.lineHeight,letterSpacing:cs.letterSpacing}}
function objectStyle165(){const o=selectedTextObj();if(!o)return null;const st=o.style||{};return{fontFamily:st.fontFamily||'Arial',fontSize:+st.fontSize||16,color:st.color||'#333333',bold:Number(st.fontWeight||400)>=600,italic:st.fontStyle==='italic',underline:String(st.textDecoration||'').includes('underline'),strike:String(st.textDecoration||'').includes('line-through'),textAlign:st.textAlign||'left',lineHeight:st.lineHeight,letterSpacing:st.letterSpacing}}
function painterState165(on){q('.v165PainterBtn')?.classList.toggle('active',!!on);document.body.classList.toggle('v165PainterOn',!!on)}
function stopPainter165(msg){painter165=null;painterState165(false);if(msg)cuteToast?.(msg)}
window.v165ToggleFormatPainter=function(){if(painter165){stopPainter165();return}const style=rangeStyle165()||objectStyle165();if(!style){cuteToast?.('Markiere Text oder wähle ein Textfeld aus ♡');return}painter165={style,sourceId:state()?.selectedId||null};painterState165(true);cuteToast?.('Format aufgenommen · Ziel markieren ♡')}
function toggleCmd165(cmd,want){const on=!!document.queryCommandState?.(cmd);if(on!==!!want)document.execCommand(cmd,false,null)}
function applyRange165(style){if(!window.v152HasRange?.()||!window.v152RestoreRange?.())return false;const s=getSelection?.();if(!s?.rangeCount||s.isCollapsed)return false;const r=s.getRangeAt(0),n=r.commonAncestorContainer.nodeType===1?r.commonAncestorContainer:r.commonAncestorContainer.parentElement,el=n?.closest?.('.cobj[contenteditable="true"]');if(!el)return false;try{document.execCommand('styleWithCSS',false,true);if(style.fontFamily)document.execCommand('fontName',false,String(style.fontFamily).replace(/["']/g,'').split(',')[0]);if(style.color)document.execCommand('foreColor',false,style.color);document.execCommand('styleWithCSS',false,false);document.execCommand('fontSize',false,'7');for(const f of el.querySelectorAll('font[size="7"]')){f.removeAttribute('size');f.style.fontSize=`${Math.max(6,Math.min(180,+style.fontSize||16))}px`}document.execCommand('styleWithCSS',false,true);toggleCmd165('bold',style.bold);toggleCmd165('italic',style.italic);toggleCmd165('underline',style.underline);toggleCmd165('strikeThrough',style.strike);const a={left:'justifyLeft',center:'justifyCenter',right:'justifyRight',justify:'justifyFull'}[style.textAlign];if(a)document.execCommand(a,false,null)}catch(_){return false}const o=(state()?.objects||[]).find(x=>String(x.id)===String(el.dataset.id));if(o)o.text=el.innerHTML;markCanvasDirty?.();pushHistory?.();renderCanvasInspector?.();return true}
function applyObject165(id,style){const o=(state()?.objects||[]).find(x=>String(x.id)===String(id));if(!o||!textKinds.has(o.kind))return false;o.style||={};Object.assign(o.style,{fontFamily:style.fontFamily,fontSize:style.fontSize,color:style.color,fontWeight:style.bold?700:400,fontStyle:style.italic?'italic':'normal',textDecoration:[style.underline?'underline':'',style.strike?'line-through':''].filter(Boolean).join(' ')||'none',textAlign:style.textAlign||'left'});if(style.lineHeight)o.style.lineHeight=parseFloat(style.lineHeight)||o.style.lineHeight;if(style.letterSpacing&&style.letterSpacing!=='normal')o.style.letterSpacing=parseFloat(style.letterSpacing)||0;renderCanvasObjects?.();renderCanvasInspector?.();markCanvasDirty?.();pushHistory?.();return true}
document.addEventListener('pointerup',e=>{if(!painter165||!editor()||e.target.closest?.('.v165FormatToolbar,#v165FontMenu'))return;setTimeout(()=>{if(!painter165)return;window.v152RememberRange?.();if(window.v152HasRange?.()&&applyRange165(painter165.style)){stopPainter165('Format übertragen ♡');return}const id=e.target instanceof Element?e.target.closest?.('[data-id]')?.dataset?.id:null;if(id&&String(id)!==String(painter165.sourceId)&&applyObject165(id,painter165.style))stopPainter165('Format übertragen ♡')},25)},true);
document.addEventListener('keydown',e=>{if(!editor())return;if(e.key==='Escape'&&painter165){e.preventDefault();e.stopImmediatePropagation();stopPainter165('Format übertragen beendet')}},true);

/* ---------- clean print: page only, no Studia UI ---------- */
function fontFaceCSS165(){let out='';try{for(const ss of document.styleSheets){let rules;try{rules=ss.cssRules}catch(_){continue}for(const r of rules||[])if(r.type===CSSRule.FONT_FACE_RULE)out+=r.cssText+'\n'}}catch(_){}return out}
window.printCanvasSheet=function(){let title='Lernblatt';try{const d=typeof data!=='undefined'?data:window.data,sid=typeof selectedSheetId!=='undefined'?selectedSheetId:window.selectedSheetId;title=(d?.studySheets||[]).find(x=>x.id===sid)?.title||q('.editorTitle b')?.textContent||title}catch(_){}const W=typeof canvasPageWidth==='function'?canvasPageWidth():794,H=typeof canvasPageHeight==='function'?canvasPageHeight():1123,html=typeof serializedCanvas==='function'?serializedCanvas():'',pageCSS=typeof pagePatternCSS==='function'?pagePatternCSS():'';const w=window.open('','_blank','noopener=false,width=1000,height=900');if(!w){alert('Bitte Pop-ups für Studia erlauben, damit das Lernblatt gedruckt werden kann.');return}w.document.open();w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${fontFaceCSS165()}@page{size:A4;margin:0!important}html,body{margin:0!important;padding:0!important;background:#fff!important;width:${W}px;height:${H}px;overflow:hidden}.page{position:relative;width:${W}px;height:${H}px;margin:0!important;padding:0!important;overflow:hidden;box-shadow:none!important;border:0!important;${pageCSS}}@media print{html,body,.page{margin:0!important;padding:0!important;box-shadow:none!important;border:0!important}}</style></head><body><main class="page">${html}</main><script>addEventListener('load',()=>setTimeout(()=>{focus();print()},120));<\/script></body></html>`);w.document.close()}

/* ---------- sticker palette: edit individual colors ---------- */
function stickers165(){const ids=new Set([...(state()?.selectedIds||[]),state()?.selectedId].filter(Boolean));return (state()?.objects||[]).filter(o=>ids.has(o.id)&&o.stickerAsset&&!o.frameAsset)}
function loadImage165(src){return new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=rej;im.src=src})}
const hex165=(r,g,b)=>'#'+[r,g,b].map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
function rgb165(hex){const h=String(hex||'#000').replace('#','');return h.length===3?[...h].map(x=>parseInt(x+x,16)): [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]}
function dist165(a,b){return Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2])}
async function analyze165(o){if(Array.isArray(o.stickerPaletteSources)&&o.stickerPaletteSources.length)return o.stickerPaletteSources;const src=o.stickerPaletteOriginal||o.src;o.stickerPaletteOriginal=src;const im=await loadImage165(src),max=150,sc=Math.min(1,max/Math.max(im.naturalWidth,im.naturalHeight)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.naturalWidth*sc));c.height=Math.max(1,Math.round(im.naturalHeight*sc));const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(im,0,0,c.width,c.height);const d=x.getImageData(0,0,c.width,c.height).data,bins=new Map();let darkest=null,lightest=null;for(let i=0;i<d.length;i+=4){if(d[i+3]<48)continue;const rgb=[d[i],d[i+1],d[i+2]],lum=.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];if(!darkest||lum<darkest.lum)darkest={rgb,lum};if(!lightest||lum>lightest.lum)lightest={rgb,lum};const qv=rgb.map(v=>Math.round(v/24)*24),k=qv.join(',');const b=bins.get(k)||{n:0,sum:[0,0,0]};b.n++;b.sum[0]+=rgb[0];b.sum[1]+=rgb[1];b.sum[2]+=rgb[2];bins.set(k,b)}let cand=[...bins.values()].sort((a,b)=>b.n-a.n).slice(0,24).map(b=>b.sum.map(v=>v/b.n));if(darkest)cand.push(darkest.rgb);if(lightest)cand.push(lightest.rgb);const merged=[];for(const c0 of cand){if(merged.some(m=>dist165(m,c0)<24))continue;merged.push(c0);if(merged.length>=16)break}o.stickerPaletteSources=merged.map(v=>hex165(...v));o.stickerPaletteTargets=[...o.stickerPaletteSources];return o.stickerPaletteSources}
async function renderSticker165(o){const src=o.stickerPaletteOriginal||o.src,sources=(o.stickerPaletteSources||[]).map(rgb165),targets=(o.stickerPaletteTargets||o.stickerPaletteSources||[]).map(rgb165);if(!sources.length)return;const im=await loadImage165(src),c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(im,0,0);const img=x.getImageData(0,0,c.width,c.height),d=img.data;for(let i=0;i<d.length;i+=4){if(d[i+3]<10)continue;const p=[d[i],d[i+1],d[i+2]];let bi=0,bd=1e9;for(let j=0;j<sources.length;j++){const dd=dist165(p,sources[j]);if(dd<bd){bd=dd;bi=j}}const s=sources[bi],t=targets[bi];if(!t||dist165(s,t)<2)continue;const lp=(p[0]+p[1]+p[2])/3,ls=(s[0]+s[1]+s[2])/3,delta=(lp-ls)*.72;d[i]=Math.max(0,Math.min(255,t[0]+delta));d[i+1]=Math.max(0,Math.min(255,t[1]+delta));d[i+2]=Math.max(0,Math.min(255,t[2]+delta))}x.putImageData(img,0,0);o.src=c.toDataURL('image/png');delete o.tintColor;renderCanvasObjects?.();renderCanvasInspector?.();markCanvasDirty?.();pushHistory?.()}
function paletteModal165(o){const rows=(o.stickerPaletteSources||[]).map((src,i)=>`<div class="v165StickerColorRow"><span class="v165OriginalSwatch" style="background:${src}" title="Original ${src}"></span><span class="v165ColorArrow">→</span><label><input type="color" value="${o.stickerPaletteTargets?.[i]||src}" onchange="v165StickerColor('${esc(o.id)}',${i},this.value)"><span>Farbe ${i+1}</span></label><button type="button" title="Diese Farbe zurücksetzen" onclick="v165StickerColor('${esc(o.id)}',${i},'${src}')">↺</button></div>`).join('');openModal?.(`<div class="v135Modal v165StickerModal"><div class="v135ModalHead"><div><span class="eyebrow">STICKERFARBEN</span><h2>Jede Farbe einzeln</h2></div><button onclick="closeModal()">×</button></div><p class="small">Jede erkannte Stickerfarbe hat ihren eigenen Farbwähler. Schattierungen bleiben erhalten.</p><div class="v165StickerPalette">${rows}</div><div class="v135ActionRow"><button onclick="v165ResetStickerColors('${esc(o.id)}')">Alle Originalfarben</button><button class="primary" onclick="closeModal()">Fertig</button></div></div>`)}
window.v165OpenStickerColors=async function(){const list=stickers165();if(list.length!==1){cuteToast?.('Wähle genau einen Sticker aus ♡');return}const o=list[0];cuteToast?.('Stickerfarben werden erkannt …');try{await analyze165(o);paletteModal165(o)}catch(err){console.error('[V165 sticker palette]',err);alert('Die Farben dieses Stickers konnten nicht gelesen werden.') }}
window.v165StickerColor=async function(id,i,value){const o=(state()?.objects||[]).find(x=>String(x.id)===String(id));if(!o)return;o.stickerPaletteTargets||=[...(o.stickerPaletteSources||[])];o.stickerPaletteTargets[i]=value;const inp=q(`.v165StickerColorRow:nth-child(${i+1}) input[type=color]`);if(inp)inp.value=value;await renderSticker165(o)}
window.v165ResetStickerColors=async function(id){const o=(state()?.objects||[]).find(x=>String(x.id)===String(id));if(!o)return;if(o.stickerPaletteOriginal)o.src=o.stickerPaletteOriginal;o.stickerPaletteTargets=[...(o.stickerPaletteSources||[])];delete o.tintColor;renderCanvasObjects?.();renderCanvasInspector?.();markCanvasDirty?.();pushHistory?.();closeModal?.();cuteToast?.('Originalfarben wiederhergestellt ♡')}
function addStickerButton165(){if(!editor())return;for(const host of [q('#canvasInspector .v137Inspector'),q('#canvasInspector')].filter(Boolean)){host.querySelectorAll('.v141StickerSection,.v144StickerColors').forEach(x=>x.remove());if(host.querySelector('.v165StickerPaletteAction'))continue;const list=stickers165();if(list.length!==1)continue;const sec=document.createElement('section');sec.className='v165StickerPaletteAction';sec.innerHTML=`<div><b>Einzelfarben</b><small>Jede Stickerfarbe separat ändern</small></div><button type="button" onclick="v165OpenStickerColors()"><span>✦</span> Farben bearbeiten</button>`;host.prepend(sec)}}
const inspector165=window.renderCanvasInspector;if(inspector165)window.renderCanvasInspector=function(){const r=inspector165.apply(this,arguments);requestAnimationFrame(()=>{addStickerButton165();window.v165RefreshFontButton?.()});return r};try{renderCanvasInspector=window.renderCanvasInspector}catch(_){}

/* ---------- small safe UI hooks ---------- */
function ui165(){if(!editor())return;window.v165RefreshFontButton?.();addStickerButton165();buildTextInteractions165();const txt=q('.v132SelectionBar button[title="Textformat erstellen"]');if(txt)txt.style.display='none'}
const sheet165=window.renderSheetEditor;if(sheet165)window.renderSheetEditor=function(){const r=sheet165.apply(this,arguments);setTimeout(ui165,120);return r};try{renderSheetEditor=window.renderSheetEditor}catch(_){}
window.addEventListener('resize',()=>{closeFont165();setTimeout(ui165,120)});setTimeout(ui165,700);setTimeout(ui165,1800);
})();
/* ===== /Studia V165 ===== */

/* ===== Studia V166 — phone editor, account sync, layer drag, print cleanup ===== */
(()=>{
'use strict';
if(window.__STUDIA_V166__) return; window.__STUDIA_V166__=true;
const q=(s,r=document)=>r.querySelector(s), qa=(s,r=document)=>[...r.querySelectorAll(s)];
const mobile=()=>innerWidth<900;
const editor=()=>document.body.classList.contains('editorMode')&&!!q('#view-sheet-editor.active');
const st=()=>{try{return canvasState}catch(_){return window.canvasState}};
const textKinds=new Set(['text','block','task','merke','file']);
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const svg=(d)=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
const ICON={
 edit:svg('M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4ZM13.5 6.5l4 4'),
 trash:svg('M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5'),
 duplicate:svg('M8 8h11v11H8zM5 16H4V5h11v1'),
 lock:svg('M7 10V8a5 5 0 0 1 10 0v2M6 10h12v10H6z'),
 group:svg('M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6zM10 7h4M7 10v4M17 10v4M10 17h4'),
 ungroup:svg('M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z'),
 more:svg('M5 12h.01M12 12h.01M19 12h.01'),
 close:svg('M6 6l12 12M18 6 6 18')
};

/* ---------- account: username/password + Google + aggressive full sync ---------- */
const ACCOUNT_TOKEN='studia-account-token-v150', ACCOUNT_USER='studia-account-username-v150', URL_KEY='studia-gas-url';
function gasUrl(){return String(localStorage.getItem(URL_KEY)||window.STUDIA_SYNC_CONFIG?.scriptUrl||'').trim().replace(/\/$/,'')}
function gasValid(u=gasUrl()){return /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec(?:\?.*)?$/.test(String(u||''))}
function googleClientId(){const v=String(window.STUDIA_SYNC_CONFIG?.googleClientId||'').trim();return v&&!v.startsWith('DEINE_')?v:''}
function accountStatus166(text,bad=false){const x=q('#v150AccountStatus');if(x){x.textContent=text;x.classList.toggle('error',!!bad)}}
function timeoutFetch(url,opts={},ms=15000){const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);return fetch(url,{...opts,signal:c.signal}).finally(()=>clearTimeout(t))}
async function gasPost166(action,body={}){
 const url=gasUrl();if(!gasValid(url))throw new Error('Die Apps-Script-/exec-URL ist noch nicht eingerichtet.');
 const token=String(localStorage.getItem(ACCOUNT_TOKEN)||'');
 const r=await timeoutFetch(url,{method:'POST',redirect:'follow',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,...body,...(token?{token}:{})})});
 const raw=await r.text();let data;try{data=JSON.parse(raw)}catch{throw new Error('Google-Sync hat keine gültige Antwort geliefert.');}
 if(data?.ok===false)throw new Error(data.error||'Anmeldung fehlgeschlagen.');return data;
}
function loadGoogleIdentity166(){return new Promise((resolve,reject)=>{
 if(window.google?.accounts?.id)return resolve();
 let s=q('#v166GoogleIdentity');if(s){s.addEventListener('load',()=>resolve(),{once:true});s.addEventListener('error',()=>reject(new Error('Google-Anmeldung konnte nicht geladen werden.')),{once:true});return}
 s=document.createElement('script');s.id='v166GoogleIdentity';s.src='https://accounts.google.com/gsi/client';s.async=true;s.defer=true;s.onload=()=>resolve();s.onerror=()=>reject(new Error('Google-Anmeldung konnte nicht geladen werden.'));document.head.appendChild(s);
 })}
window.v166GoogleCredential=async function(credential){
 try{accountStatus166('Google-Konto wird verbunden …');const r=await gasPost166('google_login',{credential});localStorage.setItem(ACCOUNT_TOKEN,r.token);localStorage.setItem(ACCOUNT_USER,r.user?.username||r.user?.email||'Google');accountStatus166('Angemeldet · synchronisiere alle Daten …');await window.v150Pull?.();window.closeModal?.();window.cuteToast?.('Google-Konto verbunden ♡');setTimeout(()=>location.reload(),350)}catch(err){accountStatus166(String(err?.message||err),true)}
};
window.v166RenderGoogleButton=async function(){
 const host=q('#v166GoogleButton');if(!host)return;const cid=googleClientId();
 if(!cid){host.innerHTML='<button class="v166GoogleFallback" type="button" onclick="v166ShowGoogleSetup()"><span class="v166GoogleG">G</span><span>Mit Google anmelden</span></button>';return}
 try{await loadGoogleIdentity166();host.innerHTML='';google.accounts.id.initialize({client_id:cid,callback:r=>window.v166GoogleCredential(r.credential),auto_select:false,cancel_on_tap_outside:true});google.accounts.id.renderButton(host,{type:'standard',theme:'outline',size:'large',shape:'pill',text:'signin_with',width:320,logo_alignment:'left'})}catch(err){host.innerHTML=`<button class="v166GoogleFallback" type="button" onclick="v166RenderGoogleButton()"><span class="v166GoogleG">G</span><span>${esc(err?.message||'Google erneut laden')}</span></button>`}
};
window.v166ShowGoogleSetup=function(){accountStatus166('Für Google-Login einmal die Google OAuth Client-ID in google-sync-config.js eintragen. Benutzername + Passwort funktioniert unabhängig davon.',true)};
window.v166Logout=async function(){try{await gasPost166('logout')}catch(_){}localStorage.removeItem(ACCOUNT_TOKEN);localStorage.removeItem(ACCOUNT_USER);window.closeModal?.();window.cuteToast?.('Abgemeldet');setTimeout(()=>location.reload(),180)};
window.openAccountDialog=function(){
 const logged=!!localStorage.getItem(ACCOUNT_TOKEN),name=localStorage.getItem(ACCOUNT_USER)||'',url=gasUrl();
 window.openModal?.(`<div class="v135Modal v150AccountModal v166AccountModal"><div class="v135ModalHead"><div><span class="eyebrow">STUDIA KONTO</span><h2>${logged?'Dein Konto':'Überall dieselben Daten'}</h2></div><button class="iconbtn" onclick="closeModal()" aria-label="Schließen">${ICON.close}</button></div>
 ${logged?`<div class="v150AccountHero"><span class="v150AccountAvatar">S</span><div><b>${esc(name||'Studia')}</b><small>auf diesem Gerät dauerhaft angemeldet</small></div></div><div class="v166SyncPromise"><b>Automatischer Voll-Sync</b><span>Nach Änderungen, beim Öffnen, beim Zurückkehren zur App und regelmäßig im Vordergrund.</span></div><div class="v166SyncList">Fächer · Themen · Lernblätter · Hausaufgaben · Tests · Noten · Karteikarten · Quizze · Editor · Bilder/Dateien · Schriften · Einstellungen</div><div id="v150AccountStatus" class="v150AccountState">✓ Synchronisierung aktiv</div><div class="v166AccountActions"><button class="primary" onclick="v150Pull()">Jetzt abgleichen</button><button onclick="v166Logout()">Abmelden</button></div>`:`<p class="v166AccountIntro">Ein Konto auf Handy und Laptop. Studia hält danach <b>alles automatisch gleich</b>.</p><div class="v150AccountForm v166AccountForm"><label>Benutzername<input id="v150Username" autocomplete="username" minlength="3" maxlength="32" value="${esc(name)}" placeholder="Benutzername"></label><label>Passwort<input id="v150Password" type="password" autocomplete="current-password" minlength="8" placeholder="mindestens 8 Zeichen"></label></div><div class="v166AccountActions"><button class="primary" onclick="v150Login()">Anmelden</button><button onclick="v150Register()">Konto erstellen</button></div><div class="v166Or"><span></span><b>oder</b><span></span></div><div id="v166GoogleButton" class="v166GoogleButton"></div><div id="v150AccountStatus" class="v150AccountState">Mit demselben Konto auf allen Geräten anmelden.</div>`}
 ${gasValid(String(window.STUDIA_SYNC_CONFIG?.scriptUrl||''))?'':`<details class="v150AccountSetup v166AccountSetup" ${gasValid(url)?'':'open'}><summary>Einmalige Sync-Einrichtung</summary><label>Apps-Script-Web-App-URL<input id="v150ScriptUrl" type="url" value="${esc(url)}" placeholder="https://script.google.com/macros/s/…/exec" oninput="v150RememberUrl()"></label><small>Die URL am besten direkt in <b>google-sync-config.js</b> eintragen. Dann ist sie auf Handy und Laptop automatisch vorhanden.</small></details>`}</div>`);
 if(!logged)setTimeout(()=>window.v166RenderGoogleButton?.(),30)
};
/* V150 already captures the whole app state. Make foreground/open sync extra eager. */
window.addEventListener('pageshow',()=>setTimeout(()=>window.v150Pull?.(),120));
window.addEventListener('focus',()=>setTimeout(()=>window.v150Pull?.(),120));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(()=>window.v150Pull?.(),150)});

/* ---------- mobile text: tap/drag selects & moves; explicit pencil enters editing ---------- */
const baseSelect166=window.selectCanvasObject;
window.selectCanvasObject=function(oid){
 const s=st(),o=(s?.objects||[]).find(x=>String(x.id)===String(oid));if(!s||!o)return baseSelect166?.apply(this,arguments);
 if(o.groupId&&!s.multiMode&&typeof window.selectWholeGroup==='function'){window.selectWholeGroup(o.groupId);setTimeout(window.updateMobileSelectionTools,0);return}
 const same=s.selectedType==='object'&&String(s.selectedId)===String(oid)&&(s.selectedIds||[]).length===1;
 s.selectedType='object';s.selectedId=oid;s.selectedIds=[oid];s.selectedVectorIds=[];
 if(!same)window.renderCanvasObjects?.();window.renderVectors?.();window.renderCanvasInspector?.();window.renderLayerList?.();window.updateMultiSelectStatus?.();window.updateMobileSelectionTools?.();
};
try{selectCanvasObject=window.selectCanvasObject}catch(_){}
window.v166EditSelectedText=function(){
 const s=st(),o=(s?.objects||[]).find(x=>String(x.id)===String(s?.selectedId));if(!o||!textKinds.has(o.kind))return window.cuteToast?.('Wähle zuerst ein Textfeld ♡');
 const el=q(`.cobj[data-id="${CSS.escape(String(o.id))}"]`),r=el?.getBoundingClientRect();window.v152BeginTextEdit?.(o.id,r?r.left+r.width/2:undefined,r?r.top+r.height/2:undefined);setTimeout(()=>window.editorOpenGroup?.('textEdit',null),30);setTimeout(()=>{const d=q('#canvasQuickDrawer');if(!d?.classList.contains('open')||!/Text bearbeiten/i.test(d.textContent||'')){if(d)d.classList.remove('open');try{openEditorGroup=null}catch(_){}window.editorOpenGroup?.('textEdit',null)}qa('.canvasQuickNav button').forEach(x=>x.classList.remove('active'))},140)
};
/* Window capture runs before the old document/target handlers. On phones the entire text field is a move/select surface. */
window.addEventListener('pointerdown',e=>{
 if((window.__STUDIA_V167_MOBILE__&&mobile())||!mobile()||!editor()||document.body.classList.contains('v165PainterOn'))return;const area=e.target instanceof Element?e.target.closest('.v165TextEditArea'):null;if(!area)return;
 const wrap=area.closest('.v165TextInteraction'),id=wrap?.dataset.id;if(!id)return;e.preventDefault();e.stopImmediatePropagation();window.selectCanvasObject(id);const o=(st()?.objects||[]).find(x=>String(x.id)===String(id));if(!o?.locked&&typeof window.startDragObject==='function')window.startDragObject(e,id)
},true);

/* ---------- mobile selected-text color: don't lose the range when native color picker opens ---------- */
let colorPick166=false,colorRange166=false;
window.addEventListener('pointerdown',e=>{const inp=e.target instanceof Element?e.target.closest('#v152SelectionBar input[type="color"]'):null;if(!inp)return;window.v152RememberRange?.();colorRange166=!!window.v152HasRange?.();colorPick166=true;document.body.classList.add('v166ColorPicking');q('#v152SelectionBar')?.classList.add('show')},true);
window.addEventListener('input',e=>{const inp=e.target instanceof Element?e.target.closest('#v152SelectionBar input[type="color"]'):null;if(!inp||!colorPick166)return;e.stopImmediatePropagation();if(colorRange166)window.v152RestoreRange?.();window.applyTextProperty?.('color',inp.value);q('#v152SelectionBar')?.classList.add('show')},true);
window.addEventListener('change',e=>{const inp=e.target instanceof Element?e.target.closest('#v152SelectionBar input[type="color"]'):null;if(!inp)return;e.stopImmediatePropagation();if(colorRange166)window.v152RestoreRange?.();window.applyTextProperty?.('color',inp.value);q('#v152SelectionBar')?.classList.add('show');setTimeout(()=>{colorPick166=false;colorRange166=false;document.body.classList.remove('v166ColorPicking')},300)},true);

/* ---------- mobile top selection tools: edit pencil directly left of trash ---------- */
function selectedGroup166(){const s=st();if(!s)return false;const ids=new Set(s.selectedIds||[]),vids=new Set(s.selectedVectorIds||[]),items=[...(s.objects||[]).filter(o=>ids.has(o.id)),...(s.vectors||[]).filter(v=>vids.has(v.id))];const gs=[...new Set(items.map(x=>x.groupId).filter(Boolean))];return items.length>0&&gs.length===1&&items.every(x=>x.groupId===gs[0])}
window.v166ToggleGroup=function(){if(selectedGroup166())window.ungroupSelectedItems?.();else window.groupSelectedItems?.();setTimeout(()=>{syncGroupUI166();window.updateMobileSelectionTools?.()},40)};
window.updateMobileSelectionTools=function(){
 const el=q('#mobileSelectionTools'),s=st();if(!el)return;const count=(s?.selectedIds?.length||0)+(s?.selectedVectorIds?.length||0),o=(s?.objects||[]).find(x=>String(x.id)===String(s?.selectedId));
 if(!mobile()||!editor()||!count||document.body.classList.contains('v112TextEditing')||document.body.classList.contains('v115TextEdit')||!!o?.editing){el.classList.remove('show');el.innerHTML='';return}
 const canEdit=!!o&&textKinds.has(o.kind),grouped=selectedGroup166();el.innerHTML=`<button onclick="duplicateSelected()" title="Duplizieren" aria-label="Duplizieren">${ICON.duplicate}</button><button onclick="toggleSelectedLock()" title="Sperren" aria-label="Sperren">${ICON.lock}</button><button onclick="v166ToggleGroup()" title="${grouped?'Entgruppieren':'Gruppieren'}" aria-label="${grouped?'Entgruppieren':'Gruppieren'}">${grouped?ICON.ungroup:ICON.group}</button>${canEdit?`<button class="v166TextEditButton" onclick="v166EditSelectedText()" title="Text bearbeiten" aria-label="Text bearbeiten">${ICON.edit}</button>`:''}<button class="danger" onclick="deleteSelectedCanvasItem()" title="Löschen" aria-label="Löschen">${ICON.trash}</button><button onclick="editorOpenGroup('selection')" title="Mehr" aria-label="Mehr">${ICON.more}</button>`;el.classList.add('show')
};
try{updateMobileSelectionTools=window.updateMobileSelectionTools}catch(_){}

/* ---------- mobile nav: correct drawer + correct pink active item ---------- */
function navMode166(b){const raw=b?.dataset?.v139||b?.dataset?.v138||b?.dataset?.v133||b?.dataset?.group||'',txt=(b?.textContent||'').trim().toLowerCase();if(raw)return raw==='text'?'text':raw;if(txt.includes('element'))return'elements';if(txt.includes('vorlag'))return'templates';if(txt.includes('seite'))return'pages';if(txt.includes('ebene'))return'layers';return'text'}
function setNavActive166(mode){qa('.canvasQuickNav button').forEach(b=>b.classList.toggle('active',navMode166(b)===mode))}
window.addEventListener('click',e=>{
 if((window.__STUDIA_V167_MOBILE__&&mobile())||!mobile()||!editor())return;const b=e.target instanceof Element?e.target.closest('.canvasQuickNav button'):null;if(!b)return;const mode=navMode166(b),expected={text:/Text|Schrift/i,elements:/Elemente|Formen|Mathematik/i,templates:/Vorlagen/i,pages:/Seiten|Ausrichtung|Seitenfarbe/i,layers:/Ebenen/i}[mode];
 /* Let the older consolidated nav handler run too, because it owns its private wantedMode. We only correct its visual/content result afterwards. */
 setTimeout(()=>{const d=q('#canvasQuickDrawer');if(d?.classList.contains('open')){setNavActive166(mode);if(expected&&!expected.test(d.textContent||'')){d.classList.remove('open');try{openEditorGroup=null}catch(_){}window.editorOpenGroup?.(mode==='text'?'textLibrary':mode,b);if(d.classList.contains('open'))setNavActive166(mode)}}else qa('.canvasQuickNav button').forEach(x=>x.classList.remove('active'))},45)
},true);
const closeDrawer166=window.closeEditorDrawer;if(closeDrawer166)window.closeEditorDrawer=function(){const r=closeDrawer166.apply(this,arguments);qa('.canvasQuickNav button').forEach(b=>b.classList.remove('active'));return r};try{closeEditorDrawer=window.closeEditorDrawer}catch(_){}
const openGroup166=window.editorOpenGroup;if(openGroup166)window.editorOpenGroup=function(){const r=openGroup166.apply(this,arguments);requestAnimationFrame(()=>{syncGroupUI166();decorateLayers166()});return r};try{editorOpenGroup=window.editorOpenGroup}catch(_){}

/* ---------- layers: drag an item into another layer group (mouse + touch) ---------- */
let layerDrag166=null,touchLayer166=null;
function decorateLayers166(){
 const groups=st()?.layerGroups||[];for(const host of [q('#layerList'),q('#canvasQuickDrawer.open .mobileLayerList')].filter(Boolean)){
  const sections=qa('.v135LayerGroup',host);sections.forEach((sec,i)=>{const gid=groups[i]?.id;if(!gid)return;sec.dataset.v166Layer=gid;const drop=sec.querySelector('.v135LayerItems')||sec;if(!drop.dataset.v166Drop){drop.dataset.v166Drop='1';drop.addEventListener('dragover',e=>{if(!layerDrag166)return;e.preventDefault();drop.classList.add('v166LayerDrop')});drop.addEventListener('dragleave',()=>drop.classList.remove('v166LayerDrop'));drop.addEventListener('drop',e=>{if(!layerDrag166)return;e.preventDefault();drop.classList.remove('v166LayerDrop');const d=layerDrag166;layerDrag166=null;window.v135AssignLayer?.(d.kind,d.id,gid)})}
  });
  qa('.v135LayerRow',host).forEach(row=>{row.draggable=true;const handle=row.querySelector('.v130LayerHandle');if(handle)handle.draggable=true;if(row.dataset.v166Drag)return;row.dataset.v166Drag='1';row.addEventListener('dragstart',e=>{layerDrag166={kind:row.dataset.layerKind,id:row.dataset.layerId};try{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',row.dataset.layerId||'')}catch(_){}});row.addEventListener('dragend',()=>{layerDrag166=null;qa('.v166LayerDrop').forEach(x=>x.classList.remove('v166LayerDrop'))})})
 }
}
const renderLayers166=window.renderLayerList;if(renderLayers166)window.renderLayerList=function(){const r=renderLayers166.apply(this,arguments);requestAnimationFrame(decorateLayers166);return r};try{renderLayerList=window.renderLayerList}catch(_){}
window.addEventListener('pointerdown',e=>{if(!editor()||!mobile())return;const h=e.target instanceof Element?e.target.closest('.v135LayerRow .v130LayerHandle'):null;if(!h)return;const row=h.closest('.v135LayerRow');if(!row)return;e.preventDefault();e.stopImmediatePropagation();touchLayer166={pid:e.pointerId,kind:row.dataset.layerKind,id:row.dataset.layerId,target:null};document.body.classList.add('v166DraggingLayer')},true);
window.addEventListener('pointermove',e=>{if(!touchLayer166||e.pointerId!==touchLayer166.pid)return;e.preventDefault();const sec=document.elementFromPoint(e.clientX,e.clientY)?.closest?.('.v135LayerGroup');qa('.v166LayerDrop').forEach(x=>x.classList.remove('v166LayerDrop'));if(sec){const drop=sec.querySelector('.v135LayerItems')||sec;drop.classList.add('v166LayerDrop');touchLayer166.target=sec.dataset.v166Layer||null}},true);
window.addEventListener('pointerup',e=>{if(!touchLayer166||e.pointerId!==touchLayer166.pid)return;const d=touchLayer166;touchLayer166=null;document.body.classList.remove('v166DraggingLayer');qa('.v166LayerDrop').forEach(x=>x.classList.remove('v166LayerDrop'));if(d.target)window.v135AssignLayer?.(d.kind,d.id,d.target)},true);

/* ---------- one group / ungroup toggle everywhere ---------- */
function syncGroupUI166(){
 const grouped=selectedGroup166();for(const b of qa('body.editorMode button[title="Gruppieren"],body.editorMode button[aria-label="Gruppieren"],body.editorMode button[title="Entgruppieren"],body.editorMode button[aria-label="Entgruppieren"],body.editorMode button[onclick="v166ToggleGroup()"]')){b.onclick=()=>window.v166ToggleGroup();const label=grouped?'Entgruppieren':'Gruppieren',hadSpan=!!b.querySelector('span');b.setAttribute('title',label);b.setAttribute('aria-label',label);if(b.closest('.desktopCmdButtons,.v132SelectionBar'))b.innerHTML=(grouped?ICON.ungroup:ICON.group)+(hadSpan?`<span>${label}</span>`:'');else{const span=b.querySelector('span');if(span)span.textContent=label}}
 qa('body.editorMode button[title="Gruppierung lösen"],body.editorMode button[aria-label="Gruppierung lösen"]').forEach(b=>{if(!b.closest('#mobileSelectionTools'))b.classList.add('v166HideSeparateUngroup')})
 const insp=q('#canvasInspector .multiInspector .alignRow');if(insp){const gs=qa('button',insp).filter(b=>/groupSelectedItems|ungroupSelectedItems/.test(b.getAttribute('onclick')||''));if(gs.length){gs[0].setAttribute('onclick','v166ToggleGroup()');gs[0].innerHTML=(grouped?'▢ Entgruppieren':'▣ Gruppieren');gs.slice(1).forEach(x=>x.remove())}}
 const drawer=q('#canvasQuickDrawer.open');if(drawer){const gs=qa('button',drawer).filter(b=>/groupSelectedItems|ungroupSelectedItems/.test(b.getAttribute('onclick')||''));if(gs.length){gs[0].setAttribute('onclick','v166ToggleGroup()');gs[0].innerHTML=(grouped?ICON.ungroup:ICON.group)+`<span>${grouped?'Entgruppieren':'Gruppieren'}</span>`;gs.slice(1).forEach(x=>x.remove())}}
}
const renderInspector166=window.renderCanvasInspector;if(renderInspector166)window.renderCanvasInspector=function(){const r=renderInspector166.apply(this,arguments);requestAnimationFrame(()=>{syncGroupUI166();window.updateMobileSelectionTools?.()});return r};try{renderCanvasInspector=window.renderCanvasInspector}catch(_){}

/* ---------- desktop pan: right-drag added; middle + Space/left and Alt-wheel stay canvas-only ---------- */
let rightPan166=false;
window.addEventListener('mousedown',e=>{if(!editor()||mobile()||e.button!==2)return;const vp=q('#canvasViewport');if(!vp?.contains(e.target))return;e.preventDefault();e.stopImmediatePropagation();rightPan166=true;document.body.classList.add('v166RightPan');/* Feed the editor's proven middle-mouse pan system, so zoom/pan state stays in one place. */vp.dispatchEvent(new MouseEvent('mousedown',{button:1,buttons:4,clientX:e.clientX,clientY:e.clientY,bubbles:true,cancelable:true,view:window}))},true);
window.addEventListener('mouseup',e=>{if(!rightPan166)return;rightPan166=false;document.body.classList.remove('v166RightPan')},true);
window.addEventListener('blur',()=>{rightPan166=false;document.body.classList.remove('v166RightPan')});
window.addEventListener('contextmenu',e=>{if(editor()&&!mobile()&&q('#canvasViewport')?.contains(e.target))e.preventDefault()},true);

/* ---------- print: in-app preview + about:blank print document + zero browser margin ---------- */
function printData166(){let title='Lernblatt';try{const d=typeof data!=='undefined'?data:window.data,sid=typeof selectedSheetId!=='undefined'?selectedSheetId:window.selectedSheetId;title=(d?.studySheets||[]).find(x=>x.id===sid)?.title||q('.editorTitle b')?.textContent||title}catch(_){}const W=typeof canvasPageWidth==='function'?canvasPageWidth():794,H=typeof canvasPageHeight==='function'?canvasPageHeight():1123,html=typeof serializedCanvas==='function'?serializedCanvas():'',pageCSS=typeof pagePatternCSS==='function'?pagePatternCSS():'';return{title,W,H,html,pageCSS,landscape:W>H}}
window.v166DoPrint=function(){
 const d=printData166();window.closeModal?.();const w=window.open('about:blank','_blank','noopener=false,width=1000,height=900');if(!w){alert('Bitte Pop-ups für Studia erlauben.');return}
 const fonts=typeof fontFaceCSS165==='function'?fontFaceCSS165():'';w.document.open();w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title></title><style>${fonts}@page{size:A4 ${d.landscape?'landscape':'portrait'};margin:0} @page{@top-left{content:none}@top-center{content:none}@top-right{content:none}@bottom-left{content:none}@bottom-center{content:none}@bottom-right{content:none}}html,body{margin:0!important;padding:0!important;background:#fff!important;width:${d.W}px;height:${d.H}px;overflow:hidden!important}.page{position:relative;width:${d.W}px;height:${d.H}px;margin:0!important;padding:0!important;overflow:hidden!important;box-shadow:none!important;border:0!important;${d.pageCSS}}@media print{html,body,.page{margin:0!important;padding:0!important;border:0!important;box-shadow:none!important}}</style></head><body><main class="page">${d.html}</main><script>document.title='';addEventListener('afterprint',()=>close());addEventListener('load',()=>setTimeout(()=>{focus();print()},180));<\/script></body></html>`);w.document.close()
};
window.printCanvasSheet=function(){const d=printData166();const stage=q('#canvasStage');const preview=stage?stage.outerHTML.replace(/id="canvasStage"/,'id="v166PrintStage"'):'';window.openModal?.(`<div class="v135Modal v166PrintModal"><div class="v135ModalHead"><div><span class="eyebrow">DRUCKEN</span><h2>${esc(d.title)}</h2></div><button class="iconbtn" onclick="closeModal()" aria-label="Schließen">${ICON.close}</button></div><div class="v166PrintPreview">${preview}</div><p class="small">Gedruckt wird nur die Dokumentseite – ohne Studia-Leisten oder Website-Inhalt.</p><div class="v166PrintActions"><button onclick="closeModal()">Abbrechen</button><button class="primary" onclick="v166DoPrint()">Drucken</button></div></div>`)};
try{printCanvasSheet=window.printCanvasSheet}catch(_){}

/* ---------- every modal gets a real X, including “Test eintragen” ---------- */
function ensureModalX166(){const modal=q('#modalWrap.open #modal');if(!modal||modal.querySelector('.v166GlobalModalX'))return;const hasClose=modal.querySelector('.v135ModalHead button[onclick*="closeModal"],button[aria-label="Schließen"],button[title="Schließen"]');if(hasClose)return;const b=document.createElement('button');b.type='button';b.className='v166GlobalModalX';b.setAttribute('aria-label','Schließen');b.innerHTML=ICON.close;b.onclick=()=>window.closeModal?.();(modal.firstElementChild||modal).appendChild(b)}
const baseOpenModal166=window.openModal;if(baseOpenModal166)window.openModal=function(){const r=baseOpenModal166.apply(this,arguments);requestAnimationFrame(ensureModalX166);return r};try{openModal=window.openModal}catch(_){}

/* initial polish — no MutationObserver, no boot changes */
function init166(){if(editor()){decorateLayers166();syncGroupUI166();window.updateMobileSelectionTools?.()}const eye=q('#headerEyebrow');if(eye)eye.textContent='VERSION 166'}
setTimeout(init166,150);setTimeout(init166,2800);
})();
/* ===== /Studia V166 ===== */

/* ===== Studia V167 — mobile text/element/color/sticker/print fixes ===== */
(()=>{
'use strict';
if(window.__STUDIA_V167_MOBILE__)return;window.__STUDIA_V167_MOBILE__=true;
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
const mobile=()=>innerWidth<900;
const editor=()=>document.body.classList.contains('editorMode')&&!!q('#view-sheet-editor.active');
const state=()=>{try{return canvasState}catch(_){return window.canvasState}};
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

/* ---------- Mobile text gesture source of truth ----------
   V132 already does: one tap selects, drag moves, second tap edits.
   Later text hit-layers are disabled via mobile CSS above. ---------- */
function ensureStableHits167(){if(!mobile()||!editor())return;try{window.v132SyncHits?.()}catch(_){} }
const renderObj167=window.renderCanvasObjects;
if(renderObj167)window.renderCanvasObjects=function(){const r=renderObj167.apply(this,arguments);if(mobile())requestAnimationFrame(ensureStableHits167);return r};
try{renderCanvasObjects=window.renderCanvasObjects}catch(_){}

/* ---------- Selected text color: preserve the Range across iOS UI ---------- */
let colorAnchor167=null;
const palette167=['#2f2927','#655651','#8e6c67','#b77b7d','#e58f98','#f0aaa8','#f7c8c3','#fff0ed','#c85d68','#a44d68','#7d5c91','#6e7faa','#4f82a8','#5b8d7b','#79a56d','#b2bc62','#d9dd38','#e8b55f','#df8b55','#ffffff','#f6f1eb','#d7d2cf','#9c9692','#58524f'];
function closeColor167(){q('#v167TextColorPopover')?.remove();document.body.classList.remove('v167ColorOpen');colorAnchor167=null}
function savedRange167(){try{window.v152RememberRange?.();return !!window.v152HasRange?.()}catch(_){return false}}
function applyColor167(value){try{window.v152RestoreRange?.();window.applyTextProperty?.('color',value);window.v152RememberRange?.();q('#v152SelectionBar')?.classList.add('show')}catch(err){console.error('[V167 text color]',err)} }
function openColor167(anchor){
 if(!savedRange167())return;closeColor167();colorAnchor167=anchor;document.body.classList.add('v167ColorOpen');
 const p=document.createElement('div');p.id='v167TextColorPopover';p.innerHTML=`<div class="v167ColorHead"><span>Textfarbe</span><button type="button" aria-label="Schließen">×</button></div><div class="v167Swatches">${palette167.map(c=>`<button class="v167Swatch" type="button" data-color="${c}" style="background:${c}" aria-label="${c}"></button>`).join('')}</div><label class="v167Custom">Eigene Farbe <span>＋</span><input type="color" value="#e58f98"></label>`;
 document.body.appendChild(p);const r=anchor.getBoundingClientRect(),pw=Math.min(286,innerWidth-20);p.style.left=Math.max(10,Math.min(innerWidth-pw-10,r.left+r.width/2-pw/2))+'px';p.style.top=Math.max(62,Math.min(innerHeight-250,r.bottom+8))+'px';
 p.querySelector('.v167ColorHead button').onclick=closeColor167;
 p.addEventListener('pointerdown',e=>{if(!e.target.closest('input')){e.preventDefault();window.v152RestoreRange?.()}},true);
 p.addEventListener('click',e=>{const b=e.target.closest('.v167Swatch[data-color]');if(!b)return;applyColor167(b.dataset.color);closeColor167()});
 const custom=p.querySelector('input[type=color]');custom.addEventListener('pointerdown',()=>{window.v152RememberRange?.()},true);custom.addEventListener('input',e=>{applyColor167(e.target.value)});custom.addEventListener('change',e=>{applyColor167(e.target.value);setTimeout(closeColor167,40)});
}
window.v167ApplyTextColor=applyColor167;
window.addEventListener('pointerdown',e=>{
 if(!mobile()||!editor())return;const lab=e.target instanceof Element?e.target.closest('#v152SelectionBar .v152SelectionColor'):null;if(!lab)return;e.preventDefault();e.stopImmediatePropagation();savedRange167();openColor167(lab)
},{capture:true,passive:false});
window.addEventListener('resize',closeColor167);

/* ---------- Elements button always means ALL elements ---------- */
function icon167(name){try{return window.v133Icon?.(name)||''}catch(_){return''}}
function tile167(label,icon,action){return `<button class="v167ElementTile" type="button" onclick="${action}">${icon167(icon)}<span>${esc(label)}</span></button>`}
function section167(title,items){return `<section class="v167ElementSection"><h3>${esc(title)}</h3><div class="v167ElementGrid">${items.map(x=>tile167(...x)).join('')}</div></section>`}
function elementsHTML167(){return `<div class="v167ElementsPanel"><div class="v167ElementsHead"><div><small>ELEMENTE</small><b>Alles hinzufügen</b></div><button type="button" onclick="closeEditorDrawer()" aria-label="Schließen">×</button></div><div class="v167ElementsScroll">${section167('Text & Inhalt',[
 ['Textfeld','text','addCanvasTextBox()'],['Checkliste','checklist','addCanvasChecklist()'],['Bild / Foto','image','openCanvasMediaPicker()'],['Datei','file',"document.getElementById('canvasAnyFileInput')?.click()"],['Tabelle','table','openTableDialog()']
 ])}${section167('Formen & Linien',[
 ['Rechteck','rect',"addVectorShape('rect')"],['Kreis','circle',"addVectorShape('ellipse')"],['Dreieck','triangle',"addVectorShape('triangle')"],['Stern','star','addRoundedStar()'],['Linie','line','addVectorLine()'],['Kurve','curve','addVectorCurve()'],['Freihand','pen',"setVectorTool('pen')"]
 ])}${section167('Mathe & Diagramme',[
 ['Formel','formula','openFormulaDialog()'],['Funktionsgraph','graph','openGraphDialog()'],['Diagramm','graph','openChartDialog()'],['Timeline','line','openTimelineDialog()'],['Tabelle','table','openTableDialog()']
 ])}${section167('Sticker & Papier',[
 ['Sticker','sticker','toggleStickerPanel()'],['Klebeband','tape','addTapeSticker()'],['Kariert','papergrid',"addPaperSticker('grid')"],['Liniert','paperline',"addPaperSticker('line')"]
 ])}</div></div>`}
function mode167(b){const raw=b?.dataset?.v134||b?.dataset?.v133||b?.dataset?.v139||b?.dataset?.v138||b?.dataset?.group||'',t=(b?.textContent||'').toLowerCase();if(raw)return raw==='textLibrary'?'text':raw;if(t.includes('element'))return'elements';if(t.includes('vorlag'))return'templates';if(t.includes('seite'))return'pages';if(t.includes('ebene'))return'layers';return'text'}
function activate167(btn){qa('.canvasQuickNav button').forEach(x=>x.classList.toggle('active',x===btn))}
function openElements167(btn){
 const d=q('#canvasQuickDrawer');if(!d)return;try{openEditorGroup='elements'}catch(_){}d.classList.add('open','v167ElementsDrawer');d.classList.remove('v139TextDrawer','v140TextDrawer');d.dataset.v167Mode='elements';d.innerHTML=elementsHTML167();document.body.classList.add('editorDrawerOpen');activate167(btn)
}
window.v167OpenElements=openElements167;
window.addEventListener('click',e=>{
 if(!mobile()||!editor())return;const b=e.target instanceof Element?e.target.closest('.canvasQuickNav button'):null;if(!b)return;const mode=mode167(b);e.preventDefault();e.stopImmediatePropagation();
 if(mode==='elements'){openElements167(b);return}
 const d=q('#canvasQuickDrawer');d?.classList.remove('v167ElementsDrawer');try{window.v132Open?.(mode,b)}catch(_){try{window.editorOpenGroup?.(mode==='text'?'textLibrary':mode,b)}catch(__){}}setTimeout(()=>activate167(b),25)
},{capture:true});
const closeDrawer167=window.closeEditorDrawer;if(closeDrawer167)window.closeEditorDrawer=function(){const r=closeDrawer167.apply(this,arguments);q('#canvasQuickDrawer')?.classList.remove('v167ElementsDrawer');return r};try{closeEditorDrawer=window.closeEditorDrawer}catch(_){}

/* ---------- Sticker: palette button directly on mobile selection toolbar ---------- */
function selectedSticker167(){const s=state();if(!s)return null;const ids=new Set([...(s.selectedIds||[]),s.selectedId].filter(Boolean));const list=(s.objects||[]).filter(o=>ids.has(o.id)&&(o.stickerAsset||o.kind==='sticker')&&!o.frameAsset);return list.length===1?list[0]:null}
function stickerButton167(){if(!mobile()||!editor())return;const bar=q('#mobileSelectionTools');if(!bar)return;bar.querySelector('.v167StickerColors')?.remove();if(!selectedSticker167())return;const b=document.createElement('button');b.type='button';b.className='v167StickerColors';b.title='Stickerfarben';b.setAttribute('aria-label','Stickerfarben');b.innerHTML=icon167('sticker');b.onclick=e=>{e.preventDefault();e.stopPropagation();window.v165OpenStickerColors?.()};const trash=bar.querySelector('button.danger,[title="Löschen"]');if(trash)bar.insertBefore(b,trash);else bar.appendChild(b)}
const mobileTools167=window.updateMobileSelectionTools;if(mobileTools167)window.updateMobileSelectionTools=function(){const r=mobileTools167.apply(this,arguments);requestAnimationFrame(stickerButton167);return r};try{updateMobileSelectionTools=window.updateMobileSelectionTools}catch(_){}
const insp167=window.renderCanvasInspector;if(insp167)window.renderCanvasInspector=function(){const r=insp167.apply(this,arguments);requestAnimationFrame(stickerButton167);return r};try{renderCanvasInspector=window.renderCanvasInspector}catch(_){}

/* ---------- Mobile print becomes a real one-page PDF (no website/date/page footer) ---------- */
function pageData167(){const W=typeof canvasPageWidth==='function'?canvasPageWidth():794,H=typeof canvasPageHeight==='function'?canvasPageHeight():1123;let title='Studia-Lernblatt';try{const d=typeof data!=='undefined'?data:window.data,sid=typeof selectedSheetId!=='undefined'?selectedSheetId:window.selectedSheetId;title=(d?.studySheets||[]).find(x=>x.id===sid)?.title||title}catch(_){}return{W,H,title:String(title).replace(/[^a-z0-9äöüß _-]/gi,'_'),landscape:W>H}}
function absoluteImages167(root){for(const im of qa('img',root)){const src=im.getAttribute('src');if(!src||/^data:|^blob:/i.test(src))continue;try{im.setAttribute('src',new URL(src,location.href).href)}catch(_){}}}
async function pageCanvas167(){
 const d=pageData167(),tmp=document.createElement('div');tmp.innerHTML=typeof serializedCanvas==='function'?serializedCanvas():'';absoluteImages167(tmp);tmp.querySelectorAll('.resizeHandle,.rotateHandle,.vectorSelectBox,.vectorHandle,.vectorRotateLine,.pathNode,.guideLine,.shapeHit,.vectorTouchProxy,.v135LinkBadge,.tableMoveHandle').forEach(x=>x.remove());tmp.querySelectorAll('[contenteditable]').forEach(x=>x.removeAttribute('contenteditable'));
 let bg='background:#fff;';try{bg=pagePatternCSS?.()||bg}catch(_){}
 const xhtml=`<div xmlns="http://www.w3.org/1999/xhtml" style="position:relative;width:${d.W}px;height:${d.H}px;overflow:hidden;box-sizing:border-box;${bg}">${tmp.innerHTML}</div>`;
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${d.W}" height="${d.H}" viewBox="0 0 ${d.W} ${d.H}"><foreignObject x="0" y="0" width="100%" height="100%">${xhtml}</foreignObject></svg>`;
 const blob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(blob),img=new Image();
 try{await new Promise((res,rej)=>{img.onload=res;img.onerror=()=>rej(new Error('Druckbild konnte nicht erstellt werden.'));img.src=url})}finally{setTimeout(()=>URL.revokeObjectURL(url),2000)}
 const c=document.createElement('canvas'),scale=Math.min(2,Math.max(1,1600/Math.max(d.W,d.H)));c.width=Math.round(d.W*scale);c.height=Math.round(d.H*scale);const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(img,0,0,c.width,c.height);return{canvas:c,...d}
}
const te167=new TextEncoder();
function ascii167(s){return te167.encode(s)}
function join167(parts){const n=parts.reduce((a,b)=>a+b.length,0),out=new Uint8Array(n);let p=0;for(const b of parts){out.set(b,p);p+=b.length}return out}
function b64bytes167(dataUrl){const b=atob(dataUrl.split(',')[1]||''),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u}
function pdf167(jpeg,w,h,landscape){
 const PW=landscape?841.89:595.28,PH=landscape?595.28:841.89,parts=[],offs=[0];let len=0;const push=x=>{parts.push(x);len+=x.length};const obj=(n,s)=>{offs[n]=len;push(ascii167(`${n} 0 obj\n${s}\nendobj\n`))};push(ascii167('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'));obj(1,'<< /Type /Catalog /Pages 2 0 R >>');obj(2,'<< /Type /Pages /Kids [3 0 R] /Count 1 >>');obj(3,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW.toFixed(2)} ${PH.toFixed(2)}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);offs[4]=len;push(ascii167(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`));push(jpeg);push(ascii167('\nendstream\nendobj\n'));const content=`q\n${PW.toFixed(2)} 0 0 ${PH.toFixed(2)} 0 0 cm\n/Im0 Do\nQ\n`;obj(5,`<< /Length ${ascii167(content).length} >>\nstream\n${content}endstream`);const xref=len;let xs='xref\n0 6\n0000000000 65535 f \n';for(let i=1;i<=5;i++)xs+=String(offs[i]).padStart(10,'0')+' 00000 n \n';xs+=`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;push(ascii167(xs));return new Blob(parts,{type:'application/pdf'})
}
window.v167OpenPrintPDF=async function(){
 const blank=window.open('about:blank','_blank');if(blank){try{blank.document.write('<div class="v167PdfWait">Druck-PDF wird erstellt …</div>')}catch(_){}}
 try{const r=await pageCanvas167(),jpeg=b64bytes167(r.canvas.toDataURL('image/jpeg',.98)),pdf=pdf167(jpeg,r.canvas.width,r.canvas.height,r.landscape),url=URL.createObjectURL(pdf);if(blank){blank.location.replace(url)}else{const a=document.createElement('a');a.href=url;a.target='_blank';a.download=r.title+'.pdf';a.click()}setTimeout(()=>URL.revokeObjectURL(url),120000)}catch(err){try{blank?.close()}catch(_){}console.error('[V167 PDF]',err);alert('Das Druck-PDF konnte nicht erstellt werden: '+String(err?.message||err))}
};
const printDesktop167=window.printCanvasSheet;
window.printCanvasSheet=function(){if(!mobile())return printDesktop167?.apply(this,arguments);return window.v167OpenPrintPDF()};try{printCanvasSheet=window.printCanvasSheet}catch(_){}

/* ---------- version + safe refresh ---------- */
function init167(){if(!editor())return;ensureStableHits167();stickerButton167();const eye=q('#headerEyebrow');if(eye)eye.textContent='VERSION 167'}
setTimeout(init167,900);setTimeout(init167,3200);
})();
/* ===== /Studia V167 ===== */

/* ===== Studia V168 — mobile text movement/resize/rotate + reliable PDF ===== */
(()=>{
'use strict';
if(window.__STUDIA_V168__)return;window.__STUDIA_V168__=true;
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
const mobile=()=>innerWidth<900;
const editor=()=>document.body.classList.contains('editorMode')&&!!q('#view-sheet-editor.active');
const st=()=>{try{return canvasState}catch(_){return window.canvasState}};
const textKinds=new Set(['text','block','task','merke','file']);
const isText=o=>!!o&&textKinds.has(o.kind)&&!o.isChecklist;
const pageW=()=>typeof window.canvasPageWidth==='function'?window.canvasPageWidth():794;
const pageH=()=>typeof window.canvasPageHeight==='function'?window.canvasPageHeight():1123;
const scale168=()=>{const s=q('#canvasStage'),r=s?.getBoundingClientRect();return r?Math.max(.01,r.width/pageW()):1};
const textObj=id=>(st()?.objects||[]).find(o=>String(o.id)===String(id));
let gesture168=null,lastTap168={id:null,time:0};

function layer168(){
 const stage=q('#canvasStage');if(!stage)return null;let l=q('#v168MobileTextLayer',stage);
 if(!l){l=document.createElement('div');l.id='v168MobileTextLayer';stage.appendChild(l)}
 l.style.width=pageW()+'px';l.style.height=pageH()+'px';return l;
}
function selection168(o,hit){
 const s=st();if(!s||!o)return;
 (s.objects||[]).forEach(x=>{if(x!==o)x.editing=false});
 s.multiMode=false;s.selectedType='object';s.selectedId=o.id;s.selectedIds=[o.id];s.selectedVectorIds=[];
 qa('#canvasObjects .cobj.selected').forEach(el=>el.classList.toggle('selected',String(el.dataset.id)===String(o.id)));
 const el=q(`#canvasObjects .cobj[data-id="${CSS.escape(String(o.id))}"]`);el?.classList.add('selected');
 qa('#v168MobileTextLayer .v168TextHit.selected').forEach(x=>x.classList.remove('selected'));hit?.classList.add('selected');
 try{window.renderCanvasInspector?.();window.renderLayerList?.();window.updateMultiSelectStatus?.();window.updateMobileSelectionTools?.()}catch(_){}
}
function markOldHit168(o){
 const old=q(`.v132Hit[data-kind="object"][data-id="${CSS.escape(String(o.id))}"]`);if(!old)return;old.dataset.v168Text='1';old.style.pointerEvents='none';
}
function finishState168(message){
 try{window.markCanvasDirty?.();window.pushHistory?.();window.renderCanvasInspector?.();window.renderLayerList?.();window.updateMobileSelectionTools?.()}catch(_){}
 if(message)window.cuteToast?.(message);setTimeout(build168,0);
}
function tapOrDrag168(e,o,hit){
 if(o.locked){e.preventDefault();e.stopImmediatePropagation();selection168(o,hit);return}
 e.preventDefault();e.stopImmediatePropagation();selection168(o,hit);
 const z=scale168(),d=gesture168={mode:'move',pid:e.pointerId,id:o.id,sx:e.clientX,sy:e.clientY,ox:+o.x||0,oy:+o.y||0,z,moved:false,hit};
 document.body.classList.add('v168TextTransforming');try{hit.setPointerCapture?.(e.pointerId)}catch(_){}
 const move=ev=>{if(gesture168!==d||ev.pointerId!==d.pid)return;const dx=(ev.clientX-d.sx)/d.z,dy=(ev.clientY-d.sy)/d.z;if(!d.moved&&Math.hypot(dx,dy)<3)return;d.moved=true;ev.preventDefault();ev.stopImmediatePropagation();o.x=Math.max(0,Math.min(Math.max(0,pageW()-o.w),d.ox+dx));o.y=Math.max(0,Math.min(Math.max(0,pageH()-o.h),d.oy+dy));const el=q(`#canvasObjects .cobj[data-id="${CSS.escape(String(o.id))}"]`);if(el){el.style.left=o.x+'px';el.style.top=o.y+'px'}hit.style.left=o.x+'px';hit.style.top=o.y+'px';window.markCanvasDirty?.(false)};
 const up=ev=>{if(gesture168!==d||ev.pointerId!==d.pid)return;window.removeEventListener('pointermove',move,true);window.removeEventListener('pointerup',up,true);window.removeEventListener('pointercancel',cancel,true);gesture168=null;document.body.classList.remove('v168TextTransforming');try{hit.releasePointerCapture?.(e.pointerId)}catch(_){}if(d.moved){finishState168();return}const now=Date.now(),dbl=lastTap168.id===o.id&&now-lastTap168.time<390;lastTap168={id:o.id,time:now};if(dbl&&!o.locked){lastTap168={id:null,time:0};window.v152BeginTextEdit?.(o.id,ev.clientX,ev.clientY);return}build168()};
 const cancel=ev=>{if(gesture168!==d)return;window.removeEventListener('pointermove',move,true);window.removeEventListener('pointerup',up,true);window.removeEventListener('pointercancel',cancel,true);gesture168=null;document.body.classList.remove('v168TextTransforming');build168()};
 window.addEventListener('pointermove',move,{capture:true,passive:false});window.addEventListener('pointerup',up,{capture:true,passive:false});window.addEventListener('pointercancel',cancel,{capture:true,passive:false});
}
function resize168(e,o,hit){
 if(o.locked)return;e.preventDefault();e.stopImmediatePropagation();const z=scale168(),rad=(+o.rotation||0)*Math.PI/180,d=gesture168={mode:'resize',pid:e.pointerId,id:o.id,sx:e.clientX,sy:e.clientY,ow:+o.w||80,oh:+o.h||40,z,rad,hit};document.body.classList.add('v168TextTransforming');try{e.currentTarget.setPointerCapture?.(e.pointerId)}catch(_){}
 const move=ev=>{if(gesture168!==d||ev.pointerId!==d.pid)return;ev.preventDefault();ev.stopImmediatePropagation();const dx=(ev.clientX-d.sx)/d.z,dy=(ev.clientY-d.sy)/d.z,c=Math.cos(d.rad),s=Math.sin(d.rad),lx=dx*c+dy*s,ly=-dx*s+dy*c;o.w=Math.max(60,d.ow+lx);o.h=Math.max(30,d.oh+ly);const el=q(`#canvasObjects .cobj[data-id="${CSS.escape(String(o.id))}"]`);if(el){el.style.width=o.w+'px';el.style.height=o.h+'px'}hit.style.width=o.w+'px';hit.style.height=o.h+'px';window.markCanvasDirty?.(false)};
 const done=ev=>{if(gesture168!==d)return;window.removeEventListener('pointermove',move,true);window.removeEventListener('pointerup',done,true);window.removeEventListener('pointercancel',done,true);gesture168=null;document.body.classList.remove('v168TextTransforming');finishState168('Größe geändert ♡')};
 window.addEventListener('pointermove',move,{capture:true,passive:false});window.addEventListener('pointerup',done,{capture:true,passive:false});window.addEventListener('pointercancel',done,{capture:true,passive:false});
}
function rotate168(e,o,hit){
 if(o.locked)return;e.preventDefault();e.stopImmediatePropagation();const el=q(`#canvasObjects .cobj[data-id="${CSS.escape(String(o.id))}"]`),r=el?.getBoundingClientRect();if(!r)return;const cx=r.left+r.width/2,cy=r.top+r.height/2,start=Math.atan2(e.clientY-cy,e.clientX-cx),base=+o.rotation||0,d=gesture168={mode:'rotate',pid:e.pointerId,id:o.id,cx,cy,start,base,hit};document.body.classList.add('v168TextTransforming');try{e.currentTarget.setPointerCapture?.(e.pointerId)}catch(_){}
 const move=ev=>{if(gesture168!==d||ev.pointerId!==d.pid)return;ev.preventDefault();ev.stopImmediatePropagation();const a=Math.atan2(ev.clientY-d.cy,ev.clientX-d.cx);o.rotation=Math.round(d.base+(a-d.start)*180/Math.PI);const obj=q(`#canvasObjects .cobj[data-id="${CSS.escape(String(o.id))}"]`);if(obj)obj.style.transform=`rotate(${o.rotation}deg)`;hit.style.transform=`rotate(${o.rotation}deg)`;window.markCanvasDirty?.(false)};
 const done=ev=>{if(gesture168!==d)return;window.removeEventListener('pointermove',move,true);window.removeEventListener('pointerup',done,true);window.removeEventListener('pointercancel',done,true);gesture168=null;document.body.classList.remove('v168TextTransforming');finishState168('Gedreht ♡')};
 window.addEventListener('pointermove',move,{capture:true,passive:false});window.addEventListener('pointerup',done,{capture:true,passive:false});window.addEventListener('pointercancel',done,{capture:true,passive:false});
}
function handles168(hit,o){
 const rot=document.createElement('button'),res=document.createElement('button');rot.type=res.type='button';rot.className='v168TextHandle v168TextRotate';res.className='v168TextHandle v168TextResize';rot.setAttribute('aria-label','Textfeld drehen');res.setAttribute('aria-label','Textfeld größer oder kleiner machen');rot.addEventListener('pointerdown',e=>rotate168(e,o,hit),{capture:true,passive:false});res.addEventListener('pointerdown',e=>resize168(e,o,hit),{capture:true,passive:false});hit.append(rot,res);
}
function build168(){
 const l=layer168();if(!l)return;if(!mobile()||!editor()){l.remove();return}l.replaceChildren();const s=st(),sid=String(s?.selectedId??'');
 for(const o of s?.objects||[]){if(!isText(o)||o.editing)continue;const h=document.createElement('div');h.className='v168TextHit'+(String(o.id)===sid?' selected':'')+(o.locked?' locked':'');h.dataset.id=o.id;Object.assign(h.style,{left:(+o.x||0)+'px',top:(+o.y||0)+'px',width:Math.max(18,+o.w||80)+'px',height:Math.max(18,+o.h||40)+'px',transform:`rotate(${+o.rotation||0}deg)`,transformOrigin:'50% 50%',zIndex:String(1000+(+o.z||0))});h.addEventListener('pointerdown',e=>{if(e.target.closest('.v168TextHandle'))return;if(e.pointerType==='mouse'&&e.button!==0)return;tapOrDrag168(e,o,h)},{capture:true,passive:false});if(String(o.id)===sid&&!o.locked)handles168(h,o);l.appendChild(h);markOldHit168(o)}
}
const render168=window.renderCanvasObjects;if(render168)window.renderCanvasObjects=function(){const r=render168.apply(this,arguments);requestAnimationFrame(build168);return r};try{renderCanvasObjects=window.renderCanvasObjects}catch(_){}
const inspector168=window.renderCanvasInspector;if(inspector168)window.renderCanvasInspector=function(){const r=inspector168.apply(this,arguments);requestAnimationFrame(build168);return r};try{renderCanvasInspector=window.renderCanvasInspector}catch(_){}
window.addEventListener('resize',()=>setTimeout(build168,80));setTimeout(build168,500);setTimeout(build168,1700);

/* ---------- Mobile print: clone the actual page, inline images, rasterize safely, then open a real PDF. ---------- */
function bytes168(s){return new TextEncoder().encode(s)}
function join168(parts){const n=parts.reduce((a,b)=>a+b.length,0),out=new Uint8Array(n);let p=0;for(const b of parts){out.set(b,p);p+=b.length}return out}
function jpegBytes168(url){const b=atob(url.split(',')[1]||''),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u}
function pdf168(jpeg,w,h,landscape){
 const PW=landscape?841.89:595.28,PH=landscape?595.28:841.89,parts=[],offs=[0];let len=0;const push=x=>{parts.push(x);len+=x.length},obj=(n,s)=>{offs[n]=len;push(bytes168(`${n} 0 obj\n${s}\nendobj\n`))};push(bytes168('%PDF-1.4\n%PDF\n'));obj(1,'<< /Type /Catalog /Pages 2 0 R >>');obj(2,'<< /Type /Pages /Kids [3 0 R] /Count 1 >>');obj(3,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW.toFixed(2)} ${PH.toFixed(2)}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);offs[4]=len;push(bytes168(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`));push(jpeg);push(bytes168('\nendstream\nendobj\n'));const c=`q\n${PW.toFixed(2)} 0 0 ${PH.toFixed(2)} 0 0 cm\n/Im0 Do\nQ\n`;obj(5,`<< /Length ${bytes168(c).length} >>\nstream\n${c}endstream`);const xr=len;let xs='xref\n0 6\n0000000000 65535 f \n';for(let i=1;i<=5;i++)xs+=String(offs[i]).padStart(10,'0')+' 00000 n \n';xs+=`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xr}\n%%EOF`;push(bytes168(xs));return new Blob(parts,{type:'application/pdf'})
}
function dataURL168(blob){return new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>res(String(fr.result));fr.onerror=rej;fr.readAsDataURL(blob)})}
async function inlineSrc168(src){if(!src||/^data:/i.test(src))return src;try{const u=new URL(src,location.href);if(u.protocol==='blob:')return await dataURL168(await fetch(u.href).then(r=>r.blob()));if(u.origin!==location.origin)return '';const r=await fetch(u.href,{cache:'force-cache'});if(!r.ok)throw new Error('HTTP '+r.status);return await dataURL168(await r.blob())}catch(_){return ''}}
async function printClone168(){
 const source=q('#canvasStage');if(!source)throw new Error('Lernblatt nicht gefunden.');const clone=source.cloneNode(true),W=pageW(),H=pageH();clone.id='v168PrintStage';clone.querySelectorAll('#v132InteractionLayer,#v152TextHitLayer,#v168MobileTextLayer,#canvasGuides,#pathDrawHint,.resizeHandle,.rotateHandle,.v138TransformHandle,.vectorSelectBox,.vectorHandle,.vectorRotateLine,.pathNode,.shapeHit,.vectorTouchProxy,.v135LinkBadge,.tableMoveHandle,.v108MoveHandle,.v108VectorMoveHandle,.v137Marquee').forEach(x=>x.remove());clone.querySelectorAll('[contenteditable]').forEach(x=>x.removeAttribute('contenteditable'));clone.querySelectorAll('.selected,.editing,.locked').forEach(x=>x.classList.remove('selected','editing','locked'));Object.assign(clone.style,{width:W+'px',height:H+'px',transform:'none',transformOrigin:'0 0',margin:'0',boxShadow:'none',border:'0',overflow:'hidden',background:'#fff'});
 const imgs=qa('img',clone);for(const im of imgs){const src=await inlineSrc168(im.getAttribute('src'));if(src)im.setAttribute('src',src);else im.remove()}
 const svgImgs=qa('image',clone);for(const im of svgImgs){const raw=im.getAttribute('href')||im.getAttribute('xlink:href');if(!raw)continue;const src=await inlineSrc168(raw);if(src){im.setAttribute('href',src);im.removeAttribute('xlink:href')}else im.remove()}
 let css='';try{for(const ss of document.styleSheets){let rules;try{rules=ss.cssRules}catch(_){continue}for(const rule of rules||[]){const t=rule.cssText||'';if(/@font-face/i.test(t)||/url\s*\(/i.test(t))continue;css+=t+'\n'}}}catch(_){}
 const wrap=document.createElement('div');wrap.setAttribute('xmlns','http://www.w3.org/1999/xhtml');wrap.style.cssText=`position:relative;width:${W}px;height:${H}px;margin:0;padding:0;overflow:hidden;background:#fff;`;const style=document.createElement('style');style.textContent=css+`\n#v168PrintStage{width:${W}px!important;height:${H}px!important;transform:none!important;margin:0!important;border:0!important;box-shadow:none!important;overflow:hidden!important}#v168PrintStage .cobj{outline:0!important;box-shadow:none!important}`;wrap.append(style,clone);const xhtml=new XMLSerializer().serializeToString(wrap),svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><foreignObject x="0" y="0" width="${W}" height="${H}">${xhtml}</foreignObject></svg>`,blob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(blob),img=new Image();
 try{await new Promise((res,rej)=>{const tm=setTimeout(()=>rej(new Error('Druckansicht hat zu lange gebraucht.')),12000);img.onload=()=>{clearTimeout(tm);res()};img.onerror=()=>{clearTimeout(tm);rej(new Error('Druckansicht konnte nicht gerendert werden.'))};img.src=url});const sc=Math.min(2,Math.max(1,1800/Math.max(W,H))),c=document.createElement('canvas');c.width=Math.round(W*sc);c.height=Math.round(H*sc);const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(img,0,0,c.width,c.height);return{canvas:c,W,H}}finally{URL.revokeObjectURL(url)}
}
function title168(){let t='Lernblatt';try{const d=typeof data!=='undefined'?data:window.data,sid=typeof selectedSheetId!=='undefined'?selectedSheetId:window.selectedSheetId;t=(d?.studySheets||[]).find(x=>x.id===sid)?.title||q('.editorTitle b')?.textContent||t}catch(_){}return String(t).replace(/[^a-z0-9äöüß _-]/gi,'_').slice(0,80)||'Lernblatt'}
window.v168PrintMobile=async function(){
 const tab=window.open('','_blank');if(tab){try{tab.document.open();tab.document.write('<!doctype html><meta name="viewport" content="width=device-width"><title>Studia Druck</title><body style="margin:0;background:#fffaf7;font:800 15px system-ui;color:#725b56;display:grid;place-items:center;height:100vh">PDF wird erstellt …</body>');tab.document.close()}catch(_){}}
 try{const r=await printClone168(),jpg=jpegBytes168(r.canvas.toDataURL('image/jpeg',.98)),pdf=pdf168(jpg,r.canvas.width,r.canvas.height,r.W>r.H),url=URL.createObjectURL(pdf);if(tab&&!tab.closed){tab.location.replace(url)}else{const a=document.createElement('a');a.href=url;a.target='_blank';a.download=title168()+'.pdf';document.body.appendChild(a);a.click();a.remove()}setTimeout(()=>URL.revokeObjectURL(url),180000);window.cuteToast?.('PDF bereit · über Teilen → Drucken ♡')}catch(err){console.error('[V168 print]',err);try{tab?.close()}catch(_){}alert('Drucken konnte nicht vorbereitet werden: '+String(err?.message||err))}
};
const desktopPrint168=window.printCanvasSheet;
window.printCanvasSheet=function(){if(mobile())return window.v168PrintMobile();return desktopPrint168?.apply(this,arguments)};try{printCanvasSheet=window.printCanvasSheet}catch(_){}

function version168(){const e=q('#headerEyebrow');if(e)e.textContent='VERSION 168'}
setTimeout(version168,800);setTimeout(version168,3600);setTimeout(version168,5200);
})();
/* ===== /Studia V168 ===== */
