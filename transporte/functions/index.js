// Integração privilegiada entre os dois projetos Firebase do Yoka.
// Deploy explícito somente destas funções, sem remover as funções /passageiros/ existentes.
import {initializeApp} from 'firebase-admin/app';
import {getFirestore, FieldValue, Timestamp} from 'firebase-admin/firestore';
import {onCall, HttpsError} from 'firebase-functions/v2/https';
import {generateAccessCode, hashCode, codesEqual, validateLookup,
  normalizeName, validateChoice, categoryLabel} from './security-core.js';

const transportApp=initializeApp();
const registryApp=initializeApp({projectId:'presencasimplesyoka'},'cadastro-yoka-readonly');
const db=getFirestore(transportApp);
const registry=getFirestore(registryApp);
const CLUB='yoka_guaratingueta';
const REGION='southamerica-east1';
const ADMIN_EMAILS=new Set(['joao.gerd@gmail.com','adyokafutsal@gmail.com']);
const VERIFICATION_ERROR='Não foi possível validar os dados. Confira as informações ou solicite ajuda à administração.';
const caller=opts=>({region:REGION,enforceAppCheck:true,memory:'256MiB',timeoutSeconds:30,...opts});

function fail(code,message) {throw new HttpsError(code,message);}
function uidFrom(request) {
  const uid=request.auth?.uid;
  if (!uid) fail('unauthenticated','Faça login antes de continuar.');
  return uid;
}
function tripRef(tripId) {
  if(typeof tripId!=='string'||!/^[\w-]{5,120}$/.test(tripId))fail('invalid-argument','Viagem inválida.');
  return db.collection('transportTrips').doc(tripId);
}
async function requireTripOpen(tripId) {
  const snap=await tripRef(tripId).get();
  if(!snap.exists||snap.get('published')!==true||snap.get('status')!=='open') {
    fail('failed-precondition','As confirmações desta viagem estão encerradas.');
  }
}
async function requireAdmin(request) {
  const uid=uidFrom(request);
  const email=String(request.auth?.token?.email||'').toLowerCase();
  if(request.auth?.token?.email_verified===true&&ADMIN_EMAILS.has(email))return uid;
  const doc=await db.collection('transportAdmins').doc(uid).get();
  if(!doc.exists||doc.get('active')!==true||request.auth?.token?.email_verified!==true) {
    fail('permission-denied','Acesso restrito à administração do Yoka.');
  }
  return uid;
}
function codeRef(tripId,athleteId) {
  return db.collection('transportVerification').doc(tripId).collection('codes').doc(athleteId);
}
function sessionRef(tripId,uid,athleteId) {
  return db.collection('transportSessions').doc(tripId)
    .collection('users').doc(uid).collection('athletes').doc(athleteId);
}
async function lookupAthlete(fullName,birthDate) {
  let lookup;
  try {lookup=validateLookup(fullName,birthDate);}
  catch {fail('invalid-argument','Informe o nome completo e a data de nascimento do atleta.');}
  // Query somente por nascimento, nunca disponibilizando uma lista pública de atletas.
  const matches=await registry.collection('clubs').doc(CLUB).collection('athletes')
    .where('birthDate','==',lookup.birthDate).limit(100).get();
  if(matches.size===100)fail('failed-precondition',VERIFICATION_ERROR);
  const found=matches.docs.filter(doc=>{
    const a=doc.data();
    return a.isActive===true && a.deleted!==true && normalizeName(a.name)===lookup.name;
  });
  if(found.length!==1)fail('failed-precondition',VERIFICATION_ERROR);
  return {id:found[0].id,...found[0].data()};
}
function responseFields(d) {
  return d?{guardian:d.guardian||'',phone:d.phone||'',mode:d.mode||'bus',
    quantity:d.quantity||0}:null;
}
async function sessionAthlete(tripId,uid,athleteId) {
  const [session,issued]=await Promise.all([
    sessionRef(tripId,uid,athleteId).get(),codeRef(tripId,athleteId).get()
  ]);
  if(!session.exists||!issued.exists||session.get('version')!==issued.get('version')
     ||session.get('expiresAt')?.toMillis()<=Date.now()) return false;
  return true;
}
async function attemptAllowance(uid) {
  const ref=db.collection('transportVerificationAttempts').doc(uid);
  await db.runTransaction(async tx=>{
    const snap=await tx.get(ref);
    const since=Number(snap.get('sinceMs')||0);
    const now=Date.now();
    const recent=now-since<60*60*1000;
    const count=recent?Number(snap.get('count')||0):0;
    if(count>=10)fail('resource-exhausted','Muitas tentativas. Aguarde uma hora ou fale com o Yoka.');
    tx.set(ref,{sinceMs:recent?since:now,count:count+1,updatedAt:FieldValue.serverTimestamp()});
  });
}

