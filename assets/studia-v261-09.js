
(function(){
if(window.__STUDIA_V129_INPUT__)return;

  /* V126: disabled because it intercepts shape pointerdown before the real drag proxy. */
  return;
  const inEditor=()=>document.body.classList.contains('editorMode');
  const cp=(ev)=>{
    const st=document.getElementById('canvasStage'); if(!st)return null;
    const r=st.getBoundingClientRect();
    const sc=Number(st.dataset.scale||window.canvasZoom||1)||1;
    return {x:(ev.clientX-r.left)/sc,y:(ev.clientY-r.top)/sc};
  };
  const pointInPoly=(x,y,pts)=>{let inside=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){
    const xi=pts[i][0],yi=pts[i][1],xj=pts[j][0],yj=pts[j][1];
    const hit=((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/((yj-yi)||1e-9)+xi);if(hit)inside=!inside;
  }return inside};
  const segDist=(px,py,x1,y1,x2,y2)=>{const dx=x2-x1,dy=y2-y1,l2=dx*dx+dy*dy;if(!l2)return Math.hypot(px-x1,py-y1);let t=((px-x1)*dx+(py-y1)*dy)/l2;t=Math.max(0,Math.min(1,t));return Math.hypot(px-(x1+t*dx),py-(y1+t*dy))};
  function hitVector(x,y){
    const vs=[...(window.canvasState?.vectors||[])].sort((a,b)=>(b.z||0)-(a.z||0));
    for(const v of vs){
      if(v.locked)continue;
      if(v.type==='rect'&&x>=v.x-8&&x<=v.x+v.w+8&&y>=v.y-8&&y<=v.y+v.h+8)return v;
      if(v.type==='ellipse'){const rx=Math.max(1,v.rx+8),ry=Math.max(1,v.ry+8);if(((x-v.cx)**2)/(rx*rx)+((y-v.cy)**2)/(ry*ry)<=1)return v}
      if(v.type==='triangle'&&v.points?.length>=3&&pointInPoly(x,y,v.points))return v;
      if(v.type==='path'&&v.points?.length){
        if(v.closed&&pointInPoly(x,y,v.points))return v;
        const tol=Math.max(12,(v.strokeWidth||2)+8);for(let i=1;i<v.points.length;i++)if(segDist(x,y,...v.points[i-1],...v.points[i])<=tol)return v;
      }
    }return null;
  }
  let drag=null;
  function move(ev){
    if(!drag||ev.pointerId!==drag.pointerId)return;
    ev.preventDefault();
    const q=cp(ev);if(!q)return;const dx=q.x-drag.start.x,dy=q.y-drag.start.y,v=drag.v,s=drag.snap;
    if(v.type==='rect'){v.x=s.x+dx;v.y=s.y+dy}
    else if(v.type==='ellipse'){v.cx=s.cx+dx;v.cy=s.cy+dy}
    else if(v.points){v.points=s.points.map(pt=>[pt[0]+dx,pt[1]+dy])}
    try{renderVectors();markCanvasDirty(false)}catch(_){}
  }
  function end(ev){
    if(!drag||(ev.pointerId!=null&&ev.pointerId!==drag.pointerId))return;
    drag=null;document.body.classList.remove('v125VectorDragging');
    window.removeEventListener('pointermove',move,true);window.removeEventListener('pointerup',end,true);window.removeEventListener('pointercancel',end,true);
    try{pushHistory()}catch(_){}
  }
  document.addEventListener('pointerdown',function(ev){
    if(innerWidth>=900||!inEditor()||ev.button>0||drag)return;
    const t=ev.target instanceof Element?ev.target:null;if(!t)return;
    if(t.closest('.vectorHandle,.pathNode,.resizeHandle,.rotateHandle,.tableMoveHandle,.canvasQuickNav,#canvasQuickDrawer,.desktopEditorRail,.canvasInspector'))return;
    const stage=t.closest('#canvasStage');if(!stage)return;
    /* Normal HTML objects keep their own established drag code. */
    if(t.closest('.cobj'))return;
    let v=null;
    const direct=t.closest('.vectorTouchProxy,.shapeHit,[data-vid]');
    if(direct?.dataset?.vid)v=window.canvasState?.vectors?.find(x=>x.id===direct.dataset.vid)||null;
    const p=cp(ev);if(!p)return;if(!v)v=hitVector(p.x,p.y);if(!v||v.locked)return;
    ev.preventDefault();ev.stopImmediatePropagation();
    try{selectVector(v.id)}catch(_){window.canvasState.selectedType='vector';window.canvasState.selectedId=v.id}
    drag={pointerId:ev.pointerId,v,start:p,snap:JSON.parse(JSON.stringify(v))};
    document.body.classList.add('v125VectorDragging');
    try{stage.setPointerCapture?.(ev.pointerId)}catch(_){}
    window.addEventListener('pointermove',move,true);window.addEventListener('pointerup',end,true);window.addEventListener('pointercancel',end,true);
  },true);
  /* Remove the V122 blocker at runtime too, so stale/injected style order cannot win. */
  function enforce(){document.querySelectorAll('#canvasObjects .vectorTouchProxy,#canvasObjects .shapeHit').forEach(el=>{el.style.setProperty('pointer-events','all','important');el.style.setProperty('touch-action','none','important')})}
  const oldRV=window.renderVectors;if(typeof oldRV==='function')window.renderVectors=function(){const r=oldRV.apply(this,arguments);enforce();return r};
  setTimeout(()=>{enforce();const e=document.getElementById('headerEyebrow');if(e)e.textContent='VERSION 202'},80);
})();
