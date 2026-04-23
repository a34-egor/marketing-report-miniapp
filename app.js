const CONFIG = {
  webhookUrl: "https://mlmotiv.app.n8n.cloud/webhook/marketing-miniapp-submit"
};

const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  try { tg.expand(); } catch {}
}

const userPill = document.getElementById("userPill");
const cycleInput = document.getElementById("cycle");
const geoList = document.getElementById("geoList");
const addGeoBtn = document.getElementById("addGeoBtn");
const previewBtn = document.getElementById("previewBtn");
const submitBtn = document.getElementById("submitBtn");
const previewCard = document.getElementById("previewCard");
const closePreviewBtn = document.getElementById("closePreviewBtn");
const previewText = document.getElementById("previewText");
const statusCard = document.getElementById("statusCard");
const statusText = document.getElementById("statusText");
const totalGeo = document.getElementById("totalGeo");
const totalSpend = document.getElementById("totalSpend");
const totalPdp = document.getElementById("totalPdp");
const totalAvg = document.getElementById("totalAvg");
const geoTemplate = document.getElementById("geoTemplate");

const initUser = tg?.initDataUnsafe?.user || null;
userPill.textContent = initUser
  ? `${initUser.first_name || ""} ${initUser.last_name || ""}`.trim() || `@${initUser.username || initUser.id}`
  : "Telegram user";

