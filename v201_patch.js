
(()=>{
  const dayOrder=window.dayOrder||['Mo','Di','Mi','Do','Fr'];
  const dayNames=window.dayNames||{Mo:'Montag',Di:'Dienstag',Mi:'Mittwoch',Do:'Donnerstag',Fr:'Freitag'};
  const $=s=>document.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':'&quot;',"'":'&#039;'}[m]));
  const planDesktopMode=()=>window.innerWidth>=980&&!!document.querySelector('#view-plan.active');
  const toMin=t=>{const m=String(t||'').match(/^(\d{1,2}):(\d{2})$/);return m?Number(m[1])*60+Number(m[2]):-1};
  const currentDay=()=>typeof window.dayCode==='function'?window.dayCode(new Date()):null;
  const getPlanMode=()=>document.querySelector('#planModeSwitch button.active')?.dataset.planmode==='basis'?'basis':'current';
  const appData=()=>{try{return JSON.parse(localStorage.getItem('schoolhub-v1')||'{}')}catch(_){return {}}};
  const nowMin=()=>{const d=new Date();return d.getHours()*60+d.getMinutes()};
  function subjectMatch(a,b){
    const pa=window.splitCell?window.splitCell(String(a?.raw||'')):{subject:''};
    const pb=window.splitCell?window.splitCell(String(b?.raw||'')):{subject:''};
    const sa=String(window.prettySubject?window.prettySubject(pa.subject):pa.subject||'').replace(/\s+/g,' ').trim().toUpperCase();
    const sb=String(window.prettySubject?window.prettySubject(pb.subject):pb.subject||'').replace(/\s+/g,' ').trim().toUpperCase();
    if(!sa||!sb||sa!==sb)return false;
    const ta=String(pa.teacherCode||pa.meta||'').replace(/\s+/g,' ').trim().toUpperCase();
    const tb=String(pb.teacherCode||pb.meta||'').replace(/\s+/g,' ').trim().toUpperCase();
    const ra=String(pa.room||'').trim().toUpperCase();
    const rb=String(pb.room||'').trim().toUpperCase();
    const teacherOk=!ta||!tb||ta===tb;
    const roomOk=!ra||!rb||ra===rb;
    return teacherOk&&roomOk;
  }
  function isCurrentLessonItem(l){
    if(!l||l.specialOnly)return false;
    const day=currentDay();
    if(!day||String(l.day)!==day)return false;
    const start=toMin(l.start),end=toMin(l.end),now=nowMin();
    return start>=0&&end>start&&now>=start&&now<end;
  }
  const oldMerge=window.mergeLessons||globalThis.mergeLessons;
  function patchedMergeLessons(ls){
    const sorted=[...(ls||[])].sort((a,b)=>{
      const d=dayOrder.indexOf(a.day)-dayOrder.indexOf(b.day);
      return d||String(a.start||'').localeCompare(String(b.start||''));
    });
    const out=[];
    for(const x of sorted){
      const item={...x,blocks:x.blocks||1};
      const p=window.splitCell?window.splitCell(item.raw):{special:false};
      const last=out[out.length-1];
      if(last&&last.day===item.day){
        const q=window.splitCell?window.splitCell(last.raw):{special:false};
        const separated=typeof window.breakBetween==='function'?window.breakBetween(last.end,item.start):false;
        if(!separated&&last.end===item.start){
          const exactRaw=String(last.raw||'').trim()===String(item.raw||'').trim();
          if(!p.special&&!q.special&&(subjectMatch(last,item)||exactRaw)){
            last.end=item.end;
            last.blocks=(last.blocks||1)+(item.blocks||1);
            last.isDouble=last.blocks>=2;
            if(last.rowNum==null&&item.rowNum!=null)last.rowNum=item.rowNum;
            continue;
          }
        }
      }
      out.push(item);
    }
    return out;
  }
  window.mergeLessons=patchedMergeLessons;
  try{mergeLessons=patchedMergeLessons}catch(_){ }

  const oldLessonHtml=window.lessonHtml||globalThis.lessonHtml;
  function patchedLessonHtml(l){
    let html=oldLessonHtml?oldLessonHtml(l):'';
    if(isCurrentLessonItem(l)&&/^<div class="lesson\b/.test(html))html=html.replace('class="lesson','class="lesson currentLesson');
    return html;
  }
  window.lessonHtml=patchedLessonHtml;
  try{lessonHtml=patchedLessonHtml}catch(_){ }

  function dayHtml(day){
    const selectedClass=appData()?.timetable?.selectedClass||appData()?.settings?.className||'M U1';
    const mode=getPlanMode();
    const viewLessons=(mode==='basis'&&typeof window.basisScheduleForClass==='function')
      ? window.basisScheduleForClass(selectedClass)
      : (typeof window.currentScheduleForClass==='function'?window.currentScheduleForClass(selectedClass):[]);
    const rawDay=(typeof window.stableTimetableDay==='function'&&typeof window.applyEffectiveDisplayTimes==='function')
      ? window.stableTimetableDay(window.applyEffectiveDisplayTimes((viewLessons||[]).filter(x=>x.day===day)))
      : [];
    const specialOnly=rawDay.filter(x=>x.specialOnly),normal=rawDay.filter(x=>!x.specialOnly);
    if(specialOnly.length && !normal.length){
      return specialOnly.map(x=>{
        const raw=typeof window.cleanPdfCellText==='function'?window.cleanPdfCellText(x.raw):String(x.raw||'');
        const tm=raw.match(/^(\d{1,2}(?::\d{2})?\s*Uhr)\s*(.*)$/i);
        const time=tm?tm[1]:'';
        let text=tm?tm[2]:raw;
        text=text.replace(/Klassenleitungs-\s*stunden/ig,'Klassenleitungsstunden').replace(/Klassenleitungs\s+stunden/ig,'Klassenleitungsstunden');
        return `<div class="specialOnlyDay"><div class="specialOnlyCard">${time?`<div class="specialTime">${esc(time)}</div>`:''}<div class="specialText">${esc(text)}</div></div></div>`;
      }).join('');
    }
    const filtered=rawDay.filter(x=>getPlanMode()==='basis'?!x.cancelledFromBasis:true);
    const ls=patchedMergeLessons(filtered);
    return ls.length?(typeof window.renderLessonsWithPauses==='function'?window.renderLessonsWithPauses(ls):''):'<div class="empty">Kein Unterricht.</div>';
  }
  function renderWeekGrid(){
    const today=currentDay();
    return `<div class="v201WeekGrid">${dayOrder.map(d=>`<section class="v201WeekDay ${d===today?'isToday':''}"><div class="v201WeekHead"><div><b>${esc(dayNames[d]||d)}</b><small>${d===today?'Heute':' '}</small></div><span class="v201WeekChip">${d}</span></div><div class="v201WeekBody">${dayHtml(d)}</div></section>`).join('')}</div>`;
  }
  function syncPlanDesktopClass(){
    document.body.classList.toggle('v201PlanDesktop',planDesktopMode());
  }
  const originalRenderPlan=window.renderPlan||globalThis.renderPlan;
  function patchedRenderPlan(){
    syncPlanDesktopClass();
    const basisSavedText=appData()?.timetable?.basisSavedAt
      ? ` · gespeichert ${new Date(appData().timetable.basisSavedAt).toLocaleDateString('de-DE')}`
      : '';
    const status=$('#planStatus');
    if(status)status.textContent=appData()?.timetable?.isPlaceholder
      ? 'Automatischer Stundenplan wird vorbereitet.'
      : getPlanMode()==='basis'
        ? `Basisplan · regulärer Normalplan${basisSavedText}${window.isHeatScheduleActive?.()?' · ☀️ Hitzestunden':''}.`
        : `Aktueller Plan & Änderungen${appData()?.timetable?.sourceLabel?' · '+appData().timetable.sourceLabel:''}${window.isHeatScheduleActive?.()?' · ☀️ Hitzestunden aktiv':''}.`;
    const placeholder=$('#placeholderBanner');
    if(placeholder)placeholder.style.display=appData()?.timetable?.isPlaceholder?'block':'none';
    const picker=$('#planClassPicker');
    if(picker){
      const classes=appData()?.timetable?.classes||[];
      picker.innerHTML=classes.length
        ? classes.map(c=>`<option value="${esc(c)}" ${c===appData()?.timetable?.selectedClass?'selected':''}>${esc(c)}</option>`).join('')
        : `<option>${esc(appData()?.settings?.className||'M U1')}</option>`;
    }
    const tabs=$('#dayTabs');
    if(tabs){
      tabs.innerHTML=dayOrder.map(d=>`<button class="tab ${d===currentDay()?'active':''}" data-day="${d}">${dayNames[d]}</button>`).join('');
    }
    document.querySelectorAll('#planModeSwitch button').forEach(x=>x.classList.toggle('active',x.dataset.planmode===getPlanMode()));
    window.updateHeatModeUI?.();
    const hint=$('#planModeHint');
    if(hint)hint.dataset.mode=getPlanMode();
    const lessonsWrap=$('#planLessons');
    if(!lessonsWrap)return;
    if(planDesktopMode()){
      lessonsWrap.innerHTML=renderWeekGrid();
      return;
    }
    if(originalRenderPlan){
      const previousClass=document.body.classList.contains('v201PlanDesktop');
      if(previousClass)document.body.classList.remove('v201PlanDesktop');
      return originalRenderPlan();
    }
  }
  window.renderPlan=patchedRenderPlan;
  try{renderPlan=patchedRenderPlan}catch(_){ }

  const oldOpenView=window.openView;
  if(typeof oldOpenView==='function'){
    window.openView=function(){
      const r=oldOpenView.apply(this,arguments);
      setTimeout(syncPlanDesktopClass,0);
      return r;
    };
    try{openView=window.openView}catch(_){ }
  }
  window.addEventListener('resize',()=>setTimeout(()=>{syncPlanDesktopClass();if(document.querySelector('#view-plan.active'))window.renderPlan?.()},80));

  /* Stronger automatic device sync without changing the whole account flow. */
  if(!window.__V201_SYNC_PATCH__){
    window.__V201_SYNC_PATCH__=true;
    const oldSave=window.save;
    if(typeof oldSave==='function'){
      window.save=function(){
        const r=oldSave.apply(this,arguments);
        try{window.v150MarkDirty?.(60)}catch(_){}
        setTimeout(()=>{try{window.v150Push?.()}catch(_){}},220);
        return r;
      };
      try{save=window.save}catch(_){ }
    }
    let syncTick=null;
    const startTick=()=>{
      if(syncTick)clearInterval(syncTick);
      syncTick=setInterval(()=>{
        if(document.visibilityState!=='visible' || navigator.onLine===false)return;
        try{window.v150Push?.();window.v150Pull?.(false)}catch(_){ }
      },4000);
    };
    startTick();
    window.addEventListener('focus',()=>setTimeout(()=>{try{window.v150Pull?.(true)}catch(_){}},180));
    document.addEventListener('visibilitychange',()=>{
      if(document.visibilityState==='visible')setTimeout(()=>{try{window.v150Pull?.(true)}catch(_){}},180);
      else setTimeout(()=>{try{window.v150Push?.()}catch(_){}},0);
    });
  }

  setTimeout(()=>{syncPlanDesktopClass();if(document.querySelector('#view-plan.active'))window.renderPlan?.()},120);
})();
