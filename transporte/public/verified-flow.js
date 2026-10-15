import {verifyTransportAthlete,restoreTransportAthlete,submitTransportChoice,checkTransportBackend} from './firebase-data.js';

// Fluxo familiar de duas etapas: identidade verificada antes de exibir formulário.
// A chave de deduplicação é (viagemId, atletaId), controlada pelo Apps Script.
export function createVerifiedFlow({getTrip,onVerified,onCleared,reportError,notify}) {
  const $=id=>document.getElementById(id);
  let selected=null, activeTripId=null;
  const gate=$('verification-form'), form=$('response-form');
  function clear() {
    selected=null;
    onCleared();
    $('verified-banner').hidden=true;
    form.hidden=true;
    $('athletes').readOnly=false;
    $('category').disabled=false;
    $('phone').readOnly=false;
    gate.hidden=true;
  }
  function showGate() {
    clear();
    const trip=getTrip();
    if(trip?.status==='open')gate.hidden=false;
  }
  function activate(data) {
    selected={athleteId:data.athleteId,athleteName:data.athleteName,category:data.category,verifiedPhone:data.verifiedPhone};
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
    $('phone').value=data.verifiedPhone||'';
    $('phone').readOnly=true;
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
        guardianPhone:$('athlete-contact-phone').value.trim()
      });
      if(activeTripId!==trip.id)return;
      activate(data);
      notify('Atleta localizado e acesso autorizado. Informe como irá à viagem.',true);
    }catch(error){reportError(error);}
    finally{button.disabled=false;}
  }
  async function submit(tripId,payload) {
    if(!selected||activeTripId!==tripId)throw Error('Identifique o atleta antes de responder.');
    return submitTransportChoice({tripId,athleteId:selected.athleteId,
      guardian:payload.guardian,phone:selected.verifiedPhone,mode:payload.mode,quantity:payload.quantity});
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
  }
  return {bind,clear,openTrip,submit,currentAthlete:()=>selected};
}
