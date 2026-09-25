
(()=>{
'use strict';
if(window.__STUDIA_V226_GRAPH_RECOVER__) return; window.__STUDIA_V226_GRAPH_RECOVER__ = true;
const q=(s,r=document)=>r?.querySelector?.(s)||null;
function v226NormText(s){
  const supMap={'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','⁻':'-','⁺':'+'};
  return String(s||'')
    .replace(/\u200b/g,'').replace(/\u00a0/g,' ')
    .replace(/f\(x\)\s*=\s*/ig,'').replace(/^y\s*=\s*/i,'')
    .replace(/[×⋅]/g,'*').replace(/÷/g,'/').replace(/−/g,'-').replace(/π/g,'pi')
    .replace(/(\d),(\d)/g,'$1.$2')
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]+/g,m=>'^('+[...m].map(c=>supMap[c]||c).join('')+')');
}
function v226Need(v,label){
  const s=String(v||'').replace(/\s+/g,'');
  if(!s) throw new Error(label+' ist leer');
  return v;
}
function v226Children(node){return node?[...node.childNodes].map(v226Node).join(''):''}
function v226Node(node){
  if(!node) return '';
  if(node.nodeType===Node.TEXT_NODE) return v226NormText(node.nodeValue);
  if(node.nodeType!==Node.ELEMENT_NODE) return '';
  if(node.tagName==='BR') return '';
  if(node.classList?.contains('vfParenMark')) return '';

  if(node.matches('.vfFrac,.fracExpr')){
    const parts=[...node.children];
    return `((${v226Need(v226Children(parts[0]),'Zähler')})/(${v226Need(v226Children(parts[1]),'Nenner')}))`;
  }
  if(node.matches('.vfRoot,.sqrtExpr')){
    const inside=node.querySelector(':scope > span');
    return `sqrt(${v226Need(v226Children(inside),'Wurzel')})`;
  }
  if(node.matches('.vfFunction')){
    const first=(node.childNodes[0]?.nodeValue||'').trim();
    const fn=(first.match(/(sin|cos|tan)/i)||[])[1]?.toLowerCase()||'sin';
    const inside=node.querySelector(':scope > span');
    return `${fn}(${v226Need(v226Children(inside),fn)})`;
  }
  if(node.matches('.vfAbs')){
    const inside=node.querySelector(':scope > span');
    return `abs(${v226Need(v226Children(inside),'Betrag')})`;
  }
  if(node.matches('.vfExp')){
    const sup=node.querySelector(':scope > sup');
    const e=(sup?.innerText||sup?.textContent||v226Children(sup)||'').trim();
    return `e^(${v226Need(v226NormText(e),'Exponent')})`;
  }
  if(node.matches('.vfPower')){
    const baseEl=node.querySelector(':scope > .vfPowerBase');
    const sup=node.querySelector(':scope > sup');
    let base=(baseEl?.innerText||baseEl?.textContent||v226Children(baseEl)||'').trim();
    let exp=(sup?.innerText||sup?.textContent||v226Children(sup)||'').trim();
    const total=(node.innerText||node.textContent||'').trim();
    if(!exp){
      let rest=String(total||'');
      if(base && rest.startsWith(base)) rest=rest.slice(base.length);
      rest=rest.replace(/^\^+/,'').trim();
      if(rest) exp=rest;
    }
    if(!base && total){
      if(exp && typeof total.endsWith==='function' && total.endsWith(exp)) base=total.slice(0,total.length-exp.length).replace(/\^+$/,'').trim();
      else base=total.trim();
    }
    base=v226NormText(base); exp=v226NormText(exp);
    return `(${v226Need(base,'Basis')})^(${v226Need(exp,'Exponent')})`;
  }
  if(node.tagName==='SUP'){
    const e=(node.innerText||node.textContent||v226Children(node)||'').trim();
    return `^(${v226Need(v226NormText(e),'Exponent')})`;
  }
  if(node.tagName==='SUB') return '';
  if(node.matches('.vfParen')){
    const body=node.querySelector(':scope > .vfParenBody')||node.querySelector(':scope > .vfEditable');
    if(body) return `(${v226Need(v226Children(body),'Klammer')})`;
  }
  return v226Children(node);
}
function v226FormulaToGraphExprLoose(ed){
  if(!ed) throw new Error('Formeleditor nicht gefunden');
  let expr=v226Children(ed).replace(/\s+/g,'');
  expr=expr.replace(/^f\(x\)=/i,'').replace(/^y=/i,'');
  expr=expr.replace(/\)\(/g,')*(').replace(/(\d|x|\))(?=sqrt\()/gi,'$1*');
  if(!expr) throw new Error('Funktion ist leer');
  return expr;
}
window.v226FormulaToGraphExprLoose=v226FormulaToGraphExprLoose;

const prevSave=window.v224SaveGraphFormula;
window.v224SaveGraphFormula=function(i){
  const ed=q('#formulaVisualEditor'); if(!ed) return;
  let expr='';
  try{
    expr=window.v224FormulaToGraphExpr(ed);
    if(typeof window.normalizeGraphExpr==='function') window.normalizeGraphExpr(expr);
  }catch(err){
    try{
      expr=v226FormulaToGraphExprLoose(ed);
      if(typeof window.normalizeGraphExpr==='function') window.normalizeGraphExpr(expr);
    }catch(err2){
      let msg=String(err2?.message || err?.message || 'Ungültige Funktion');
      if(/Unexpected token|Unexpected end|missing/i.test(msg)) msg='Exponent, Bruch oder Klammer ist noch nicht vollständig';
      try{ cuteToast('Formel prüfen: '+msg); }catch(_){ }
      return;
    }
  }
  const draft=(typeof graphDraft!=='undefined' ? graphDraft : window.graphDraft);
  const curve=draft?.curves?.[i]; if(!curve) return;
  curve.expr=expr;
  curve.formulaHTML=ed.innerHTML;
  try{ cuteToast('Funktion übernommen ♡'); }catch(_){ }
  window.v224ReturnToGraph?.();
};
window.saveGraphFunctionEditor=function(i){ return window.v224SaveGraphFormula(i); };
try{ saveGraphFunctionEditor=window.saveGraphFunctionEditor; }catch(_){ }

const setVer=()=>{ const e=q('#headerEyebrow'); if(e) e.textContent='VERSION 226'; };
[0,250,900,1800].forEach(t=>setTimeout(setVer,t));
})();
