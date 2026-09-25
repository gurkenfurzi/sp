
(()=>{
 const active=()=>false; /* V183 desktop repair owns laptop interaction; disable V182 recovery layer. */
 function revive(){if(!active())return;window.__STUDIA_V180_DESKTOP__=innerWidth>=900;document.getElementById('v181SelectionOverlay')?.remove();try{window.v132SyncHits?.();window.v138RefreshHandles?.()}catch(_){}const eye=document.getElementById('headerEyebrow');if(eye)eye.textContent='VERSION 202'}
 const oldSheet=window.renderSheetEditor;if(typeof oldSheet==='function')window.renderSheetEditor=function(){const r=oldSheet.apply(this,arguments);requestAnimationFrame(()=>requestAnimationFrame(revive));return r};
 const oldOpen=window.openStudySheetEditor;if(typeof oldOpen==='function')window.openStudySheetEditor=function(){const r=oldOpen.apply(this,arguments);setTimeout(revive,120);return r};
 window.addEventListener('resize',()=>setTimeout(revive,60));setTimeout(revive,1000);
})();