export const issueTransportCode=onCall(caller(),async request=>{
  await requireAdmin(request);
  const {tripId,fullName,birthDate}=request.data||{};
  const trip=await tripRef(tripId).get();
  if(!trip.exists)fail('not-found','Viagem não localizada.');
  const athlete=await lookupAthlete(fullName,birthDate);
  const code=generateAccessCode();
  const version=generateAccessCode();
  const issuedAt=Date.now();
  const expiresAt=Timestamp.fromMillis(issuedAt+72*60*60*1000);
  const profile=await registry.collection('clubs').doc(CLUB).collection('athleteProfiles')
    .doc(athlete.id).get();
  await codeRef(tripId,athlete.id).set({
    athleteId:athlete.id,tripId,hash:hashCode(code),version,
    issuedAt:FieldValue.serverTimestamp(),expiresAt,usedAt:null,
    issuedBy:request.auth.uid
  });
  return {code,expiresAt:expiresAt.toDate().toISOString(),
    athleteName:athlete.name,category:categoryLabel(athlete.categoryCode),
    guardianPhone:profile.get('guardianPhone')||null,
    secondGuardianPhone:profile.get('secondGuardianPhone')||null};
});

export const verifyTransportAthlete=onCall(caller(),async request=>{
  const uid=uidFrom(request);
  const {tripId,fullName,birthDate,code}=request.data||{};
  await requireTripOpen(tripId);
  await attemptAllowance(uid);
  if(typeof code!=='string'||code.length>32||code.length<8)fail('invalid-argument',VERIFICATION_ERROR);
  const athlete=await lookupAthlete(fullName,birthDate);
  const ref=codeRef(tripId,athlete.id);
  const sref=sessionRef(tripId,uid,athlete.id);
  await db.runTransaction(async tx=>{
    const doc=await tx.get(ref);
    if(!doc.exists||doc.get('usedAt')||doc.get('expiresAt')?.toMillis()<=Date.now()
       ||!codesEqual(doc.get('hash'),code))fail('permission-denied',VERIFICATION_ERROR);
    tx.update(ref,{usedAt:FieldValue.serverTimestamp()});
    tx.set(sref,{athleteId:athlete.id,version:doc.get('version'),
      expiresAt:Timestamp.fromMillis(Date.now()+14*24*60*60*1000),
      verifiedAt:FieldValue.serverTimestamp()});
  });
  const saved=await tripRef(tripId).collection('responses').doc(athlete.id).get();
  return {athleteId:athlete.id,athleteName:athlete.name,
    category:categoryLabel(athlete.categoryCode),
    response:responseFields(saved.exists?saved.data():null)};
});

export const restoreTransportAthlete=onCall(caller(),async request=>{
  const uid=uidFrom(request);
  const {tripId}=request.data||{};
  await requireTripOpen(tripId);
  const sessions=await db.collection('transportSessions').doc(tripId)
    .collection('users').doc(uid).collection('athletes').limit(20).get();
  for(const session of sessions.docs) {
    const athleteId=session.id;
    if(!await sessionAthlete(tripId,uid,athleteId))continue;
    const athleteSnap=await registry.collection('clubs').doc(CLUB).collection('athletes')
      .doc(athleteId).get();
    if(!athleteSnap.exists||athleteSnap.get('isActive')!==true
       ||athleteSnap.get('deleted')===true)continue;
    const saved=await tripRef(tripId).collection('responses').doc(athleteId).get();
    return {athleteId,athleteName:athleteSnap.get('name'),
      category:categoryLabel(athleteSnap.get('categoryCode')),
      response:responseFields(saved.exists?saved.data():null)};
  }
  return null;
});

export const submitTransportChoice=onCall(caller(),async request=>{
  const uid=uidFrom(request);
  const {tripId,athleteId}=request.data||{};
  if(typeof athleteId!=='string'||athleteId.length>140||athleteId.includes('/')) {
    fail('invalid-argument','Atleta inválido.');
  }
  await requireTripOpen(tripId);
  if(!await sessionAthlete(tripId,uid,athleteId)){
    fail('permission-denied','Identifique o atleta novamente antes de confirmar.');
  }
  const athleteSnap=await registry.collection('clubs').doc(CLUB).collection('athletes')
    .doc(athleteId).get();
  if(!athleteSnap.exists||athleteSnap.get('isActive')!==true
     ||athleteSnap.get('deleted')===true)fail('permission-denied','Atleta não autorizado.');
  let choice;
  try {choice=validateChoice(request.data);}
  catch(err) {fail('invalid-argument',err.message);}
  const responseRef=tripRef(tripId).collection('responses').doc(athleteId);
  await db.runTransaction(async tx=>{
    const existing=await tx.get(responseRef);
    const data={
      ...choice,athleteId,
      athletes:athleteSnap.get('name'),
      category:categoryLabel(athleteSnap.get('categoryCode')),
      ownerUid:uid,
      createdAt:existing.exists?existing.get('createdAt'):FieldValue.serverTimestamp(),
      updatedAt:FieldValue.serverTimestamp()
    };
    if(existing.exists&&existing.get('manualVehicleId'))data.manualVehicleId=existing.get('manualVehicleId');
    tx.set(responseRef,data);
  });
  return {ok:true,athleteId,response:choice};
});
