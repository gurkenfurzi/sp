
(function(){
  function markPlanView(){
    var active=document.querySelector('#view-plan.active');
    document.body.classList.toggle('planViewActive',!!active && !document.body.classList.contains('editorMode'));
  }
  function setVersion(){
    var el=document.querySelector('#headerEyebrow');
    if(el)el.textContent='VERSION 203';
  }
  var oldOpenView=window.openView;
  if(typeof oldOpenView==='function'){
    window.openView=function(){
      var r=oldOpenView.apply(this,arguments);
      setTimeout(markPlanView,0);
      setTimeout(setVersion,0);
      return r;
    };
    try{openView=window.openView}catch(_){ }
  }
  window.addEventListener('resize',function(){setTimeout(markPlanView,0)});
  document.addEventListener('click',function(){setTimeout(markPlanView,0)},true);
  [0,200,900,2200].forEach(function(t){setTimeout(function(){markPlanView();setVersion()},t)});
})();
