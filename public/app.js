import {KEY,parseList,parseCSV,createEvent,drawEvent,validateEvent,persist} from './core.js';
const $=id=>document.getElementById(id);let event=null,review=null,imported=null,busy=false,blocked=false,pending=false;
function notice(message,success=false){$('message').textContent=message;$('message').classList.toggle('success',success);$('message').hidden=false;}
function read(){const raw=localStorage.getItem(KEY);return raw?validateEvent(JSON.parse(raw)):null;}
function same(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function add(parent,tag,content,className=''){const el=document.createElement(tag);el.textContent=content;if(className)el.className=className;parent.append(el);return el;}
function showEntries(entries){$('entries').replaceChildren();const fragment=document.createDocumentFragment();for(const e of entries){const row=add(fragment,'div','','entry');add(row,'b',e.number);add(row,'span',e.name||'Número vendido');}$('entries').append(fragment);$('review-count').textContent=`${entries.length.toLocaleString('pt-BR')} números vendidos`;$('review').hidden=false;}
function render(){
 document.body.classList.toggle('locked',!!event);document.body.classList.toggle('busy',busy);const count=event?.entries.length||0,results=event?.results||[];
 $('total').textContent=count.toLocaleString('pt-BR');$('drawn').textContent=results.length;$('remaining').textContent=(count-results.length).toLocaleString('pt-BR');$('event-title').textContent=event?.title||'Yoka Sorteios';$('print-title').textContent=event?.title||'';
 $('status').textContent=busy?'SORTEIO EM ANDAMENTO':event?(count===results.length?'RIFA CONCLUÍDA':'LISTA CONFIRMADA'):'AGUARDANDO A LISTA';
 $('draw').disabled=!event||busy||blocked||results.length>=count||!$('prize').value.trim();$('prize').disabled=busy||blocked;
 for(const id of ['export','instagram'])$(id).disabled=!event||busy||blocked;
 $('reset').disabled=busy||blocked;$('backup').disabled=busy||blocked;$('csv').disabled=!!event||blocked;$('check').disabled=blocked;$('confirm').disabled=busy||blocked;
 if(event)showEntries(event.entries);else if(review)showEntries(review);else $('review').hidden=true;
 const last=results.at(-1);if(!busy){$('winner').textContent=last?.number||'—';$('winner').classList.toggle('long-number',(last?.number.length||0)>6);$('winner-label').textContent=last?'NÚMERO VENCEDOR':'SEU PRÓXIMO NÚMERO DA SORTE';$('winner-name').textContent=last?`${last.name||'Número vendido'} · ${last.prize}`:'O sorteio começa com uma lista confirmada.';}
 $('results').replaceChildren();if(!results.length)add($('results'),'p','Os vencedores aparecerão aqui após cada rodada.','empty');
 (busy?results.slice(0,-1):results).forEach((r,i)=>{const row=add($('results'),'div','','result');add(row,'span',`${String(i+1).padStart(2,'0')}º`,'ordinal');add(row,'strong',r.number);const info=add(row,'div','');add(info,'b',r.prize);add(info,'small',r.name||'Número vendido');add(row,'time',new Date(r.at).toLocaleString('pt-BR'));});
 $('draw-hint').textContent=event&&count===results.length?'Todos os números já foram sorteados.':'Somente os números vendidos participam.';
}
async function guarded(action){if(busy||blocked||pending)return;pending=true;try{
 if(!navigator.locks)throw Error('Use Chrome, Edge ou Firefox atualizado para realizar o sorteio com proteção entre abas.');
 await navigator.locks.request('yoka-sorteios-event',async()=>{const current=read();if(!same(current,event)){event=current;render();throw Error('A rifa mudou em outra aba. Confira a lista e o resultado atualizado antes de continuar.');}await action();});
 }catch(e){notice(e.message);}finally{pending=false;render();}}
function download(){if(!event)throw Error('Não há rifa para exportar.');const blob=new Blob([JSON.stringify(event,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`yoka-rifa-${event.id}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('numbers').addEventListener('input',()=>{review=null;imported=null;render();});
$('prize').addEventListener('input',render);
$('check').onclick=()=>{try{review=imported||parseList($('numbers').value);showEntries(review);notice('Confira a lista abaixo. Números ausentes não participarão.',true);}catch(e){review=null;render();notice(e.message);}};
$('csv').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>5e6)throw Error('CSV muito grande. Limite: 5 MB.');imported=parseCSV(await file.text());review=imported;$('numbers').value=imported.map(x=>x.number).join(', ');render();notice('CSV carregado. Confira os números e os nomes antes de confirmar.',true);}catch(e){notice(e.message);}finally{$('csv').value='';}};
$('confirm').onclick=()=>guarded(()=>{if(event)throw Error('Esta rifa já foi confirmada.');if(!review)throw Error('Confira os números antes de confirmar.');const next=createEvent($('title').value,review);if(!confirm(`Confirmar ${next.entries.length} números vendidos? A lista ficará bloqueada para esta rifa.`))return;event=persist(localStorage,next);notice('Lista confirmada. Informe o prêmio e faça o sorteio.',true);});
$('draw').onclick=()=>guarded(async()=>{
 if(!event)throw Error('Confirme a lista primeiro.');const next=drawEvent(event,$('prize').value);event=persist(localStorage,next);busy=true;render();$('message').hidden=true;$('winner-label').textContent='A SORTE ESTÁ EM QUADRA';$('winner').textContent='•••';$('winner-name').textContent='Preparando a revelação…';
 // Resultado salvo antes da apresentação. Nenhum novo sorteio ocorre na animação.
 $('winner').classList.remove('reveal');
 if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
  const won=new Set(next.results.slice(0,-1).map(r=>r.number));
  const candidates=next.entries.filter(e=>!won.has(e.number));
  let interval=50,previous=-1;
  $('winner').setAttribute('aria-live','off');
  for(let frame=0;frame<42;frame++){
   // Aleatoriedade exclusivamente visual; o vencedor já está salvo.
   let index=Math.floor(Math.random()*candidates.length);
   if(candidates.length>1&&index===previous)index=(index+1)%candidates.length;
   previous=index;
   $('winner').textContent=candidates[index].number;
   $('winner').classList.toggle('long-number',candidates[index].number.length>6);
   $('winner').classList.remove('rolling');void $('winner').offsetWidth;$('winner').classList.add('rolling');
   $('winner-label').textContent=frame<25?'A SORTE ESTÁ EM QUADRA':'E O NÚMERO VENCEDOR É…';
   $('winner-name').textContent='Os números estão na disputa…';
   await new Promise(resolve=>setTimeout(resolve,interval));
   if(frame>=25)interval=Math.min(350,interval*1.15);
  }
 }
 busy=false;$('winner').classList.remove('rolling');render();$('winner').setAttribute('aria-live','polite');
 void $('winner').offsetWidth;$('winner').classList.add('reveal');notice('Resultado registrado. Baixe o comprovante para guardar esta rodada.',true);
});
$('export').onclick=()=>{try{download();notice('Comprovante preparado para download. Confira a pasta de downloads.',true);}catch(e){notice(e.message);}};
$('instagram').onclick=async()=>{
 if(busy||!event?.results.length){notice('Faça pelo menos um sorteio antes de gerar a imagem.');return;}
 const snapshot=validateEvent(event);$('instagram').disabled=true;
 try{
  const logo=new Image();logo.src='yoka-logo.png';await logo.decode();
  const pages=Math.ceil(snapshot.results.length/4);
  function lines(ctx,value,width){
   const output=[];let line='';
   for(const char of value){if(ctx.measureText(line+char).width>width&&line){output.push(line.trim());line='';}line+=char;}
   if(line)output.push(line.trim());return output;
  }
  function fit(ctx,value,width,maxLines,start){
   let size=start,list;
   do{ctx.font='600 '+size+'px system-ui, sans-serif';list=lines(ctx,value,width);if(list.length<=maxLines)break;size--;}while(size>10);
   return {list,size};
  }
  for(let page=0;page<pages;page++){
   const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;
   const c=canvas.getContext('2d');if(!c)throw Error('Este navegador não permite gerar a imagem.');
   c.fillStyle='#0b1c33';c.fillRect(0,0,1080,1350);
   c.fillStyle='#bf241b';c.fillRect(0,0,1080,16);
   c.drawImage(logo,65,48,154,154);
   c.fillStyle='#fff';c.font='800 46px system-ui, sans-serif';c.fillText('YOKA SORTEIOS',254,113);
   c.fillStyle='#b0c2d7';c.font='500 22px system-ui, sans-serif';c.fillText('GUARATINGUETÁ · FUTSAL',256,154);
   c.fillStyle='#fff';c.font='800 44px system-ui, sans-serif';c.fillText('RESULTADOS DA RIFA',65,257);
   const title=fit(c,snapshot.title,950,2,28);c.fillStyle='#b0c2d7';
   title.list.forEach((line,i)=>c.fillText(line,65,298+i*title.size*1.2));
   snapshot.results.slice(page*4,page*4+4).forEach((r,index)=>{
    const y=355+index*215;c.fillStyle='#173653';c.fillRect(65,y,950,195);c.fillStyle='#bf241b';c.fillRect(65,y,6,195);
    c.fillStyle='#b0c2d7';c.font='600 18px system-ui, sans-serif';c.fillText(String(page*4+index+1)+'º SORTEADO',92,y+35);
    c.fillStyle='#fff';c.font='800 '+(r.number.length>6?30:48)+'px system-ui, sans-serif';c.fillText(r.number,92,y+103);
    const prize=fit(c,r.prize,650,3,28);c.fillStyle='#fff';prize.list.forEach((line,i)=>c.fillText(line,340,y+38+i*prize.size*1.18));
    const name=fit(c,r.name||'Número vendido',650,3,23);c.fillStyle='#b0c2d7';name.list.forEach((line,i)=>c.fillText(line,340,y+126+i*name.size*1.12));
   });
   c.fillStyle='#bf241b';c.fillRect(65,1240,950,3);c.fillStyle='#b0c2d7';c.font='500 21px system-ui, sans-serif';c.fillText('Juntos pelo esporte.',65,1291);
   c.textAlign='right';c.fillText(pages>1?'Página '+(page+1)+' de '+pages:'YOKA GUARATINGUETÁ',1015,1291);
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('Não foi possível gerar o PNG.');
   const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='yoka-resultados-'+snapshot.id+'-'+(page+1)+'.png';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  notice(pages+' imagem(ns) PNG preparada(s) em 1080 × 1350. Confira os downloads; o navegador pode pedir autorização para baixar várias imagens.',true);
 }catch(e){notice(e.message);}finally{render();}
};
$('reset').onclick=()=>guarded(()=>{if(event){if(!confirm('Abrir uma nova rifa? O comprovante da rifa atual será baixado antes de apagar os dados deste navegador.'))return;download();localStorage.removeItem(KEY);}event=null;review=null;imported=null;$('title').value='';$('numbers').value='';$('prize').value='';notice('Nova rifa pronta para cadastro.',true);});
$('backup').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>10e6)throw Error('Comprovante muito grande. Limite: 10 MB.');const next=validateEvent(JSON.parse(await file.text()));await guarded(()=>{if(event){if(!confirm('Substituir a rifa atual? O comprovante atual será baixado antes da substituição.'))return;download();}event=persist(localStorage,next);review=null;imported=null;notice('Comprovante restaurado. Confira a lista e o histórico.',true);});}catch(e){notice(e.message);}finally{$('backup').value='';}};
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{notice('Tela cheia indisponível neste navegador.');}};
window.addEventListener('storage',e=>{if(e.key===KEY&&!busy){try{event=read();render();notice('Rifa atualizada por outra aba. Confira antes de sortear.');}catch{blocked=true;render();notice('Dados inválidos recebidos de outra aba. Guarde os arquivos e recarregue.');}}});
try{event=read();if(event)notice('Rifa recuperada deste navegador. A lista e os resultados foram preservados.',true);}catch{blocked=true;notice('Não foi possível ler os dados salvos. Não será realizado nenhum sorteio. Verifique as permissões do navegador e guarde os comprovantes existentes.');}render();
