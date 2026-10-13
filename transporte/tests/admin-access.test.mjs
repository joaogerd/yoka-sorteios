import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isConfiguredAdminEmail} from '../public/admin-access.js';

const rules=readFileSync(new URL('../firestore.merged.rules',import.meta.url),'utf8');
const firebaseClient=readFileSync(new URL('../public/firebase-data.js',import.meta.url),'utf8');

test('as contas Google das duas pessoas administradoras são reconhecidas',()=>{
  assert.equal(isConfiguredAdminEmail('joao.gerd@gmail.com'),true);
  assert.equal(isConfiguredAdminEmail('adyokafutsal@gmail.com'),true);
  assert.equal(isConfiguredAdminEmail('JOAO.GERD@GMAIL.COM'),true);
  assert.equal(isConfiguredAdminEmail(' joao.gerd@gmail.com '),true);
});

test('não autoriza e-mails estranhos ou parecidos',()=>{
  for (const email of ['teste@gmail.com','joao.gerd@gmail.com.evil.com','joao.gerd+outro@gmail.com','',null,undefined]){
    assert.equal(isConfiguredAdminEmail(email),false,String(email));
  }
});

test('o frontend consulta a lista antes do fallback ao documento transportAdmins',()=>{
  assert.match(firebaseClient,/isConfiguredAdminEmail\(u\.email\)/);
  assert.match(firebaseClient,/getDoc\(doc\(db,'transportAdmins',u\.uid\)\)/);
});

test('o arquivo de regras versionado inclui as duas contas no admin legado',()=>{
  assert.match(rules,/"joao\.gerd@gmail\.com"/);
  assert.match(rules,/"adyokafutsal@gmail\.com"/);
  assert.match(rules,/function transportAdmin\(\)\s*\{\s*return admin\(\)/);
});
