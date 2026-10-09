import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function boot(saved=null,fail=false){
 const els=new Map();function el(){return {value:'',hidden:false,disabled:false,textContent:'',files:[],classList:{toggle(){}},children:[],append(x){this.children.push(x)},replaceChildren(){this.children=[]},addEventListener(type,fn){this[type]=fn},click(){}};}
 const document={getElementById(id){if(!els.has(id))els.set(id,el());return els.get(id)},createElement:el,createDocumentFragment:el,body:el()};
 for(const match of fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8').matchAll(/id="([^"]+)"/g))document.getElementById(match[1]);
 let value=saved,queue=Promise.resolve();const storage={getItem(){return value},setItem(k,v){if(fail)throw Error('quota');value=v},removeItem(){value=null}};
 const ctx=vm.createContext({document,localStorage:storage,navigator:{locks:{request(name,fn){const p=queue.then(fn);queue=p.catch(()=>{});return p;}}},crypto:globalThis.crypto,console,Blob,URL,setTimeout,clearTimeout,matchMedia(){return {matches:true}},confirm(){return true},window:{addEventListener(){},print(){}}});
 const core=fs.readFileSync(new URL('../public/core.js',import.meta.url),'utf8').replace(/export /g,'');
 const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8').replace(/^import .*;\n/,'');vm.runInContext(core+'\n'+app,ctx);
 return {els,get value(){return value},event(){return JSON.parse(value)},click(id){return els.get(id).onclick()},change(id){return els.get(id).onchange({target:els.get(id)})},input(id){return els.get(id).input?.()}};
}
async function prepared(){const b=boot();b.els.get('title').value='Rifa';b.els.get('numbers').value='001 005 999';b.click('check');await b.click('confirm');b.els.get('prize').value='Bola';b.input('prize');return b;}
test('interface confirma lista, sorteia e recupera após recarga',async()=>{const b=await prepared();assert.equal(b.event().entries.length,3);await b.click('draw');const e=b.event();assert.equal(e.results.length,1);assert.ok(['001','005','999'].includes(e.results[0].number));const c=boot(b.value);assert.equal(c.els.get('winner').textContent,e.results[0].number);assert.equal(c.els.get('remaining').textContent,'2');});
test('clique simultâneo produz somente uma rodada',async()=>{const b=await prepared();await Promise.all([b.click('draw'),b.click('draw')]);assert.equal(b.event().results.length,1);});
test('falha de armazenamento bloqueia confirmação e resultado',async()=>{const b=boot(null,true);b.els.get('title').value='Rifa';b.els.get('numbers').value='1';b.click('check');await b.click('confirm');assert.equal(b.value,null);assert.equal(b.els.get('draw').disabled,true);assert.match(b.els.get('message').textContent,/salvar/);});
test('lista inválida não pode ser confirmada',async()=>{const b=boot();b.els.get('title').value='Rifa';b.els.get('numbers').value='1 001';b.click('check');await b.click('confirm');assert.equal(b.value,null);});
