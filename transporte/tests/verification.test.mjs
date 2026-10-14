import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeName,validBirthDate,validateLookup,generateAccessCode,hashCode,
 codesEqual,validateChoice,categoryLabel} from '../functions/security-core.js';

test('nome completo tolera acentos, caixa e espaços',()=>{
 assert.equal(normalizeName('  João  D\u00e1vila   Silva  '),'JOAO DAVILA SILVA');
 assert.equal(normalizeName('Maria-Ana Costa'),'MARIA ANA COSTA');
});
test('data valida não aceita 31/02 ou data futura',()=>{
 assert.equal(validBirthDate('2016-02-29'),true);
 assert.equal(validBirthDate('2015-02-29'),false);
 assert.equal(validBirthDate('2026-02-31'),false);
 assert.equal(validBirthDate('2099-01-01'),false);
 assert.equal(validBirthDate('10/10/2016'),false);
});
test('identificação exige nome completo e nascimento',()=>{
 assert.equal(validateLookup('Lucas Felipe Santos','2017-01-02').name,'LUCAS FELIPE SANTOS');
 assert.throws(()=>validateLookup('Lucas','2017-01-02'));
 assert.throws(()=>validateLookup('Lucas Santos','2017-02-31'));
});
test('código individual não é previsível e hash compara em tempo constante',()=>{
 const a=generateAccessCode(),b=generateAccessCode();
 assert.match(a,/^[A-HJ-NP-Z2-9]{12}$/);
 assert.notEqual(a,b);
 assert.equal(codesEqual(hashCode(a),a),true);
 assert.equal(codesEqual(hashCode(a),'XXXXXXXXXXXX'),false);
 assert.equal(codesEqual('invalid',a),false);
});
test('uma confirmação valida quantidade de pessoas e modo',()=>{
 assert.deepEqual(validateChoice({guardian:'Maria Souza',phone:'(12) 99999-8888',mode:'bus',quantity:3}),
   {guardian:'Maria Souza',phone:'12999998888',mode:'bus',quantity:3});
 assert.equal(validateChoice({guardian:'Maria Souza',phone:'12999998888',mode:'car',quantity:7}).quantity,0);
 assert.throws(()=>validateChoice({guardian:'Maria Souza',phone:'12999998888',mode:'bus',quantity:0}));
 assert.throws(()=>validateChoice({guardian:'Maria Souza',phone:'12999998888',mode:'bus',quantity:3.5}));
});
test('categoria oficial é apresentada no padrão do Yoka',()=>{
 assert.equal(categoryLabel('SUB_7'),'Sub-07');
 assert.equal(categoryLabel('SUB_10'),'Sub-10');
});
