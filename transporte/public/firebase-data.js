import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import {getAuth, signInAnonymously, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';
import {getFirestore, collection, doc, addDoc, setDoc, updateDoc, getDoc, getDocs, onSnapshot, query, where, serverTimestamp, deleteDoc} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';

let app, auth, db;
let currentUser;
export async function initFirebase() {
  let config;
  try {
    const response = await fetch('/__/firebase/init.json',{cache:'no-store'});
    if (response.ok) config=await response.json();
  } catch {}
  if (!config?.apiKey) {
    try {const mod=await import('./firebase-config.local.js');config=mod.firebaseConfig;} catch {}
  }
  if (!config?.apiKey) {
    // A configuração Web do projeto é pública e já é usada pelo cadastro anterior.
    const {firebaseConfig} = await import('./firebase-config.js');
    config = firebaseConfig;
  }
  if (!config?.apiKey) throw Error('Configuração pública do Firebase inválida. Confira public/firebase-config.js.');
  app=initializeApp(config);
  // O projeto existente usa App Check Enterprise para proteger Firestore.
  try {
    const [{initializeAppCheck, ReCaptchaEnterpriseProvider}, providerConfig] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/12.2.1/firebase-app-check.js'),
      import('./firebase-config.js')
    ]);
    if (providerConfig.recaptchaEnterpriseKey) {
      initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(providerConfig.recaptchaEnterpriseKey),
        isTokenAutoRefreshEnabled: true
      });
    }
  } catch (err) {
    console.warn('App Check nao foi inicializado; as regras do projeto podem exigir sua ativacao.',err);
  }
  auth=getAuth(app);db=getFirestore(app);
  await new Promise((resolve,reject)=>{let unsub=onAuthStateChanged(auth, user=>{unsub();currentUser=user;resolve(user);},reject);});
  if (!currentUser) await anonymousLogin();
  return currentUser;
}
export const getUser=()=>auth?.currentUser;
export const userIsAnonymous=()=>getUser()?.isAnonymous!==false;
export async function anonymousLogin(){const r=await signInAnonymously(auth);currentUser=r.user;return r.user;}
export async function googleLogin(){const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});const r=await signInWithPopup(auth,provider);currentUser=r.user;return r.user;}
export async function logout(){await signOut(auth);return anonymousLogin();}
export async function isAdmin(){const u=getUser();if(!u||u.isAnonymous)return false;const snap=await getDoc(doc(db,'transportAdmins',u.uid));return snap.exists()&&snap.data().active===true;}
export function watchTrips(isAdminUser,onData,onError){const ref=collection(db,'transportTrips');return onSnapshot(isAdminUser?ref:query(ref,where('published','==',true)),snap=>onData(snap.docs.map(s=>({id:s.id,...s.data()}))),onError);}
export function watchMyResponse(tripId,callback,onError){return onSnapshot(doc(db,'transportTrips',tripId,'responses',getUser().uid),snap=>callback(snap.exists()?{id:snap.id,...snap.data()}:null),onError);}
export function watchResponses(tripId,callback,onError){return onSnapshot(collection(db,'transportTrips',tripId,'responses'),snap=>callback(snap.docs.map(s=>({id:s.id,...s.data()}))),onError);}
export async function saveResponse(tripId,old,payload){
  const uid=getUser().uid;
  const ref=doc(db,'transportTrips',tripId,'responses',uid);
  // Não incluir id do snapshot na escrita; as regras exigem campos estritos.
  const safe={...payload,ownerUid:uid,createdAt:old?.createdAt||serverTimestamp(),updatedAt:serverTimestamp()};
  if(old?.manualVehicleId) safe.manualVehicleId=old.manualVehicleId;
  await setDoc(ref,safe);
}
export async function saveTrip(id,payload){if(id){await updateDoc(doc(db,'transportTrips',id),{...payload,updatedAt:serverTimestamp()});return id;}const r=await addDoc(collection(db,'transportTrips'),{...payload,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});return r.id;}
export async function setManualVehicle(tripId,responseId,vehicleId){await updateDoc(doc(db,'transportTrips',tripId,'responses',responseId),{manualVehicleId:vehicleId||null,updatedAt:serverTimestamp()});}
export async function removeResponse(tripId,responseId){await deleteDoc(doc(db,'transportTrips',tripId,'responses',responseId));}
export async function findAthleteById(id){ // Implementação reservada para integração administrativa autorizada, nunca faz leitura pública de perfis.
  void id; return null;
}
