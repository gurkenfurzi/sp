
(function(){
  const mobile=()=>window.innerWidth<900;
  const inEditor=()=>document.body.classList.contains('editorMode')&&!!document.querySelector('#view-sheet-editor.active');
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const stage=()=>document.getElementById('canvasStage');
  const viewport=()=>document.getElementById('canvasViewport');
  const surface=()=>document.getElementById('v96PanSurface') || (typeof v96EnsurePanSurface==='function'?v96EnsurePanSurface():null);

  // Critical fix: V63 had transform:none!important; zoom state changed but the page never visually scaled.
  // Every zoom API now writes an inline !important transform, so legacy CSS cannot block it again.
  function setStageTransform(value){const st=stage();if(st)st.style.setProperty('transform',value,'important')}
  function setScaleLabel(z){const a=document.getElementById('canvasZoomLabel');if(a)a.textContent=Math.round(z*100)+'%';const b=document.getElementById('v91ZoomLabel');if(b)b.textContent=Math.round(z*100)+'%'}
  function applyDesktopZoom(value,preserve=true,focus=null){
    const vp=viewport(),st=stage(),sf=surface();if(!vp||!st||!sf)return;
    const old=clamp(Number(st.dataset.scale)||window.canvasZoom||1,.15,4),z=clamp(Number(value)||1,.18,3.5),g=38;
    const fx=focus?.x??vp.clientWidth/2,fy=focus?.y??vp.clientHeight/2;
    let wx=null,wy=null;if(preserve){wx=(vp.scrollLeft+fx-g)/old;wy=(vp.scrollTop+fy-g)/old}
    window.canvasZoom=z;canvasState.userZoomTouched=true;st.dataset.scale=String(z);st.style.zoom='';st.style.left=g+'px';st.style.top=g+'px';setStageTransform(`scale(${z})`);st.style.transformOrigin='0 0';
    sf.style.width=(canvasPageWidth()*z+g*2)+'px';sf.style.height=(canvasPageHeight()*z+g*2)+'px';setScaleLabel(z);
    if(preserve&&wx!=null)requestAnimationFrame(()=>{vp.scrollLeft=Math.max(0,g+wx*z-fx);vp.scrollTop=Math.max(0,g+wy*z-fy)});
  }
  function fitDesktop(){const vp=viewport();if(!vp)return;const z=clamp(Math.min((vp.clientWidth-76)/canvasPageWidth(),(vp.clientHeight-76)/canvasPageHeight()),.18,1);applyDesktopZoom(z,false);requestAnimationFrame(()=>{vp.scrollLeft=0;vp.scrollTop=0})}
  window.v113ApplyDesktopZoom=applyDesktopZoom;
  if(!mobile()){
    window.v96ApplyZoom=applyDesktopZoom;window.v108ApplyZoom=applyDesktopZoom;window.v112ApplyZoom=applyDesktopZoom;
    try{v96ApplyZoom=applyDesktopZoom}catch(_){ }
  }

  // Alt + wheel and middle-mouse hand: bind directly to the real viewport after every editor render.
  function bindDesktopNavigation(){
    const vp=viewport();if(!vp||vp.dataset.v113Nav==='1'||mobile())return;vp.dataset.v113Nav='1';let pan=null;
    vp.addEventListener('wheel',e=>{if(window.__STUDIA_V115_OWNS_GESTURES)return;if(!e.altKey)return;e.preventDefault();e.stopPropagation();const r=vp.getBoundingClientRect(),focus={x:e.clientX-r.left,y:e.clientY-r.top};applyDesktopZoom((window.canvasZoom||1)*Math.exp(-e.deltaY*.0022),true,focus)},{passive:false});
    vp.addEventListener('mousedown',e=>{if(window.__STUDIA_V115_OWNS_GESTURES)return;if(e.button!==1)return;e.preventDefault();e.stopPropagation();pan={x:e.clientX,y:e.clientY,l:vp.scrollLeft,t:vp.scrollTop};vp.classList.add('v113Pan')},true);
    window.addEventListener('mousemove',e=>{if(!pan)return;vp.scrollLeft=pan.l-(e.clientX-pan.x);vp.scrollTop=pan.t-(e.clientY-pan.y)},true);
    const stop=()=>{pan=null;vp.classList.remove('v113Pan')};window.addEventListener('mouseup',stop,true);window.addEventListener('blur',stop);
    vp.addEventListener('auxclick',e=>{if(e.button===1)e.preventDefault()});
  }

  // Object movement uses raw pointer deltas / current visual scale. No more jumping when the canvas is zoomed.
  window.startDragObject=function(e,oid){
    const o=canvasState.objects.find(x=>x.id===oid);if(!o||o.locked)return;e.preventDefault?.();e.stopPropagation?.();
    const st=stage(),sc=Math.max(.01,Number(st?.dataset.scale)||window.canvasZoom||1),sx=e.clientX,sy=e.clientY,ox=o.x,oy=o.y;let moved=false;
    const move=ev=>{const dx=(ev.clientX-sx)/sc,dy=(ev.clientY-sy)/sc;if(Math.hypot(dx,dy)>.5)moved=true;const rawX=Math.max(0,Math.min(canvasPageWidth()-o.w,ox+dx)),rawY=Math.max(0,Math.min(canvasPageHeight()-o.h,oy+dy)),sn=snapObjectPosition(o,rawX,rawY);o.x=sn.x;o.y=sn.y;const el=document.querySelector(`.cobj[data-id="${oid}"]`);if(el){el.style.left=o.x+'px';el.style.top=o.y+'px'}markCanvasDirty(false)};
    const up=()=>{clearGuides();window.removeEventListener('pointermove',move,true);window.removeEventListener('pointerup',up,true);window.removeEventListener('pointercancel',up,true);if(moved)pushHistory();renderCanvasInspector?.()};
    window.addEventListener('pointermove',move,true);window.addEventListener('pointerup',up,true);window.addEventListener('pointercancel',up,true);
  };
  try{startDragObject=window.startDragObject}catch(_){ }

  window.startVectorDrag=function(e,vid){
    const v=canvasState.vectors.find(x=>x.id===vid);if(!v||v.locked)return;e.preventDefault?.();e.stopPropagation?.();
    const st=stage(),sc=Math.max(.01,Number(st?.dataset.scale)||window.canvasZoom||1),sx=e.clientX,sy=e.clientY,snap=JSON.parse(JSON.stringify(v));let moved=false;
    const move=ev=>{const dx=(ev.clientX-sx)/sc,dy=(ev.clientY-sy)/sc;if(Math.hypot(dx,dy)>.5)moved=true;if(v.type==='rect'){v.x=snap.x+dx;v.y=snap.y+dy}else if(v.type==='ellipse'){v.cx=snap.cx+dx;v.cy=snap.cy+dy}else if(v.points){v.points=snap.points.map(pt=>[pt[0]+dx,pt[1]+dy])}renderVectors();markCanvasDirty(false)};
    const up=()=>{window.removeEventListener('pointermove',move,true);window.removeEventListener('pointerup',up,true);window.removeEventListener('pointercancel',up,true);if(moved)pushHistory()};
    window.addEventListener('pointermove',move,true);window.addEventListener('pointerup',up,true);window.addEventListener('pointercancel',up,true);
  };
  try{startVectorDrag=window.startVectorDrag}catch(_){ }

  // Real vector line + smooth curve tools. They are normal vectors, so move/resize/layers all work.
  window.addVectorLine=function(){
    const v={id:id(),z:nextCanvasZ(),type:'path',points:[[210,410],[585,410]],fill:'none',stroke:'#8d7369',strokeWidth:4,dash:'solid',closed:false,rotation:0,locked:false};
    canvasState.vectors.push(v);canvasState.vectorTool='select';selectVector(v.id);pushHistory();markCanvasDirty();cuteToast?.('Linie eingefügt ♡');
  };
  window.addVectorCurve=function(){
    const p0=[205,470],p1=[300,300],p2=[495,300],p3=[590,470],pts=[];
    for(let i=0;i<=28;i++){const t=i/28,u=1-t,x=u*u*u*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t*t*t*p3[0],y=u*u*u*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t*t*t*p3[1];pts.push([x,y])}
    const v={id:id(),z:nextCanvasZ(),type:'path',points:pts,fill:'none',stroke:'#8d7369',strokeWidth:4,dash:'solid',closed:false,rotation:0,locked:false,smoothCurve:true};
    canvasState.vectors.push(v);canvasState.vectorTool='select';selectVector(v.id);pushHistory();markCanvasDirty();cuteToast?.('Kurve eingefügt ♡');
  };

  // Add the new line/curve tools to the phone Elements drawer every time it opens.
  function patchMobileElements(){
    if(!mobile())return;const d=document.getElementById('canvasQuickDrawer');if(!d?.classList.contains('open'))return;
    const section=d.querySelector('.mobileDrawerSection .mobileToolGrid');if(!section||section.querySelector('[data-v113-line]'))return;
    const line=document.createElement('button');line.dataset.v113Line='1';line.innerHTML='<b>—</b><span>Linie</span>';line.onclick=()=>addVectorLine();
    const curve=document.createElement('button');curve.dataset.v113Curve='1';curve.innerHTML='<b>⌁</b><span>Kurve</span>';curve.onclick=()=>addVectorCurve();
    section.append(line,curve);
  }

  // Stable toolbar state: it may only disappear while the text-edit sub-toolbar intentionally replaces it.
  function reconcileMobileChrome(){
    if(!inEditor()||!mobile())return;const nav=document.querySelector('.canvasQuickNav'),drawer=document.getElementById('canvasQuickDrawer');if(!nav)return;
    const open=!!drawer?.classList.contains('open');if(!open){document.body.classList.remove('editorDrawerOpen','v112TextEditing');nav.style.setProperty('display','grid','important')}
    else if(document.body.classList.contains('v112TextEditing'))nav.style.setProperty('display','none','important');
    else nav.style.setProperty('display','grid','important');
    const tools=document.getElementById('mobileSelectionTools');if(tools&&open)tools.style.setProperty('display','none','important');else if(tools)tools.style.removeProperty('display');
  }
  const chromeObserver=new MutationObserver(()=>requestAnimationFrame(reconcileMobileChrome));chromeObserver.observe(document.body,{attributes:true,attributeFilter:['class'],subtree:false});
  const drawerObserverTarget=document.getElementById('canvasQuickDrawer');if(drawerObserverTarget)chromeObserver.observe(drawerObserverTarget,{attributes:true,attributeFilter:['class']});

  const prevOpenGroup=window.editorOpenGroup;
  window.editorOpenGroup=function(group,btn){const r=prevOpenGroup(group,btn);requestAnimationFrame(()=>{patchMobileElements();reconcileMobileChrome()});return r};
  try{editorOpenGroup=window.editorOpenGroup}catch(_){ }
  const prevCloseDrawer=window.closeEditorDrawer;
  window.closeEditorDrawer=function(){const r=prevCloseDrawer();document.body.classList.remove('v112TextEditing');requestAnimationFrame(reconcileMobileChrome);return r};
  try{closeEditorDrawer=window.closeEditorDrawer}catch(_){ }

  // Desktop left palette: five reliable modes instead of stale/overlapping click layers.
  const PICON={
    text:'<svg viewBox="0 0 24 24"><path d="M5 5h14M12 5v14M8.5 19h7"/></svg>',
    rect:'<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="14" rx="2"/></svg>',
    image:'<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8" cy="9" r="2"/><path d="m5 18 5-5 3 3 2-2 4 4"/></svg>',
    table:'<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16M15 4v16"/></svg>',
    line:'<svg viewBox="0 0 24 24"><path d="M4 17 20 7"/></svg>',
    curve:'<svg viewBox="0 0 24 24"><path d="M4 17c4-12 12-12 16 0"/></svg>',
    formula:'<svg viewBox="0 0 24 24"><path d="M17 5H8l5 7-5 7h9"/></svg>',
    graph:'<svg viewBox="0 0 24 24"><path d="M4 19V5M4 19h16M7 15l4-5 3 2 5-6"/></svg>',
    page:'<svg viewBox="0 0 24 24"><path d="M7 3h8l3 3v15H7zM15 3v4h3"/></svg>',
    layers:'<svg viewBox="0 0 24 24"><path d="m12 4 8 4-8 4-8-4zM4 12l8 4 8-4M4 16l8 4 8-4"/></svg>',
    template:'<svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
    pen:'<svg viewBox="0 0 24 24"><path d="m4 20 4-1 10-10-3-3L5 16zM14 7l3 3"/></svg>'
  };
  const pbtn=(label,icon,action)=>`<button onclick="${action}"><span class="v113PaletteIcon">${PICON[icon]||PICON.rect}</span><span>${label}</span></button>`;
  function elementsPalette(){return `<div class="v113PaletteGroup"><div class="v113PaletteTitle">Text & Inhalt</div><div class="v113PaletteGrid">${pbtn('Textfeld','text','addCanvasTextBox()')}${pbtn('Checkliste','page','addCanvasChecklist()')}${pbtn('Bild / Datei','image','openCanvasMediaPicker()')}${pbtn('Tabelle','table','openTableDialog()')}</div></div><div class="v113PaletteGroup"><div class="v113PaletteTitle">Formen & Linien</div><div class="v113PaletteGrid">${pbtn('Rechteck','rect',"addVectorShape('rect')")}${pbtn('Kreis','rect',"addVectorShape('ellipse')")}${pbtn('Dreieck','rect',"addVectorShape('triangle')")}${pbtn('Linie','line','addVectorLine()')}${pbtn('Kurve','curve','addVectorCurve()')}${pbtn('Freihand','pen',"setVectorTool('pen')")}</div></div><div class="v113PaletteGroup"><div class="v113PaletteTitle">Mathematik</div><div class="v113PaletteGrid">${pbtn('Formel','formula','openFormulaDialog()')}${pbtn('Graph','graph','openGraphDialog()')}</div></div><div class="v113PaletteGroup"><div class="v113PaletteTitle">Papier & Deko</div><div class="v113PaletteGrid">${pbtn('Kariertes Papier','page',"addPaperSticker('grid')")}${pbtn('Liniertes Papier','page',"addPaperSticker('line')")}${pbtn('Klebeband','line','addTapeSticker()')}${pbtn('Sticker','template','toggleStickerPanel()')}</div></div>`}
  function textPalette(){const presets=typeof canvasPresets==='function'?canvasPresets():[];return `<div class="v113PaletteGroup"><div class="v113PaletteTitle">Text</div><div class="v113PaletteGrid">${pbtn('Textfeld','text','addCanvasTextBox()')}${pbtn('Eigenes Format','template','createCustomStylePreset()')}</div></div><div class="v113PaletteGroup"><div class="v113PaletteTitle">Textformate</div><div class="v113PaletteGrid">${presets.map(x=>pbtn(x.name,'text',x.bundle?`insertSavedTextFormat('${x.id}')`:`addCanvasText('${x.id}')`)).join('')}</div></div>`}
  function templatesPalette(){try{renderPageTemplates()}catch(_){}const source=document.getElementById('pageTemplatePicker')?.innerHTML||'';return `<div class="v113PaletteGroup"><div class="v113PaletteTitle">Vorlagen</div><div class="v113TemplateHost">${source}</div><div class="v113PaletteGrid" style="margin-top:8px">${pbtn('Aktuelle Seite speichern','template','saveCurrentPageTemplate()')}${pbtn('Verwalten','template','openPageTemplateManager()')}</div></div>`}
  window.v113DesktopPanel=function(mode,btn){
    if(mobile())return;const drawer=document.getElementById('canvasQuickDrawer'),nav=document.querySelector('.v102DesktopLeft>.canvasQuickNav')||document.querySelector('.canvasQuickNav');if(!drawer||!nav)return;
    nav.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===btn||x.dataset.v113Mode===mode));drawer.classList.add('open');drawer.style.display='block';
    if(mode==='elements')drawer.innerHTML=elementsPalette();
    if(mode==='text')drawer.innerHTML=textPalette();
    if(mode==='templates')drawer.innerHTML=templatesPalette();
    if(mode==='pages'){drawer.innerHTML='<div class="v113PaletteGroup"><div class="v113PaletteTitle">Seiten</div><p class="small">Seiteneinstellungen und Reihenfolge findest du rechts.</p></div>';try{v102RightTab('page')}catch(_){}}
    if(mode==='layers'){drawer.innerHTML='<div class="v113PaletteGroup"><div class="v113PaletteTitle">Ebenen</div><p class="small">Ebenen per Drag & Drop rechts sortieren.</p></div>';try{v102RightTab('layers')}catch(_){}}
    localStorage.setItem('studia-v113-desktop-panel',mode);
  };
  function desktopInit(){
    if(window.__STUDIA_V134_REFERENCE_ONLY__&&!mobile())return;
    if(mobile()||!inEditor())return;const nav=document.querySelector('.v102DesktopLeft>.canvasQuickNav')||document.querySelector('.canvasQuickNav'),drawer=document.getElementById('canvasQuickDrawer');if(!nav||!drawer)return;
    nav.innerHTML=`<button data-v113-mode="elements" onclick="v113DesktopPanel('elements',this)"><span class="editorNavIcon">${PICON.rect}</span><span>Elemente</span></button><button data-v113-mode="text" onclick="v113DesktopPanel('text',this)"><span class="editorNavIcon">${PICON.text}</span><span>Text</span></button><button data-v113-mode="templates" onclick="v113DesktopPanel('templates',this)"><span class="editorNavIcon">${PICON.template}</span><span>Vorlagen</span></button><button data-v113-mode="pages" onclick="v113DesktopPanel('pages',this)"><span class="editorNavIcon">${PICON.page}</span><span>Seiten</span></button><button data-v113-mode="layers" onclick="v113DesktopPanel('layers',this)"><span class="editorNavIcon">${PICON.layers}</span><span>Ebenen</span></button>`;
    const mode=localStorage.getItem('studia-v113-desktop-panel')||'elements',button=nav.querySelector(`[data-v113-mode="${mode}"]`)||nav.querySelector('button');v113DesktopPanel(button?.dataset.v113Mode||'elements',button);bindDesktopNavigation();
  }

  // Topic view = one contained viewport. This also removes the old 100vw/left:50% gap hack.
  function topicLock(){const on=!!document.querySelector('#view-topic-detail.active');document.body.classList.toggle('v113TopicLock',on&&!inEditor())}
  const prevOpenView=window.openView;
  window.openView=function(name){const r=prevOpenView(name);requestAnimationFrame(()=>{topicLock();reconcileMobileChrome()});return r};
  try{openView=window.openView}catch(_){ }

  // Reapply final editor wiring after all legacy render wrappers finish.
  const prevRender=window.renderSheetEditor||renderSheetEditor;
  window.renderSheetEditor=function(){
    prevRender();setTimeout(()=>{desktopInit();bindDesktopNavigation();reconcileMobileChrome();if(!mobile())fitDesktop();},260);
  };
  try{renderSheetEditor=window.renderSheetEditor}catch(_){ }
  window.addEventListener('resize',()=>setTimeout(()=>{topicLock();if(inEditor()){desktopInit();reconcileMobileChrome()}},100));

  setTimeout(()=>{topicLock();if(inEditor()){desktopInit();reconcileMobileChrome()}const e=document.getElementById('headerEyebrow');if(e)e.textContent='VERSION 202';document.title='Studia'},120);
})();