function parseAmount(raw) {
  const cleaned = String(raw || "")
    .replace(/\s+/g, "")
    .replace(/,/g, ".")
    .replace(/[^\d.-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function formatMoney(value) {
  const n = Number(value || 0);
  if (Number.isInteger(n)) return `${n}$`;
  return `${n.toFixed(2).replace(/\.?0+$/, "")}$`;
}

function calcAvg(spend, pdp) {
  const s = parseAmount(spend);
  const p = parseAmount(pdp);
  return p > 0 ? s / p : 0;
}

function showStatus(message, isError = false) {
  statusCard.classList.remove("hidden");
  statusCard.classList.toggle("error", isError);
  statusText.textContent = message;
}

function hideStatus() {
  statusCard.classList.add("hidden");
  statusCard.classList.remove("error");
  statusText.textContent = "";
}

function renumberGeo() {
  [...geoList.querySelectorAll(".geo-item")].forEach((item, index) => {
    item.querySelector(".geo-number").textContent = String(index + 1);
  });
}

function collectItems(strict = true) {
  const rows = [...geoList.querySelectorAll(".geo-item")];
  return rows
    .map((row, index) => {
      const geo = row.querySelector(".geo-input").value.trim();
      const spendRaw = row.querySelector(".spend-input").value.trim();
      const pdpRaw = row.querySelector(".pdp-input").value.trim();
      const plan = row.querySelector(".plan-input").value.trim();

      const spend = parseAmount(spendRaw);
      const pdp = parseAmount(pdpRaw);
      const avg_pdp_cost = calcAvg(spendRaw, pdpRaw);

      if (strict) {
        if (!geo) throw new Error(`Заполни GEO в блоке ${index + 1}`);
        if (!spendRaw || spend <= 0) throw new Error(`Заполни корректный расход в блоке ${index + 1}`);
        if (!pdpRaw || pdp <= 0) throw new Error(`Заполни корректное количество ПДП в блоке ${index + 1}`);
        if (!plan) throw new Error(`Заполни план в блоке ${index + 1}`);
      }

      return { geo, spend, pdp, avg_pdp_cost, next_cycle_plan: plan };
    })
    .filter(item => item.geo || item.spend || item.pdp || item.next_cycle_plan);
}

function updateTotals() {
  const items = collectItems(false);
  const spend = items.reduce((acc, i) => acc + Number(i.spend || 0), 0);
  const pdp = items.reduce((acc, i) => acc + Number(i.pdp || 0), 0);
  const avg = pdp > 0 ? spend / pdp : 0;

  totalGeo.textContent = String(items.length);
  totalSpend.textContent = formatMoney(spend);
  totalPdp.textContent = String(pdp);
  totalAvg.textContent = formatMoney(avg);
}

function attachGeoRowEvents(row) {
  const spendInput = row.querySelector(".spend-input");
  const pdpInput = row.querySelector(".pdp-input");
  const avgOutput = row.querySelector(".avg-output");
  const removeBtn = row.querySelector(".remove-geo");

  function refresh() {
    avgOutput.textContent = formatMoney(calcAvg(spendInput.value, pdpInput.value));
    updateTotals();
  }

  spendInput.addEventListener("input", refresh);
  pdpInput.addEventListener("input", refresh);
  row.querySelector(".geo-input").addEventListener("input", refresh);
  row.querySelector(".plan-input").addEventListener("input", refresh);

  removeBtn.addEventListener("click", () => {
    row.remove();
    renumberGeo();
    updateTotals();
  });

  refresh();
}

function addGeoRow(data = {}) {
  const fragment = geoTemplate.content.cloneNode(true);
  const row = fragment.querySelector(".geo-item");
  row.querySelector(".geo-input").value = data.geo || "";
  row.querySelector(".spend-input").value = data.spend || "";
  row.querySelector(".pdp-input").value = data.pdp || "";
  row.querySelector(".plan-input").value = data.next_cycle_plan || "";
  geoList.appendChild(fragment);

  const inserted = geoList.lastElementChild;
  attachGeoRowEvents(inserted);
  renumberGeo();
  updateTotals();
}

function buildPayload() {
  const cycle = cycleInput.value.trim();
  if (!cycle) throw new Error("Заполни цикл");

  const items = collectItems(true);
  if (!items.length) throw new Error("Добавь хотя бы один GEO");

  return {
    source: "github-pages-miniapp",
    telegram_init_data: tg?.initData || "",
    telegram_id: initUser?.id ? String(initUser.id) : "",
    username: initUser?.username || "",
    first_name: initUser?.first_name || "",
    last_name: initUser?.last_name || "",
    marketer: `${initUser?.first_name || ""} ${initUser?.last_name || ""}`.trim() || initUser?.username || "",
    cycle,
    items
  };
}

function renderPreview() {
  try {
    const payload = buildPayload();
    const totalSpendValue = payload.items.reduce((acc, i) => acc + i.spend, 0);
    const totalPdpValue = payload.items.reduce((acc, i) => acc + i.pdp, 0);
    const totalAvgValue = totalPdpValue > 0 ? totalSpendValue / totalPdpValue : 0;

    const text = [
      `Цикл: ${payload.cycle}`,
      "",
      ...payload.items.flatMap((item, idx) => [
        `#${idx + 1} ${item.geo}`,
        `Расход: ${formatMoney(item.spend)}`,
        `ПДП: ${item.pdp}`,
        `Цена за ПДП: ${formatMoney(item.avg_pdp_cost)}`,
        `План: ${item.next_cycle_plan}`,
        ""
      ]),
      `Итого GEO: ${payload.items.length}`,
      `Итого расход: ${formatMoney(totalSpendValue)}`,
      `Итого ПДП: ${totalPdpValue}`,
      `Средняя цена за ПДП: ${formatMoney(totalAvgValue)}`
    ].join("\n");

    previewText.textContent = text;
    previewCard.classList.remove("hidden");
    hideStatus();
  } catch (err) {
    showStatus(err.message || "Не удалось собрать предпросмотр", true);
  }
}

async function submitReport() {
  try {
    hideStatus();
    const payload = buildPayload();

    if (!CONFIG.webhookUrl || CONFIG.webhookUrl.includes("https://mlmotiv.app.n8n.cloud/webhook/marketing-miniapp-submit")) {
      throw new Error("В app.js не указан webhookUrl");
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Отправляем…";

    const response = await fetch(CONFIG.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const raw = await response.text();
    let data = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = { raw };
    }

    if (!response.ok) {
      throw new Error(data.message || `Ошибка webhook: ${response.status}`);
    }

    showStatus(data.message || "Отчёт успешно отправлен");
  } catch (err) {
    showStatus(err.message || "Не удалось отправить отчёт", true);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Отправить";
  }
}

addGeoBtn.addEventListener("click", () => addGeoRow());
previewBtn.addEventListener("click", renderPreview);
closePreviewBtn.addEventListener("click", () => previewCard.classList.add("hidden"));
submitBtn.addEventListener("click", submitReport);

addGeoRow();
