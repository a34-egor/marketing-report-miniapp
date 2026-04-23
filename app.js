const CONFIG = {
  submitWebhookUrl: "https://mlmotiv.app.n8n.cloud/webhook/marketing-miniapp-submit",
  apiWebhookUrl: "https://mlmotiv.app.n8n.cloud/webhook/marketing-miniapp-api"
};

const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  try { tg.expand(); } catch {}
}

let editMode = false;
let currentReportKey = null;

const cycleInput = document.getElementById("cycle");
const geoList = document.getElementById("geoList");
const addGeoBtn = document.getElementById("addGeoBtn");
const submitBtn = document.getElementById("submitBtn");
const myReportsContainer = document.getElementById("myReports");

function parseAmount(val) {
  return Number(String(val).replace(/\s/g,'').replace(',','.')) || 0;
}

function formatMoney(v) {
  return Number(v).toFixed(2).replace(/\.00$/,'') + "$";
}

function addGeoRow(data = {}) {
  const div = document.createElement("div");
  div.className = "geo-item";

  div.innerHTML = `
    <input class="geo" placeholder="GEO" value="${data.geo || ''}">
    <input class="spend" placeholder="Расход" value="${data.spend || ''}">
    <input class="pdp" placeholder="ПДП" value="${data.pdp || ''}">
    <textarea class="plan" placeholder="План">${data.next_cycle_plan || ''}</textarea>
    <button class="remove">Удалить</button>
  `;

  div.querySelector(".remove").onclick = () => div.remove();

  geoList.appendChild(div);
}

addGeoBtn.onclick = () => addGeoRow();

function collectItems() {
  return [...document.querySelectorAll(".geo-item")].map(el => {
    return {
      geo: el.querySelector(".geo").value,
      spend: parseAmount(el.querySelector(".spend").value),
      pdp: parseAmount(el.querySelector(".pdp").value),
      next_cycle_plan: el.querySelector(".plan").value
    };
  });
}

function buildPayload() {
  return {
    telegram_id: tg?.initDataUnsafe?.user?.id,
    username: tg?.initDataUnsafe?.user?.username,
    cycle: cycleInput.value,
    report_key: currentReportKey,
    items: collectItems()
  };
}

async function submit() {
  const payload = buildPayload();

  const url = editMode ? CONFIG.apiWebhookUrl : CONFIG.submitWebhookUrl;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({
      action: editMode ? "save_report_edit" : "submit_report",
      ...payload
    })
  });

  alert("Сохранено");
  loadReports();
}

submitBtn.onclick = submit;

async function loadReports() {
  const res = await fetch(CONFIG.apiWebhookUrl, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({
      action: "get_my_reports",
      telegram_id: tg?.initDataUnsafe?.user?.id
    })
  });

  const data = await res.json();

  myReportsContainer.innerHTML = "";

  data.forEach(r => {
    const div = document.createElement("div");
    div.className = "report-card";

    div.innerHTML = `
      <b>Цикл ${r.cycle}</b><br>
      Расход: ${formatMoney(r.total_spend)}<br>
      ПДП: ${r.total_pdp}<br>
      <button>Открыть</button>
    `;

    div.querySelector("button").onclick = () => openReport(r.report_key);

    myReportsContainer.appendChild(div);
  });
}

async function openReport(report_key) {
  const res = await fetch(CONFIG.apiWebhookUrl, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({
      action: "get_report_details",
      report_key
    })
  });

  const data = await res.json();

  editMode = true;
  currentReportKey = report_key;

  cycleInput.value = data.cycle;
  geoList.innerHTML = "";

  data.items.forEach(i => addGeoRow(i));
}

loadReports();
