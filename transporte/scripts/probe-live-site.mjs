const origin='https://yoka-transporte.web.app';
const paths=['/','/styles.css','/app.js','/firebase-data.js','/passageiros/','/styles-legado.css','/__/firebase/init.json'];
for(const path of paths){
  try{
    const url=origin+path+'?diagnostic='+Date.now();
    const response=await fetch(url,{redirect:'follow',headers:{'Cache-Control':'no-cache'}});
    const body=await response.text();
    console.log(JSON.stringify({path,status:response.status,type:response.headers.get('content-type'),length:body.length,
      initial: path==='/styles.css'?body.slice(0,100):undefined,
      cssRules:path==='/styles.css'&&body.includes('--bg:#071326'),
      currentHTML:path==='/'&&body.includes('A viagem também'),
      activeApp:path==='/app.js'&&body.includes('renderFamilyTrip'),
      firebaseConfig:path==='/__/firebase/init.json'&&body.includes('apiKey')}));
  }catch(e){console.log(JSON.stringify({path,error:String(e)}))}
}
