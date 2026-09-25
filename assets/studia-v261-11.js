
(function(){
 const recover=()=>{if(!document.body.classList.contains('editorMode'))return;const n=document.querySelector('.canvasQuickNav');if(!n)return;n.style.removeProperty('display');n.style.removeProperty('visibility');n.style.removeProperty('opacity');};
 document.addEventListener('click',()=>setTimeout(recover,0),true);
 window.addEventListener('pageshow',recover);
 setTimeout(recover,100);
})();
