import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const data=readFileSync(new URL('../public/firebase-data.js',import.meta.url),'utf8');
const ui=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');

test('o formulário inicia com um lugar sem preenchimento anterior',()=>{
  assert.match(html,/<input[^>]*id="quantity"[^>]*value="1"/);
});

test('a nova pagina mantém acesso visivel ao cadastro legado de passageiros',()=>{
  assert.match(html,/<a[^>]*href="\/passageiros\/"[^>]*>[^<]*Cadastro de passageiros/);
});

test('usa config publica do projeto existente fora do Hosting, sem exigir config local',()=>{
  assert.match(data,/import\(['"]\.\/firebase-config\.js['"]\)/);
  assert.match(data,/firebaseConfig/);
});

test('ao sair da administração não deixa nomes e contatos anteriores na interface',()=>{
  assert.match(ui,/state\.responses\s*=\s*\[\]/);
  assert.match(ui,/\$\('responses-table'\)\.replaceChildren\(\)/);
});

test('a conta administrativa ja autorizada no Firestore legado tambem gerencia viagens',()=>{
  const merged=readFileSync(new URL('../firestore.merged.rules',import.meta.url),'utf8');
  assert.match(merged,/function transportAdmin\(\) \{\s*return admin\(\) \|\|/);
  assert.match(data,/u\.email\?\.toLowerCase\(\)\s*===\s*'adyokafutsal@gmail\.com'/);
});

test('recursos principais usam URL absoluta e versao para evitar cache incorreto',()=>{
  assert.match(html,/href="\/styles\.css\?v=[\w.-]+"/);
  assert.match(html,/src="\/app\.js\?v=[\w.-]+"/);
});

test('login Google cancelado tem orientacao amigavel e nao inutiliza o site',()=>{
  assert.match(ui,/auth\/popup-closed-by-user/);
  assert.match(ui,/A janela de login do Google foi fechada/);
  assert.match(ui,/state\.stopTrips=watchTrips\(true,arr=>\{markOnline\(\)/);
});

test('pagina tem aparencia basica mesmo sem o arquivo CSS externo',()=>{
  assert.match(html,/<style id="critical-style">[\s\S]*?<\/style>/);
  assert.match(html,/#071326/);
  assert.match(html,/class="panel"/);
});
