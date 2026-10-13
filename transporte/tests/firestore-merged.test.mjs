import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const merged=readFileSync(new URL('../firestore.merged.rules',import.meta.url),'utf8');

test('regras completas preservam o cadastro de passageiros já existente',()=>{
  assert.match(merged,/^rules_version = '2';/);
  for(const match of ['passengerInvites','accessCodes','passengerStatus','passengerData']){
    assert.equal((merged.match(new RegExp('match /'+match+'\\/\\{','g'))||[]).length,1,match);
  }
  for(const functionName of ['admin','invite','currentStatus','canFamilySubmit','validPerson','uniqueCpfs','validPassengerData']){
    assert.match(merged,new RegExp('function '+functionName+'\\('));
  }
  assert.match(merged,/match \/passengerInvites\/\{inviteId\} \{\s*allow get: if true;/);
  assert.match(merged,/match \/passengerData\/\{inviteId\} \{\s*allow get, list: if admin\(\);/);
});

test('regras de transporte têm autorização e gravação individual',()=>{
  assert.match(merged,/function transportAdmin\(\)/);
  assert.match(merged,/function transportTripOpen\(tripId\)/);
  assert.match(merged,/function validTransportResponse\(d\)/);
  assert.match(merged,/match \/transportAdmins\/\{uid\}/);
  assert.match(merged,/match \/transportTrips\/\{tripId\}/);
  assert.match(merged,/match \/responses\/\{uid\}/);
  assert.match(merged,/allow list: if transportAdmin\(\)/);
  assert.match(merged,/request\.auth\.uid == uid/);
  assert.match(merged,/request\.resource\.data\.diff\(resource\.data\)\.affectedKeys\(\)/);
});

test('nega outros documentos no final e não duplica nomes de função',()=>{
  for(const name of ['admin','transportAdmin','transportSignedIn','transportTripOpen','validTransportResponse']){
    assert.equal((merged.match(new RegExp('function '+name+'\\(','g'))||[]).length,1,name);
  }
  const deny=merged.lastIndexOf('match /{document=**}');
  const passenger=merged.lastIndexOf('match /passengerData/{inviteId}');
  const transport=merged.lastIndexOf('match /transportTrips/{tripId}');
  assert.ok(deny>passenger&&deny>transport);
  assert.match(merged,/match \/\{document=\*\*\} \{\s*allow read, write: if false;/);
});
