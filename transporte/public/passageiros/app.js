import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app-check.js";
import {
  getFirestore, doc, getDoc, writeBatch, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { firebaseConfig, recaptchaEnterpriseKey } from "/firebase-config.js";

const app = initializeApp(firebaseConfig);
initializeAppCheck(app, {
  provider: new ReCaptchaEnterpriseProvider(recaptchaEnterpriseKey),
  isTokenAutoRefreshEnabled: true,
});
const db = getFirestore(app);

const el = (id) => document.getElementById(id);
const initialToken = new URLSearchParams(location.search).get("t");
let inviteId = initialToken || null;
let invite = null;
let status = null;

function hideAll() {
  ["codeGate", "loading", "error", "passengerForm", "locked"].forEach((id) => el(id).classList.add("hidden"));
}
function show(id) { hideAll(); el(id).classList.remove("hidden"); }
function showError(message) { show("error"); el("errorMessage").textContent = message; }

function normalizeCode(value) {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16);
}
function displayCode(value) {
  const raw = normalizeCode(value);
  return raw.match(/.{1,4}/g)?.join("-") || "";
}
function digits(value) { return String(value || "").replace(/\D/g, "").slice(0, 11); }
function formatCpf(value) {
  const d = digits(value);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`;
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
}
function defaultVehicle(category) { return String(category).replace(/^Sub-0?/, "Sub-") === "Sub-9" ? "Van" : "Ônibus"; }
function vehicleForInvite(inv) { return inv?.vehicle || defaultVehicle(inv?.category); }
function validCpf(value) {
  const d = digits(value);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const calc = (len) => {
    let sum = 0;
    for (let i = 0; i < len; i += 1) sum += Number(d[i]) * (len + 1 - i);
    const r = 11 - (sum % 11);
    return r >= 10 ? 0 : r;
  };
  return Number(d[9]) === calc(9) && Number(d[10]) === calc(10);
}

function updateProgress() {
  const cards = [...document.querySelectorAll(".passenger-card")];
  const completed = cards.filter((card) => {
    const name = card.querySelector('[data-field="name"]').value.trim();
    const cpf = card.querySelector('[data-field="cpf"]').value;
    return name.length >= 3 && validCpf(cpf);
  }).length;
  el("progressText").textContent = `${completed} de ${invite?.reservedSeats || 0} passageiros cadastrados`;
}

function createPassengerCard(index) {
  const athlete = index === 0;
  const card = document.createElement("section");
  card.className = "passenger-card";
  card.innerHTML = `
    <h3>${index + 1}. ${athlete ? "Atleta" : `Acompanhante ${index}`}</h3>
    <div class="passenger-grid">
      <label class="form-label">Nome completo
        <input class="text-input" data-field="name" maxlength="140" ${athlete ? "readonly" : "required"} />
      </label>
      <label class="form-label">CPF
        <input class="text-input" data-field="cpf" maxlength="14" inputmode="numeric" autocomplete="off" placeholder="000.000.000-00" required />
      </label>
    </div>`;
  const name = card.querySelector('[data-field="name"]');
  const cpf = card.querySelector('[data-field="cpf"]');
  name.value = athlete ? invite.athleteName : "";
  cpf.value = athlete ? formatCpf(invite.athleteCpf || "") : "";
  name.addEventListener("input", updateProgress);
  cpf.addEventListener("input", () => { cpf.value = formatCpf(cpf.value); updateProgress(); });
  return card;
}

function renderLocked() {
  el("lockedMessage").textContent = `${invite.athleteName} • ${invite.category}`;
  el("lockedProgress").innerHTML = `<strong>${invite.reservedSeats} de ${invite.reservedSeats} passageiros cadastrados</strong><span>Cadastro enviado e bloqueado.</span>`;
  show("locked");
}

function renderForm() {
  el("category").textContent = invite.category;
  el("athleteName").textContent = invite.athleteName;
  el("gameInfo").textContent = [invite.gameDateLabel, invite.opponent ? `x ${invite.opponent}` : ""].filter(Boolean).join(" • ");
  el("reservationText").textContent = `${vehicleForInvite(invite)} • ${invite.reservedSeats} lugar${invite.reservedSeats === 1 ? "" : "es"} reservado${invite.reservedSeats === 1 ? "" : "s"}: atleta + ${invite.companions} acompanhante${invite.companions === 1 ? "" : "s"}.`;
  const list = el("passengerList");
  list.innerHTML = "";
  for (let i = 0; i < invite.reservedSeats; i += 1) list.appendChild(createPassengerCard(i));
  updateProgress();
  show("passengerForm");
}

async function resolveInviteFromCode(rawCode) {
  const key = normalizeCode(rawCode);
  if (key.length !== 16) throw new Error("Digite o código completo de 16 caracteres.");
  const snap = await getDoc(doc(db, "accessCodes", key));
  if (!snap.exists()) throw new Error("Código inválido. Confira a mensagem recebida do Yoka.");
  return snap.data().inviteId;
}

async function loadByInvite(id) {
  inviteId = id;
  show("loading");
  try {
    const [inviteSnap, statusSnap] = await Promise.all([
      getDoc(doc(db, "passengerInvites", id)),
      getDoc(doc(db, "passengerStatus", id)),
    ]);
    if (!inviteSnap.exists() || !statusSnap.exists()) throw new Error("Convite inválido ou ainda não liberado.");
    invite = inviteSnap.data();
    status = statusSnap.data();
    if (invite.active !== true) throw new Error("Este cadastro foi encerrado pela administração do Yoka.");
    if (status.completed === true && status.reopened !== true) renderLocked();
    else renderForm();
  } catch (err) {
    console.error(err);
    showError(err?.message || "Não foi possível abrir este cadastro.");
  }
}

el("accessCode").addEventListener("input", (e) => { e.target.value = displayCode(e.target.value); });
el("codeForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  show("loading");
  try { await loadByInvite(await resolveInviteFromCode(el("accessCode").value)); }
  catch (err) { showError(err?.message || "Código inválido."); }
});
el("tryCodeButton").addEventListener("click", () => { show("codeGate"); el("accessCode").focus(); });

el("passengerForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const cards = [...document.querySelectorAll(".passenger-card")];
  const passengers = cards.map((card, index) => ({
    type: index === 0 ? "atleta" : "acompanhante",
    name: card.querySelector('[data-field="name"]').value.trim(),
    cpf: digits(card.querySelector('[data-field="cpf"]').value),
  }));

  if (passengers.some((p) => p.name.length < 3 || !validCpf(p.cpf))) {
    alert("Confira os nomes e CPFs. Há algum CPF inválido ou campo incompleto.");
    return;
  }
  if (new Set(passengers.map((p) => p.cpf)).size !== passengers.length) {
    alert("Há CPF repetido nesta reserva. Confira os passageiros.");
    return;
  }

  const button = el("submitButton");
  button.disabled = true;
  button.textContent = "Enviando…";
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, "passengerData", inviteId), {
      passengers,
      locked: true,
      submittedAt: serverTimestamp(),
    });
    batch.set(doc(db, "passengerStatus", inviteId), {
      completed: true,
      reopened: false,
      completedCount: invite.reservedSeats,
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
    status = { completed: true, reopened: false, completedCount: invite.reservedSeats };
    renderLocked();
  } catch (err) {
    console.error(err);
    alert("Não foi possível enviar. Atualize a página e tente novamente. Se persistir, procure a administração do Yoka.");
  } finally {
    button.disabled = false;
    button.textContent = "Enviar cadastro de passageiros";
  }
});

if (initialToken) loadByInvite(initialToken);
else show("codeGate");
