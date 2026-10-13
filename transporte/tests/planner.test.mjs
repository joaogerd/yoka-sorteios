import test from 'node:test';
import assert from 'node:assert/strict';
import {planTrip, escapeHtml, csvExport} from '../public/planner.js';
const vehicles = [
 {id:'b60',label:'Ônibus 60',capacity:60,enabled:true},
 {id:'b45',label:'Ônibus 45',capacity:45,enabled:true},
 {id:'v18',label:'Van 18',capacity:18,enabled:true},
 {id:'v15',label:'Van 15',capacity:15,enabled:true}
];
const party = counts => counts.map((quantity,i)=>({id:String(i),mode:'bus',quantity}));
const check = (n, expected) => {const r=planTrip(party([n]),vehicles); assert.deepEqual(r.selected.map(v=>v.capacity), expected); assert.equal(r.feasible,true)};
test('veículo mínimo que acomoda grupo',()=>{check(11,[15]);check(17,[18]);check(43,[45]);check(59,[60]);});
test('60 + 15 para 70 em grupos',()=>{const r=planTrip(party([30,20,15,5]),vehicles);assert.equal(r.feasible,true);assert.equal(r.selected.length,2);assert.equal(r.assignments.reduce((n,x)=>n+x.quantity,0),70);});
test('preferir 45 + 18 para 62 se possível',()=>{const r=planTrip(party([40,12,6,4]),vehicles);assert.equal(r.feasible,true);assert.deepEqual(r.selected.map(v=>v.capacity).sort((a,b)=>a-b),[18,45]);});
test('capacidade insuficiente não perde grupos',()=>{const r=planTrip(party([60,60,60]),vehicles);assert.equal(r.feasible,false);assert.equal(r.assignments.reduce((n,x)=>n+x.quantity,0)+r.unassigned.reduce((n,x)=>n+x.quantity,0),180);});
test('não divide a família',()=>{const r=planTrip(party([46,46,18]),vehicles);assert.equal(r.feasible,false);assert.ok(r.unassigned.length>0);});
test('veículos indisponíveis ignorados',()=>{const r=planTrip(party([18]),[{...vehicles[0],enabled:false},vehicles[2]]);assert.deepEqual(r.selected.map(v=>v.id),['v18']);});
test('alocação manual é respeitada',()=>{const responses=[{id:'a',mode:'bus',quantity:14,manualVehicleId:'v15'},{id:'b',mode:'bus',quantity:40}];const r=planTrip(responses,vehicles);assert.equal(r.feasible,true);assert.equal(r.assignments.find(x=>x.id==='a').vehicleId,'v15');});
test('alocação manual inválida gera pendência',()=>{const r=planTrip([{id:'a',mode:'bus',quantity:4,manualVehicleId:'sumiu'}],vehicles);assert.equal(r.feasible,false);});
test('sem passageiros',()=>{const r=planTrip([{mode:'car'},{mode:'no'}],vehicles);assert.equal(r.passengers,0);assert.equal(r.selected.length,0);assert.equal(r.carFamilies,1)});
test('protege HTML e CSV',()=>{assert.equal(escapeHtml('<img onerror="x">'),'&lt;img onerror=&quot;x&quot;&gt;');assert.match(csvExport([['Nome','Observação'],['Fulano','a"b']]),/"a""b"/)});
