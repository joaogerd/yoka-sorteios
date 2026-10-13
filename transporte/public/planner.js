/** Planejamento determinístico: grupos familiares indivisíveis, veículos opcionais. */
export const normalizeVehicles = (vehicles = []) => vehicles
  .filter(v => v && v.enabled !== false)
  .map((v, i) => ({ id: String(v.id || `v${i}`), label: String(v.label || `Veículo ${i + 1}`), capacity: Math.max(0, Math.trunc(Number(v.capacity) || 0)) }))
  .filter(v => v.capacity > 0);

export function planTrip(responses = [], vehicles = []) {
  const available = normalizeVehicles(vehicles);
  const requests = responses.filter(r => r.mode === 'bus' && Number.isInteger(Number(r.quantity)) && Number(r.quantity) > 0)
    .map(r => ({...r, id: String(r.id), quantity: Math.trunc(Number(r.quantity))}));
  const passengers = requests.reduce((n, r) => n + r.quantity, 0);
  const carFamilies = responses.filter(r => r.mode === 'car').length;
  const declinedFamilies = responses.filter(r => r.mode === 'no').length;
  if (!passengers) return { passengers:0, carFamilies, declinedFamilies, selected:[], assignments:[], unassigned:[], capacity:0, free:0, feasible:true };

  const mandatory = new Set(requests.map(r => r.manualVehicleId).filter(Boolean));
  const missingPinned = requests.filter(r => r.manualVehicleId && !available.some(v => v.id === r.manualVehicleId));
  // Exaustivo até 12 veículos; acima disso, a lista é limitada para previsibilidade de custo.
  const candidates = available.slice(0, 12);
  const viable = [];
  for (let mask=1; mask < 2 ** candidates.length; mask++) {
    const subset = candidates.filter((_, i) => mask & (1 << i));
    if ([...mandatory].some(id => !subset.some(v => v.id === id))) continue;
    const capacity = subset.reduce((s,v)=>s+v.capacity,0);
    if (capacity >= passengers && missingPinned.length === 0) viable.push({ subset, capacity });
  }
  viable.sort((a,b)=>a.subset.length-b.subset.length || a.capacity-b.capacity || a.subset.map(v=>v.label).join().localeCompare(b.subset.map(v=>v.label).join()));
  for (const candidate of viable) {
    const assigned = exactPacking(requests, candidate.subset);
    if (assigned) return assemble(requests, responses, candidate.subset, assigned, carFamilies, declinedFamilies, passengers);
  }
  const fallback = available.slice().sort((a,b)=>b.capacity-a.capacity);
  const allocation = partialPacking(requests, fallback);
  return assemble(requests, responses, fallback, allocation, carFamilies, declinedFamilies, passengers);
}

function exactPacking(requests, vehicles) {
  const ordered = requests.slice().sort((a,b)=>b.quantity-a.quantity || a.id.localeCompare(b.id));
  const remaining = vehicles.map(v=>v.capacity);
  const assigned = new Map();
  const seen = new Set();
  let attempts=0;
  function search(index) {
    if (index === ordered.length) return true;
    if (++attempts > 80000) return false;
    const signature = index+'|'+remaining.join(',');
    if (seen.has(signature)) return false;
    const group = ordered[index];
    const choices = vehicles.map((v,j)=>({v,j}))
      .filter(({v,j})=>remaining[j]>=group.quantity && (!group.manualVehicleId || group.manualVehicleId===v.id))
      .sort((a,b)=>(remaining[a.j]-group.quantity)-(remaining[b.j]-group.quantity));
    const tried = new Set();
    for (const {v,j} of choices) {
      if (!requests.some(r => r.manualVehicleId) && tried.has(remaining[j])) continue;
      tried.add(remaining[j]);
      remaining[j]-=group.quantity;
      assigned.set(group.id, v.id);
      if (search(index+1)) return true;
      remaining[j]+=group.quantity;
      assigned.delete(group.id);
    }
    seen.add(signature);
    return false;
  }
  return search(0) ? assigned : null;
}

function partialPacking(requests, vehicles) {
  const remaining = vehicles.map(v=>v.capacity);
  const assigned = new Map();
  const ordered = requests.slice().sort((a,b)=>Number(Boolean(b.manualVehicleId))-Number(Boolean(a.manualVehicleId)) || b.quantity-a.quantity || a.id.localeCompare(b.id));
  for (const request of ordered) {
    const choices = vehicles.map((v,j)=>({v,j})).filter(({v,j})=>remaining[j]>=request.quantity && (!request.manualVehicleId || request.manualVehicleId===v.id));
    choices.sort((a,b)=>remaining[a.j]-remaining[b.j]);
    if (!choices.length) continue;
    const {v,j}=choices[0]; remaining[j]-=request.quantity; assigned.set(request.id,v.id);
  }
  return assigned;
}

function assemble(requests, responses, subset, allocated, carFamilies, declinedFamilies, passengers) {
  const usedIds = new Set(allocated.values());
  const selected = subset.filter(v=>usedIds.has(v.id)).map(v=>({ ...v, used:requests.filter(r=>allocated.get(r.id)===v.id).reduce((s,r)=>s+r.quantity,0) }));
  const assignments = requests.filter(r=>allocated.has(r.id)).map(r=>({ ...r, vehicleId:allocated.get(r.id) }));
  const unassigned = requests.filter(r=>!allocated.has(r.id));
  const capacity = selected.reduce((n,v)=>n+v.capacity,0);
  return { passengers, carFamilies, declinedFamilies, selected, assignments, unassigned, capacity, free:capacity-assignments.reduce((n,r)=>n+r.quantity,0), feasible:unassigned.length===0 };
}

export function escapeHtml(value) {return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
export function csvExport(rows) {return '\uFEFF'+rows.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(';')).join('\r\n');}
