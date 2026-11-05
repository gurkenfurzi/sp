/* Studia V322: safe mathematics parser shared by graph preview and formula checks.
   No eval/new Function; this file makes no changes to existing document data. */
(function(global){
'use strict';
const FUNCTIONS={sin:Math.sin,cos:Math.cos,tan:Math.tan,sqrt:Math.sqrt,abs:Math.abs,exp:Math.exp,ln:Math.log,log:Math.log10};
const SUPER={'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','⁻':'-','⁺':'+'};
function clean(value){
 let s=String(value??'').trim().replace(/[\u200b\u00a0]/g,'').replace(/^f\s*\(\s*x\s*\)\s*=/i,'').replace(/^y\s*=/i,'');
 s=s.replace(/\\left|\\right/g,'').replace(/\\cdot|\\times/g,'*').replace(/\\pi\b/g,'pi').replace(/\\sqrt\s*\{([^{}]*)\}/g,'sqrt($1)').replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g,'(($1)/($2))');
 s=s.replace(/[×⋅]/g,'*').replace(/[÷]/g,'/').replace(/−/g,'-').replace(/π/g,'pi').replace(/√\s*\(/g,'sqrt(').replace(/√\s*([a-zA-Z0-9]+)/g,'sqrt($1)');
 s=s.replace(/(\d),(\d)/g,'$1.$2').replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]+/g,m=>'^('+[...m].map(c=>SUPER[c]).join('')+')');
 s=s.replace(/\^\s*\{/g,'^('); // balance corresponding curly closes below
 s=s.replace(/\}/g,')').replace(/\{/g,'(');
 return s;
}
function tokenize(value){
 const s=clean(value).toLowerCase();if(!s)throw Error('Funktion ist leer');
 const result=[];let pos=0;
 while(pos<s.length){
  if(/\s/.test(s[pos])){pos++;continue}
  const m=/^(?:\d+(?:\.\d*)?|\.\d+|[a-z]+|[()+\-*/^,])/.exec(s.slice(pos));
  if(!m)throw Error('Ungültiges Zeichen: '+s[pos]);
  const raw=m[0];result.push({type:/^(?:\d|\.)/.test(raw)?'number':/^[a-z]/.test(raw)?'word':raw,value:raw});pos+=raw.length;
 }
 // Implicit multiplication: 2x, 2(x+1), x(x+1), (x+1)(x-1), 2sin(x)
 const tokens=[];
 for(let i=0;i<result.length;i++){
  const p=result[i-1],c=result[i];
  if(p&&((p.type==='number'||p.type==='word'||p.type===')')&&(c.type==='number'||c.type==='word'||c.type==='('))&&!(p.type==='word'&&FUNCTIONS[p.value]&&c.type==='(')){
   // reject adjacent numeric literals rather than silently multiplying those
   if(!(p.type==='number'&&c.type==='number'))tokens.push({type:'*',value:'*'});
  }
  tokens.push(c);
 }
 return tokens;
}
function parse(expr){
 const ts=tokenize(expr);let i=0;
 const peek=()=>ts[i]?.type;
 const consume=t=>{if(peek()!==t)throw Error('Erwartet: '+t);return ts[i++]};
 function atom(){
  const t=ts[i++];if(!t)throw Error('Die Formel ist noch nicht vollständig');
  if(t.type==='number')return {t:'number',v:Number(t.value)};
  if(t.type==='word'){
   if(t.value==='x')return {t:'x'};
   if(t.value==='pi'||t.value==='e')return {t:'number',v:t.value==='pi'?Math.PI:Math.E};
   if(FUNCTIONS[t.value]){consume('(');const a=sum();consume(')');return {t:'func',f:t.value,a}}
   throw Error('Unbekannte Funktion oder Variable: '+t.value);
  }
  if(t.type==='('){const n=sum();consume(')');return n}
  throw Error('Unerwartetes Zeichen: '+t.value);
 }
 function power(){let a=atom();if(peek()==='^'){i++;a={t:'power',a,b:unary()}}return a} // right associative
 function unary(){if(peek()==='+'){i++;return unary()}if(peek()==='-'){i++;return {t:'neg',a:unary()}}return power()}
 function product(){let a=unary();while(peek()==='*'||peek()==='/'){const op=ts[i++].type;a={t:op,a,b:unary()}}return a}
 function sum(){let a=product();while(peek()==='+'||peek()==='-'){const op=ts[i++].type;a={t:op,a,b:product()}}return a}
 const ast=sum();if(i!==ts.length)throw Error('Unerwartetes Zeichen: '+ts[i].value);return ast;
}
function evaluateAst(n,x){switch(n.t){
 case 'number':return n.v;case 'x':return x;case 'neg':return -evaluateAst(n.a,x);
 case '+':return evaluateAst(n.a,x)+evaluateAst(n.b,x);
 case '-':return evaluateAst(n.a,x)-evaluateAst(n.b,x);
 case '*':return evaluateAst(n.a,x)*evaluateAst(n.b,x);
 case '/':return evaluateAst(n.a,x)/evaluateAst(n.b,x);
 case 'power':return Math.pow(evaluateAst(n.a,x),evaluateAst(n.b,x));
 case 'func':return FUNCTIONS[n.f](evaluateAst(n.a,x));
 default:throw Error('Unbekannter Rechenausdruck');
}}
const cache=new Map();
function compile(s){const canonical=clean(s);if(cache.has(canonical))return cache.get(canonical);const ast=parse(canonical);if(cache.size>180)cache.clear();cache.set(canonical,ast);return ast}
function evaluate(s,x){try{const y=evaluateAst(compile(s),Number(x));return Number.isFinite(y)?y:NaN}catch(_){return NaN}}
const api={clean,parse,compile,evaluate,validate:s=>{compile(s);return true}};
global.StudiaMathV322=api;
})(typeof window!=='undefined'?window:globalThis);
