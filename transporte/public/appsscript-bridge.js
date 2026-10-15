import {TRANSPORT_APPS_SCRIPT_URL} from './transport-bridge-config.js';

let connectionPromise=null;
let connection=null;
const pending=new Map();
function trustedGoogleOrigin(origin) {
  try {
    const url=new URL(origin);
    return url.protocol==='https:' && (
      url.hostname==='script.google.com' ||
      url.hostname==='script.googleusercontent.com' ||
      url.hostname.endsWith('.script.googleusercontent.com')
    );
  }catch{return false;}
}
function randomNonce(){
  return [...crypto.getRandomValues(new Uint8Array(24))]
    .map(x=>x.toString(16).padStart(2,'0')).join('');
}
function bridgeUrl() {
  const raw=String(TRANSPORT_APPS_SCRIPT_URL||'').trim();
  if(!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(raw)) {
    throw Error('Ponte do cadastro ainda não configurada. Solicite a ativação à administração.');
  }
  return raw;
}
function errorFrom(message) {
  return Error(String(message||'O servidor não conseguiu concluir a operação.').slice(0,350));
}
function connect() {
  if(connectionPromise)return connectionPromise;
  connectionPromise=new Promise((resolve,reject)=>{
    let iframe=null;
    let settled=false;
    const nonce=randomNonce();
    const timeout=setTimeout(()=>{
      if(settled)return;
      settled=true;
      window.removeEventListener('message',handler);
      iframe?.remove();
      connectionPromise=null;
      reject(Error('A ponte do cadastro não respondeu. Verifique a implantação Apps Script.'));
    },30000);
    function handler(event) {
      if(!trustedGoogleOrigin(event.origin)||!event.data||event.data.nonce!==nonce)return;
      const msg=event.data;
      if(msg.type==='yoka.spark.ready') {
        if(settled)return;
        settled=true;
        clearTimeout(timeout);
        connection={win:event.source,origin:event.origin,nonce};
        resolve(connection);
      } else if(msg.type==='yoka.spark.response' && connection &&
        event.source===connection.win && event.origin===connection.origin) {
        const slot=pending.get(msg.id);
        if(!slot)return;
        pending.delete(msg.id);
        clearTimeout(slot.timeout);
        if(msg.ok)slot.resolve(msg.data);
        else slot.reject(errorFrom(msg.message));
      }
    }
    // Manter listener ativo depois da conexão para entregar as respostas.
    window.addEventListener('message',handler);
    try {
      const url=new URL(bridgeUrl());
      url.searchParams.set('pagina','transporte-ponte');
      url.searchParams.set('nonce',nonce);
      iframe=document.createElement('iframe');
      iframe.title='Ponte de identificação do Yoka';
      iframe.style.cssText='position:absolute;width:1px;height:1px;border:0;opacity:0;pointer-events:none;';
      iframe.referrerPolicy='no-referrer';
      iframe.src=url.href;
      document.body.appendChild(iframe);
    }catch(err) {
      settled=true;
      clearTimeout(timeout);
      window.removeEventListener('message',handler);
      connectionPromise=null;
      reject(err);
    }
  });
  return connectionPromise;
}
export async function transportRpc(action,data,idToken) {
  const bridge=await connect();
  const id=crypto.randomUUID();
  return new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>{
      pending.delete(id);
      reject(Error('A validação demorou demais. Tente novamente.'));
    },60000);
    pending.set(id,{resolve,reject,timeout});
    bridge.win.postMessage({type:'yoka.spark.request',
      nonce:bridge.nonce,id,action,data,idToken},bridge.origin);
  });
}
