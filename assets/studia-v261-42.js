
(function(){
  'use strict';
  var dirtyTimer=0,lastLocalMutation=0,lastCloudKick=0,lastPlanAttempt=0,planBusy=false;

  function setVersion(){var e=document.querySelector('#headerEyebrow');if(e)e.textContent='VERSION 205'}
  function markPlanView(){
    var active=document.querySelector('#view-plan.active');
    document.body.classList.toggle('planViewActive',!!active&&!document.body.classList.contains('editorMode'));
  }
  function markCloudDirty(){
    lastLocalMutation=Date.now();
    clearTimeout(dirtyTimer);
    dirtyTimer=setTimeout(function(){
      try{ if(typeof window.v150MarkDirty==='function')window.v150MarkDirty(25); }catch(_){ }
    },65);
  }

  // Every normal Studia save now participates in account sync. This closes the
  // gaps where localStorage changed but the cloud dirty flag was never set.
  function wrapMutationFunction(name){
    var fn=window[name];
    if(typeof fn!=='function'||fn.__v205SyncWrapped)return false;
    function wrapped(){
      var out=fn.apply(this,arguments);
      markCloudDirty();
      return out;
    }
    wrapped.__v205SyncWrapped=true;wrapped.__v205Original=fn;
    window[name]=wrapped;
    try{ if(name==='save')save=wrapped; }catch(_){ }
    try{ if(name==='saveCanvasSheetCore')saveCanvasSheetCore=wrapped; }catch(_){ }
    return true;
  }
  function installSyncHooks(){
    wrapMutationFunction('save');
    wrapMutationFunction('saveCanvasSheetCore');
  }

  // Use the existing safe account-sync controller for pulls/reconciliation.
  // It is throttled so opening/focusing the app is instant without hammering
  // the Apps Script backend.
  function cloudKick(force){ return; }

  function planNeedsRefresh(){
    var tt=window.data&&window.data.timetable;
    if(!tt)return false;
    if(tt.isPlaceholder||!(tt.lessons||[]).length)return true;
    var fetched=Number(tt.lastLiveCheck||tt.fetchedAt||0);
    return !fetched||Date.now()-fetched>15*60*1000;
  }
  function maybeRefreshPlan(){
    if(planBusy||!navigator.onLine||!document.querySelector('#view-plan.active'))return;
    var now=Date.now();
    if(now-lastPlanAttempt<5*60*1000||!planNeedsRefresh())return;
    if(typeof window.loadRemotePlan!=='function')return;
    lastPlanAttempt=now;planBusy=true;
    Promise.resolve(window.loadRemotePlan(false)).catch(function(){}).finally(function(){planBusy=false});
  }

  var previousOpen=window.openView;
  if(typeof previousOpen==='function'){
    window.openView=function(name){
      var out=previousOpen.apply(this,arguments);
      setTimeout(function(){markPlanView();setVersion();installSyncHooks();if(name==='plan')maybeRefreshPlan()},0);
      return out;
    };
    try{openView=window.openView}catch(_){ }
  }

  // Close the tiny options popover after clicking elsewhere.
  document.addEventListener('click',function(ev){
    var d=document.getElementById('planTools');
    if(d&&d.open&&!d.contains(ev.target))d.open=false;
  },true);

  window.addEventListener('online',function(){setTimeout(function(){maybeRefreshPlan()},120)});
  window.addEventListener('pageshow',function(){setTimeout(function(){installSyncHooks();maybeRefreshPlan()},220)});
  window.addEventListener('focus',function(){setTimeout(function(){maybeRefreshPlan()},180)});
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')setTimeout(function(){maybeRefreshPlan()},180)});
  window.addEventListener('resize',function(){setTimeout(markPlanView,0)});

  // Regular foreground reconciliation. Local edits are pushed immediately by
  // v150MarkDirty; this interval mainly notices edits made on another device.
  setInterval(function(){installSyncHooks()},8000);

  [0,180,700,1800,4200].forEach(function(t){setTimeout(function(){installSyncHooks();markPlanView();setVersion()},t)});
  /* V248: no automatic cloud sync on startup */
})();
