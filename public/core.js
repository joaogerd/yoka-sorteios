export const VERSION='1.0.0';
export const KEY='yoka-sorteios:event:v1';
const MAX=50000;
function text(v,label,max=200){if(typeof v!=='string'||!v.trim()||v.length>max)throw Error(`${label} inválido.`);return v.trim();}
export function validateEntries(entries){
 if(!Array.isArray(entries)||!entries.length||entries.length>MAX)throw Error('Informe entre 1 e 50.000 números vendidos.');
 const seen=new Set();return entries.map((e,i)=>{
 if(!e||typeof e.number!=='string'||!/^\d{1,9}$/.test(e.number))throw Error(`Número inválido na linha ${i+1}. Use até 9 algarismos.`);
 if(typeof e.name!=='string'||e.name.length>200)throw Error(`Nome inválido na linha ${i+1}.`);
 const id=String(Number(e.number));if(seen.has(id))throw Error(`Número duplicado: ${e.number}. Confira também os zeros à esquerda.`);seen.add(id);
 return {number:e.number,name:e.name.trim()};});
}
export function parseList(value){return validateEntries(value.trim().split(/[\s,;]+/).filter(Boolean).map(number=>({number,name:''})));}
function csvRows(input,delimiter){
 let rows=[],row=[],field='',quoted=false,closed=false;
 for(let i=0;i<input.length;i++){
 const c=input[i];
 if(quoted){if(c==='"'){if(input[i+1]==='"'){field+='"';i++;}else{quoted=false;closed=true;}}else field+=c;continue;}
 if(c==='"'){if(field||closed)throw Error('Aspas inválidas no CSV.');quoted=true;continue;}
 if(c===delimiter){row.push(field);field='';closed=false;continue;}
 if(c==='\n'||c==='\r'){if(c==='\r'&&input[i+1]==='\n')i++;row.push(field);if(row.some(x=>x.trim()))rows.push(row);row=[];field='';closed=false;continue;}
 if(closed){if(c===' '||c==='\t')continue;throw Error('Conteúdo após aspas no CSV.');}field+=c;
 }
 if(quoted)throw Error('Aspas não fechadas no CSV.');row.push(field);if(row.some(x=>x.trim()))rows.push(row);return rows;
}
export function parseCSV(input){
 input=input.replace(/^\ufeff/,'');const first=input.split(/\r?\n/)[0];const rows=csvRows(input,first.includes(';')?';':',');
 if(!rows.length)throw Error('CSV vazio.');const header=rows.shift().map(x=>x.trim().toLowerCase());
 const ni=header.indexOf('numero'),namei=header.indexOf('nome');
 if(ni<0||header.length>2||new Set(header).size!==header.length||header.some(x=>!['numero','nome'].includes(x)))throw Error('O CSV precisa das colunas numero e, opcionalmente, nome.');
 return validateEntries(rows.map((row,i)=>{if(row.length!==header.length)throw Error(`Quantidade de colunas inválida na linha ${i+2}.`);return {number:row[ni].trim(),name:namei<0?'':row[namei].trim()};}));
}
export function randomIndex(size,next=()=>{const a=new Uint32Array(1);globalThis.crypto.getRandomValues(a);return a[0];}){
 if(!Number.isSafeInteger(size)||size<1||size>MAX)throw Error('Lista vazia ou tamanho inválido.');
 const limit=Math.floor(4294967296/size)*size;let v;do{v=next();if(!Number.isInteger(v)||v<0||v>4294967295)throw Error('Fonte aleatória inválida.');}while(v>=limit);return v%size;
}
export function createEvent(title,entries){return {version:VERSION,id:globalThis.crypto.randomUUID(),title:text(title,'Título'),createdAt:new Date().toISOString(),entries:validateEntries(entries),results:[]};}
export function validateEvent(e){
 if(!e||e.version!==VERSION||typeof e.id!=='string'||!e.id||e.id.length>100||typeof e.createdAt!=='string'||!Number.isFinite(Date.parse(e.createdAt))||!Array.isArray(e.results))throw Error('Backup incompatível ou inválido.');
 const entries=validateEntries(e.entries),title=text(e.title,'Título');const seen=new Set();
 const results=e.results.map(r=>{if(!r||typeof r.number!=='string'||typeof r.at!=='string'||!Number.isFinite(Date.parse(r.at)))throw Error('Resultado inválido.');const entry=entries.find(x=>x.number===r.number);if(!entry||seen.has(r.number)||r.name!==entry.name)throw Error('Vencedor inválido ou repetido.');seen.add(r.number);return {...entry,prize:text(r.prize,'Prêmio'),at:r.at};});
 return {version:VERSION,id:e.id,title,createdAt:e.createdAt,entries,results};
}
export function drawEvent(event,prize,next){const e=validateEvent(event);prize=text(prize,'Prêmio');const won=new Set(e.results.map(x=>x.number)),available=e.entries.filter(x=>!won.has(x.number));if(!available.length)throw Error('Números esgotados.');const winner=available[randomIndex(available.length,next)];return {...e,results:[...e.results,{...winner,prize,at:new Date().toISOString()}]};}
export function persist(storage,event){const valid=validateEvent(event);try{storage.setItem(KEY,JSON.stringify(valid));}catch{throw Error('Não foi possível salvar neste navegador. Libere espaço ou permita o armazenamento antes de sortear.');}return valid;}
