const fs=require('fs'),vm=require('vm'),assert=require('assert');
const context={window:{},Math};vm.runInNewContext(fs.readFileSync(__dirname+'/math-core.js','utf8'),context);
const m=context.window.StudiaMathV322;
const approx=(s,x,y)=>{const got=m.evaluate(s,x);assert.ok(Math.abs(got-y)<1e-8,`${s} at ${x}: ${got} != ${y}`)};
[
 ['x²',3,9],['x³',-2,-8],['x⁵',2,32],['x⁻²',2,.25],['x^4',2,16],['x^-2',2,.25],
 ['x^(1/2)',9,3],['2^x',3,8],['e^x',0,1],['x^(x+1)',2,8],
 ['2x²+3x-5',2,9],['(x+1)^2',2,9],['x²+x³',2,12],['sqrt(x)',9,3],
 ['x^(2+3)',2,32],['2^(x+1)',2,8],['√(x²+4)',0,2],
 ['(x²+1)/(x³-2)',2,5/6],['x^{2}',3,9],['-x^2',3,-9],['2^3^2',0,512],
 ['2(x+1)',2,6],['(x+1)(x-1)',3,8],['0,5^x',2,.25],['sin(pi/2)',0,1]
].forEach(([s,x,y])=>approx(s,x,y));
assert.ok(Number.isNaN(m.evaluate('sqrt(x)',-1)));
assert.ok(Number.isNaN(m.evaluate('1/x',0)));
for(const s of ['x^','x^()','foo(x)','x+','x**2','x;alert(1)','x^(1/2'])assert.throws(()=>m.validate(s),s);
console.log('PASS: 24 valid expressions and 7 invalid inputs + 2 domain tests');
