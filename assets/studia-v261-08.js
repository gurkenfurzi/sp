if(window.__STUDIA_V129_INPUT__){}else{

(()=>{
  'use strict';
  const mobile=()=>innerWidth<900;
  const editor=()=>document.body.classList.contains('editorMode');
  const vp=()=>document.getElementById('canvasViewport');
  const st=()=>document.getElementById('canvasStage');
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const scale=()=>Number(st()?.dataset.scale)||Number(window.canvasZoom)||1;

  /* ---------- CANVA-LIKE PINCH: keep the exact paper point under the live finger midpoint ---------- */
  let pinch=null;
  const pair=e=>{const a=e.touches[0],b=e.touches[1];return{cx:(a.clientX+b.clientX)/2,cy:(a.clientY+b.clientY)/2,d:Math.max(1,Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY))}};
  function applyStageScale(z){
    const V=vp(),S=st();if(!V||!S)return;
    z=clamp(z,.18,4);window.canvasZoom=z;if(window.canvasState)canvasState.userZoomTouched=true;
    S.dataset.scale=String(z);S.style.zoom='';S.style.transform=`scale(${z})`;S.style.transformOrigin='0 0';
    const sf=S.parentElement?.id==='v96PanSurface'?S.parentElement:document.getElementById('v96PanSurface');
    if(sf){
      const left=parseFloat(getComputedStyle(S).left)||0,top=parseFloat(getComputedStyle(S).top)||0;
      sf.style.width=(canvasPageWidth()*z+Math.max(0,left)*2)+'px';sf.style.height=(canvasPageHeight()*z+Math.max(0,top)*2)+'px';
    }
    const a=document.getElementById('canvasZoomLabel');if(a)a.textContent=Math.round(z*100)+'%';
    const b=document.getElementById('v91ZoomLabel');if(b)b.textContent=Math.round(z*100)+'%';
  }
  function zoomAtClient(z,cx,cy){
    const V=vp(),S=st();if(!V||!S)return;
    const old=scale(),before=S.getBoundingClientRect();
    const wx=(cx-before.left)/old,wy=(cy-before.top)/old;
    applyStageScale(z);
    const after=S.getBoundingClientRect();
    const newClientX=after.left+wx*z,newClientY=after.top+wy*z;
    V.scrollLeft+=newClientX-cx;V.scrollTop+=newClientY-cy;
  }
  window.addEventListener('touchstart',e=>{
    if(!editor()||!mobile()||e.touches.length!==2||!vp()?.contains(e.target))return;
    const q=pair(e),S=st();if(!S)return;
    e.preventDefault();e.stopImmediatePropagation();
    pinch={d:q.d,z:scale()};document.body.classList.add('v122Pinching');
  },{capture:true,passive:false});
  window.addEventListener('touchmove',e=>{
    if(!pinch||e.touches.length!==2)return;
    e.preventDefault();e.stopImmediatePropagation();const q=pair(e);
    zoomAtClient(clamp(pinch.z*q.d/pinch.d,.18,4),q.cx,q.cy);
  },{capture:true,passive:false});
  const pinchEnd=e=>{if(!e.touches||e.touches.length<2){pinch=null;document.body.classList.remove('v122Pinching')}};
  window.addEventListener('touchend',pinchEnd,{capture:true,passive:true});
  window.addEventListener('touchcancel',()=>{pinch=null;document.body.classList.remove('v122Pinching')},{capture:true,passive:true});

  /* Desktop Alt+wheel: only #canvasStage changes, never the app chrome. */
  window.addEventListener('wheel',e=>{
    if(!editor()||mobile()||!e.altKey||!vp()?.contains(e.target))return;
    e.preventDefault();e.stopImmediatePropagation();
    zoomAtClient(clamp(scale()*Math.exp(-e.deltaY*.002),.18,4),e.clientX,e.clientY);
  },{capture:true,passive:false});

  /* ---------- VECTOR HIT TESTING (does not depend on broken SVG pointer layers) ---------- */
  function canvasPt(e){const r=st().getBoundingClientRect(),z=scale();return{x:(e.clientX-r.left)/z,y:(e.clientY-r.top)/z}}
  function segDist(p,a,b){const vx=b[0]-a[0],vy=b[1]-a[1],wx=p.x-a[0],wy=p.y-a[1],c1=vx*wx+vy*wy;if(c1<=0)return Math.hypot(p.x-a[0],p.y-a[1]);const c2=vx*vx+vy*vy;if(c2<=c1)return Math.hypot(p.x-b[0],p.y-b[1]);const t=c1/c2;return Math.hypot(p.x-(a[0]+t*vx),p.y-(a[1]+t*vy))}
  function inPoly(p,pts){let c=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const a=pts[i],b=pts[j];if(((a[1]>p.y)!==(b[1]>p.y))&&(p.x<(b[0]-a[0])*(p.y-a[1])/(b[1]-a[1]||1e-9)+a[0]))c=!c}return c}
  function vectorHit(v,p){
    const pad=Math.max(10,12/scale());
    if(v.type==='rect')return p.x>=v.x-pad&&p.x<=v.x+v.w+pad&&p.y>=v.y-pad&&p.y<=v.y+v.h+pad;
    if(v.type==='ellipse'){const rx=Math.max(1,v.rx+pad),ry=Math.max(1,v.ry+pad);return ((p.x-v.cx)**2)/(rx*rx)+((p.y-v.cy)**2)/(ry*ry)<=1}
    if(v.type==='triangle')return inPoly(p,v.points||[]);
    if(v.type==='path'){const pts=v.points||[];if(v.closed&&inPoly(p,pts))return true;for(let i=1;i<pts.length;i++)if(segDist(p,pts[i-1],pts[i])<=pad)return true;return false}
    return false;
  }
  function topVectorAt(p){
    const arr=[...(canvasState?.vectors||[])].filter(v=>!v.locked&&vectorHit(v,p));
    arr.sort((a,b)=>((a.id===canvasState.selectedId?1e7:(a.z||0))-(b.id===canvasState.selectedId?1e7:(b.z||0))));
    return arr.at(-1)||null;
  }
  function moveVector(v,snap,dx,dy){
    if(v.type==='rect'){v.x=snap.x+dx;v.y=snap.y+dy}
    else if(v.type==='ellipse'){v.cx=snap.cx+dx;v.cy=snap.cy+dy}
    else if(v.points)v.points=snap.points.map(q=>[q[0]+dx,q[1]+dy]);
  }
  function beginVectorDrag(e,v){
    if(!v||v.locked)return;
    e.preventDefault();e.stopImmediatePropagation();
    const pid=e.pointerId,start=canvasPt(e),snap=JSON.parse(JSON.stringify(v));let moved=false;
    canvasState.selectedType='vector';canvasState.selectedId=v.id;canvasState.selectedIds=[];canvasState.selectedVectorIds=[v.id];
    renderVectors();renderCanvasInspector();renderLayerList();
    document.body.classList.add('v122ShapeDragging');
    const move=ev=>{
      if(ev.pointerId!==pid||document.body.classList.contains('v122Pinching'))return;
      const q=canvasPt(ev),dx=q.x-start.x,dy=q.y-start.y;if(!moved&&Math.hypot(dx,dy)<2)moved=true;
      if(!moved)return;ev.preventDefault();moveVector(v,snap,dx,dy);renderVectors();markCanvasDirty(false);
    };
    const end=ev=>{if(ev.pointerId!==pid)return;window.removeEventListener('pointermove',move,true);window.removeEventListener('pointerup',end,true);window.removeEventListener('pointercancel',end,true);document.body.classList.remove('v122ShapeDragging');if(moved){pushHistory();renderCanvasInspector();renderLayerList()}};
    window.addEventListener('pointermove',move,{capture:true,passive:false});window.addEventListener('pointerup',end,true);window.addEventListener('pointercancel',end,true);
  }
  window.addEventListener('pointerdown',e=>{
    if(innerWidth>=900||!editor()||e.button!==0||pinch||!st()?.contains(e.target))return;
    const t=e.target instanceof Element?e.target:null;
    if(t?.closest('.cobj,.vectorHandle,.pathNode,.resizeHandle,.rotateHandle'))return;
    const v=topVectorAt(canvasPt(e));if(!v)return;
    beginVectorDrag(e,v);
  },true);

  /* ---------- DESKTOP PARITY: literally open the same five drawers as phone ---------- */
  window.v122DesktopGroup=function(group,btn){
    if(mobile())return;
    const d=document.getElementById('canvasQuickDrawer');if(!d)return;
    try{openEditorGroup=null}catch(_){ }
    d.classList.remove('open');
    editorOpenGroup(group,btn);
    d.classList.add('v122DesktopDrawer','v121DesktopParity','open');
    if(group==='textLibrary'||group==='textEdit'||group==='text'){
      if(!d.querySelector('.v122DesktopTextActions')){
        const x=document.createElement('div');x.className='v122DesktopTextActions';
        x.innerHTML='<button onclick="v91PickFont()">Aa＋ Eigene Schrift hinzufügen</button><button onclick="openTextFormatManager()">Textformate verwalten</button><button onclick="createCustomStylePreset()">＋ Eigenes Textformat</button>';
        const head=d.querySelector('.mobileDrawerSection,.mobileTextLibrary');d.insertBefore(x,head||d.firstChild);
      }
    }
    document.querySelectorAll('.canvasQuickNav button').forEach(x=>x.classList.toggle('active',x===btn));
  };
  function desktopNav(){
    if(!editor()||mobile())return;
    const nav=document.querySelector('.canvasQuickNav'),d=document.getElementById('canvasQuickDrawer');if(!nav||!d)return;
    if(nav.dataset.v122Parity!=='1'){
      nav.dataset.v122Parity='1';nav.classList.add('v122DesktopNav');
      nav.innerHTML=`
        <button data-v122="text" onclick="v122DesktopGroup('textLibrary',this)"><span class="editorNavIcon">Aa</span><span>Text</span></button>
        <button data-v122="elements" onclick="v122DesktopGroup('elements',this)"><span class="editorNavIcon">◇</span><span>Elemente</span></button>
        <button data-v122="templates" onclick="v122DesktopGroup('templates',this)"><span class="editorNavIcon">▧</span><span>Vorlagen</span></button>
        <button data-v122="pages" onclick="v122DesktopGroup('pages',this)"><span class="editorNavIcon">▤</span><span>Seiten</span></button>
        <button data-v122="layers" onclick="v122DesktopGroup('layers',this)"><span class="editorNavIcon">☷</span><span>Ebenen</span></button>`;
    }
    d.classList.add('v122DesktopDrawer','v121DesktopParity','open');
    if(!d.children.length)v122DesktopGroup('elements',nav.querySelector('[data-v122="elements"]'));
  }

  /* Keep parity even when old V102 code rewrites the desktop rail after editor open/resize. */
  /* V178: retired V122 desktop-nav observer/interval removed; V133 owns desktop chrome. */
  setTimeout(desktopNav,120);setTimeout(desktopNav,450);setTimeout(desktopNav,1000);
  window.addEventListener('resize',()=>setTimeout(desktopNav,120));

  /* Rebind scale functions so any button/dropdown uses the same canvas-only transform. */
  window.setCanvasZoom=z=>{const V=vp();if(!V)return;const r=V.getBoundingClientRect();zoomAtClient(z,r.left+V.clientWidth/2,r.top+V.clientHeight/2)};
  window.canvasZoomBy=d=>window.setCanvasZoom(scale()+Number(d||0));
  try{setCanvasZoom=window.setCanvasZoom;canvasZoomBy=window.canvasZoomBy}catch(_){ }

  const eyebrow=document.getElementById('headerEyebrow');if(eyebrow)eyebrow.textContent='VERSION 202';
})();

}