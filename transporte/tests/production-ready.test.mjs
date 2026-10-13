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
