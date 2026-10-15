import {issueTransportCode,verifyTransportAthlete,restoreTransportAthlete,submitTransportChoice,checkTransportBackend} from './firebase-data.js';

// Fluxo familiar de duas etapas: identidade verificada antes de exibir formulário.
// A chave de deduplicação é (viagemId, atletaId), controlada pela Cloud Function.
export function createVerifiedFlow({getTrip,onVerified,onCleared,reportError,notify}) {
  const $=id=>document.getElementById(id);
  let selected=null, activeTripId=null, issuedMessage='';
  const gate=$('verification-form'), form=$('response-form');
  function clear() {
    selected=null;
    onCleared();
    $('verified-banner').hidden=true;
    form.hidden=true;
    $('athletes').readOnly=false;
    $('category').disabled=false;
    gate.hidden=true;
    issuedMessage='';
    $('issued-code-box').hidden=true;
    $('issued-code-message').textContent='';
  }
  function showGate() {
    clear();
    const trip=getTrip();
    if(trip?.status==='open')gate.hidden=false;
  }
  function activate(data) {
    selected={athleteId:data.athleteId,athleteName:data.athleteName,category:data.category};
    gate.hidden=true;
    form.hidden=false;
    $('verified-banner').hidden=false;
    $('verified-name').textContent=`Atleta confirmado: ${data.athleteName} · ${data.category}`;
    onVerified(data);
    // Estes campos são informativos: o servidor ignora alterações de nome/categoria.
    $('athletes').value=data.athleteName;
    $('athletes').readOnly=true;
    $('category').value=data.category;
    $('category').disabled=true;
  }
  async function openTrip(trip) {
    activeTripId=trip?.id||null;
    showGate();
    if(!trip||trip.status!=='open')return;
    const tripAtStart=trip.id;
    try {
      const data=await restoreTransportAthlete({tripId:trip.id});
      if(activeTripId===tripAtStart&&data)activate(data);
    } catch (error) {
      // Ausência de sessão deve deixar disponível o formulário de verificação.
      if(activeTripId===tripAtStart)console.warn('Sessão anterior indisponível.',error.code);
    }
  }
  async function verify(event) {
    event.preventDefault();
    const trip=getTrip();
    if(!trip||trip.status!=='open')return;
    const button=$('verify-athlete');
    button.disabled=true;
    try {
      const data=await verifyTransportAthlete({
        tripId:trip.id,
        fullName:$('athlete-full-name').value.trim(),
        birthDate:$('athlete-birth-date').value,
        code:$('athlete-access-code').value.trim()
      });
      if(activeTripId!==trip.id)return;
      activate(data);
      $('athlete-access-code').value='';
      notify('Atleta localizado e acesso autorizado. Informe como irá à viagem.',true);
    }catch(error){reportError(error);}
    finally{button.disabled=false;}
  }
  async function submit(tripId,payload) {
    if(!selected||activeTripId!==tripId)throw Error('Identifique o atleta antes de responder.');
    return submitTransportChoice({tripId,athleteId:selected.athleteId,
      guardian:payload.guardian,phone:payload.phone,mode:payload.mode,quantity:payload.quantity});
  }
  async function issueCode(event) {
    event.preventDefault();
    const trip=$('admin-trip-select').value;
    if(!trip)return notify('Selecione uma viagem para gerar o código.');
    const button=$('issue-code-button');
    button.disabled=true;
    $('issued-code-box').hidden=true;
    try {
      const info=await issueTransportCode({
        tripId:trip,
        fullName:$('admin-athlete-name').value.trim(),
        birthDate:$('admin-athlete-birth').value
      });
      const link=`${location.origin}${location.pathname}?viagem=${encodeURIComponent(trip)}`;
      const contact=[info.guardianPhone,info.secondGuardianPhone].filter(Boolean).join(' / ')||'Contato não cadastrado';
      issuedMessage=`Yoka Transporte — acesso individual\nAtleta: ${info.athleteName} (${info.category})\nCódigo: ${info.code}\nValidade: ${new Date(info.expiresAt).toLocaleString('pt-BR')}\n\nAcesse ${link} e informe nome completo, data de nascimento e este código. O código é de uso único. Não compartilhe.`;
      $('issued-code-message').textContent=issuedMessage+`\n\nContatos cadastrados (somente admin): ${contact}`;
      $('issued-code-box').hidden=false;
      notify('Código gerado. Envie individualmente ao contato cadastrado.',true);
    }catch(error){reportError(error);}
    finally{button.disabled=false;}
  }
  function bind() {
    gate.addEventListener('submit',verify);
    $('verify-another').addEventListener('click',()=>{showGate();notify('Informe os dados do próximo atleta.');});
    $('diagnose-transport').addEventListener('click',async()=>{
      const button=$('diagnose-transport');
      button.disabled=true;
      try {
        const diag=await checkTransportBackend({});
        const status=diag.ok?'Conexão com os dois Firestores confirmada.':
          'Conexão pendente: cadastro HTTP '+(diag.cadastro?.status||'?')+
          ', transporte HTTP '+(diag.transporte?.status||'?')+
          '. Confira o IAM da conta que executa o Apps Script.';
        notify(status,diag.ok);
      } catch(error){reportError(error);}finally{button.disabled=false;}
    });
    $('issue-code-form').addEventListener('submit',issueCode);
    $('copy-issued-code').addEventListener('click',async()=>{
      if(!issuedMessage)return;
      try {await navigator.clipboard.writeText(issuedMessage);notify('Mensagem copiada.',true);}
      catch(error){reportError(error);}
    });
  }
  return {bind,clear,openTrip,submit,currentAthlete:()=>selected};
}
