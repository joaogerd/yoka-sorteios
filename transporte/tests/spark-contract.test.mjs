import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
const folder=fileURLToPath(new URL('..', import.meta.url));
const read=p=>fs.readFileSync(folder+'/'+p,'utf8');
test('transporte Spark não invoca Cloud Functions nem contém service account',()=>{
 const code=read('public/firebase-data.js');
 const bridge=read('public/appsscript-bridge.js');
 assert.ok(code.includes('transportRpc('));
 assert.ok(code.includes('getIdToken()'));
 assert.ok(!code.includes('httpsCallable('));
 assert.ok(!bridge.includes('private_key'));
});
test('somente URLs Apps Script válidas são aceitas para a ponte',()=>{
 const bridge=read('public/appsscript-bridge.js');
 const cfg=read('public/transport-bridge-config.js');
 assert.match(bridge,/script\\.google\\.com/);
 assert.match(bridge,/yoka.spark.request/);
 assert.match(bridge,/event.source===connection.win/);
 assert.match(cfg,/TRANSPORT_APPS_SCRIPT_URL/);
});
test('acesso à família depende de confirmação do atleta',()=>{
 const html=read('public/index.html');
 const flow=read('public/verified-flow.js');
 assert.match(html,/id="verification-form"/);
 assert.match(html,/id="response-form" hidden/);
 assert.match(flow,/verifyTransportAthlete/);
 assert.match(flow,/issueTransportCode/);
 assert.match(flow,/restoreTransportAthlete/);
});
test('regras do Firestore bloqueiam escrita anônima nos documentos dos atletas',()=>{
 const rules=read('firestore.verified.rules');
 assert.match(rules,/match \/responses\/\{athleteId\}/);
 assert.match(rules,/allow get, list, create, update, delete: if transportAdmin\(\)/);
});
