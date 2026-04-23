const CONFIG = {
  submitWebhookUrl: "https://mlmotiv.app.n8n.cloud/webhook/marketing-miniapp-submit",
  apiWebhookUrl: "https://mlmotiv.app.n8n.cloud/webhook/marketing-miniapp-api"
};

const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  try { tg.expand(); } catch {}
}

const state = {
  role: "marketer",
  telegram_id: "",
  username: "",
  first_name: "",
  last_name: "",
  editMode: false,
  currentReportKey: null,
  statusTimer: null
};

const $ = (id) => document.getElementById(id);
const els = {
  userPill: $("userPill"),
  tabs: $("topTabs"),
  adminCyclesTab: $("adminCyclesTab"),
  adminHistoryTab: $("adminHistoryTab"),
  formTitle: $("formTitle"),
  editBadge: $("editBadge"),
  cycle: $("cycle"),
  editingReportKey: $("editingReportKey"),
  geoList: $("geoList"),
  geoTemplate: $("geoTemplate"),
  addGeoBtn: $("addGeoBtn"),
  totalGeo: $("totalGeo"),
  totalSpend: $("totalSpend"),
  totalPdp: $("totalPdp"),
  totalAvg: $("totalAvg"),
  resetBtn: $("resetBtn"),
  previewBtn: $("previewBtn"),
  submitBtn: $("submitBtn"),
  myReportsList: $("myReportsList"),
  refreshMyReportsBtn: $("refreshMyReportsBtn"),
  adminCyclesList: $("adminCyclesList"),
  refreshAdminCyclesBtn: $("refreshAdminCyclesBtn"),
  adminHistoryList: $("adminHistoryList"),
  refreshAdminHistoryBtn: $("refreshAdminHistoryBtn"),
  previewCard: $("previewCard"),
  previewText: $("previewText"),
  closePreviewBtn: $("closePreviewBtn"),
  statusCard: $("statusCard"),
  statusText: $("statusText")
};

function parseAmount(value) {
  let s = String(value ?? "").trim();
  if (!s) return 0;
  s = s.replace(/\s+/g, "");
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    const sep = s.lastIndexOf(",") > s.lastIndexOf(".") ? "," : ".";
    s = sep === "," ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (hasComma) {
    s = /,[0-9]{1,2}$/.test(s) ? s.replace(",", ".") : s.replace(/,/g, "");
  } else if (hasDot && !/\.[0-9]{1,2}$/.test(s)) {
    s = s.replace(/\./g, "");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function formatMoney(v) {
  const n = Number(v) || 0;
  return n.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1") + "$";
}

function formatNumber(v) {
  const n = Number(v) || 0;
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, "");
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function showStatus(message, isError) {
  clearTimeout(state.statusTimer);
  els.statusCard.classList.remove("hidden", "error");
  if (isError) els.statusCard.classList.add("error");
  els.statusText.textContent = message;
  state.statusTimer = setTimeout(() => els.statusCard.classList.add("hidden"), 4000);
}

function readTelegramUser() {
  const u = tg?.initDataUnsafe?.user || {};
  state.telegram_id = u.id ? String(u.id) : "";
  state.username = u.username || "";
  state.first_name = u.first_name || "";
  state.last_name = u.last_name || "";
}

function renderUserPill() {
  const name = [state.first_name, state.last_name].filter(Boolean).join(" ") ||
               state.username || (state.telegram_id && `ID ${state.telegram_id}`) || "Гость";
  const role = state.role === "admin" ? " · Админ" : "";
  els.userPill.textContent = name + role;
}

async function apiCall(action, extra = {}) {
  const body = JSON.stringify({
    action,
    telegram_id: state.telegram_id,
    username: state.username,
    first_name: state.first_name,
    last_name: state.last_name,
    ...extra
  });
  const res = await fetch(CONFIG.apiWebhookUrl, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function submitNewReport(payload) {
  const res = await fetch(CONFIG.submitWebhookUrl, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({ action: "submit_report", ...payload })
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function switchTab(view) {
  document.querySelectorAll(".tab-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.view === view);
  });
  document.querySelectorAll(".view").forEach(v => {
    v.classList.toggle("active", v.id === `view-${view}`);
  });
  if (view === "my-reports") loadMyReports();
  else if (view === "admin-cycles") loadAdminCycles();
  else if (view === "admin-history") loadAdminHistory();
}

function renumberGeoRows() {
  [...els.geoList.children].forEach((el, i) => {
    const num = el.querySelector(".geo-number");
    if (num) num.textContent = `#${i + 1}`;
  });
  els.totalGeo.textContent = String(els.geoList.children.length);
}

function wireGeoRow(row) {
  const geoInput = row.querySelector(".geo-input");
  const spendInput = row.querySelector(".spend-input");
  const pdpInput = row.querySelector(".pdp-input");
  const planInput = row.querySelector(".plan-input");
  const avgOutput = row.querySelector(".avg-output");
  const removeBtn = row.querySelector(".remove-geo");

  const updateAvg = () => {
    const spend = parseAmount(spendInput.value);
    const pdp = parseAmount(pdpInput.value);
    avgOutput.textContent = pdp > 0 ? formatMoney(spend / pdp) : "0$";
    calcTotals();
  };
  spendInput.addEventListener("input", updateAvg);
  pdpInput.addEventListener("input", updateAvg);
  geoInput.addEventListener("input", calcTotals);

  removeBtn.addEventListener("click", () => {
    row.remove();
    renumberGeoRows();
    calcTotals();
  });

  return { geoInput, spendInput, pdpInput, planInput, avgOutput };
}

function addGeoRow(data = {}) {
  const fragment = els.geoTemplate.content.cloneNode(true);
  const row = fragment.querySelector(".geo-item");
  const fields = wireGeoRow(row);

  fields.geoInput.value = data.geo || "";
  fields.spendInput.value = data.spend != null && data.spend !== "" ? formatNumber(data.spend) : "";
  fields.pdpInput.value = data.pdp != null && data.pdp !== "" ? formatNumber(data.pdp) : "";
  fields.planInput.value = data.next_cycle_plan || data.plan || "";

  els.geoList.appendChild(row);
  renumberGeoRows();

  const spend = parseAmount(fields.spendInput.value);
  const pdp = parseAmount(fields.pdpInput.value);
  fields.avgOutput.textContent = pdp > 0 ? formatMoney(spend / pdp) : "0$";

  calcTotals();
  return row;
}

function collectItems() {
  return [...els.geoList.children].map(row => ({
    geo: row.querySelector(".geo-input").value.trim(),
    spend: parseAmount(row.querySelector(".spend-input").value),
    pdp: parseAmount(row.querySelector(".pdp-input").value),
    next_cycle_plan: row.querySelector(".plan-input").value.trim()
  }));
}

function calcTotals() {
  const items = collectItems();
  const totalSpend = items.reduce((a, b) => a + b.spend, 0);
  const totalPdp = items.reduce((a, b) => a + b.pdp, 0);
  els.totalGeo.textContent = String(items.length);
  els.totalSpend.textContent = formatMoney(totalSpend);
  els.totalPdp.textContent = formatNumber(totalPdp);
  els.totalAvg.textContent = totalPdp > 0 ? formatMoney(totalSpend / totalPdp) : "0$";
}

function setEditMode(on, reportKey = null) {
  state.editMode = on;
  state.currentReportKey = reportKey;
  els.editingReportKey.value = reportKey || "";
  els.editBadge.classList.toggle("hidden", !on);
  els.formTitle.textContent = on ? "Редактирование отчёта" : "Новый отчёт";
  els.submitBtn.textContent = on ? "Сохранить" : "Отправить";
}

function resetForm() {
  els.cycle.value = "";
  els.geoList.innerHTML = "";
  setEditMode(false);
  addGeoRow();
  els.previewCard.classList.add("hidden");
}

function buildPreview() {
  const cycle = els.cycle.value.trim() || "—";
  const items = collectItems();
  const lines = [`Цикл: ${cycle}`, `GEO: ${items.length}`, ""];
  items.forEach((it, i) => {
    const avg = it.pdp > 0 ? formatMoney(it.spend / it.pdp) : "0$";
    lines.push(`${i + 1}. ${it.geo || "—"}`);
    lines.push(`   Расход: ${formatMoney(it.spend)}  ПДП: ${formatNumber(it.pdp)}  Ц/ПДП: ${avg}`);
    if (it.next_cycle_plan) lines.push(`   План: ${it.next_cycle_plan}`);
    lines.push("");
  });
  const totalSpend = items.reduce((a, b) => a + b.spend, 0);
  const totalPdp = items.reduce((a, b) => a + b.pdp, 0);
  lines.push(`Итого: расход ${formatMoney(totalSpend)}, ПДП ${formatNumber(totalPdp)}`);
  els.previewText.textContent = lines.join("\n");
  els.previewCard.classList.remove("hidden");
}

function validateForm() {
  const cycle = els.cycle.value.trim();
  if (!cycle) return "Укажи номер цикла";
  const items = collectItems();
  if (!items.length) return "Добавь хотя бы одно GEO";
  const bad = items.findIndex(it => !it.geo);
  if (bad >= 0) return `В строке ${bad + 1} не указано GEO`;
  return null;
}

async function submitForm() {
  const error = validateForm();
  if (error) return showStatus(error, true);
  if (!state.telegram_id) return showStatus("Не удалось определить Telegram ID — открой форму через Telegram", true);

  const payload = {
    telegram_id: state.telegram_id,
    username: state.username,
    first_name: state.first_name,
    last_name: state.last_name,
    cycle: els.cycle.value.trim(),
    report_key: state.editMode ? state.currentReportKey : undefined,
    items: collectItems()
  };

  els.submitBtn.disabled = true;
  try {
    const result = state.editMode
      ? await apiCall("save_report_edit", payload)
      : await submitNewReport(payload);
    if (result && result.ok === false) {
      showStatus(result.message || "Не удалось сохранить", true);
    } else {
      showStatus(state.editMode ? "Изменения сохранены" : "Отчёт отправлен");
      resetForm();
      switchTab("my-reports");
    }
  } catch (e) {
    showStatus(`Ошибка отправки: ${e.message}`, true);
  } finally {
    els.submitBtn.disabled = false;
  }
}

async function loadMyReports() {
  els.myReportsList.innerHTML = '<div class="empty-state">Загрузка…</div>';
  try {
    const data = await apiCall("get_my_reports");
    const rows = Array.isArray(data) ? data : [];
    renderMyReports(rows);
  } catch (e) {
    els.myReportsList.innerHTML = `<div class="empty-state">Ошибка: ${escapeHtml(e.message)}</div>`;
  }
}

function renderMyReports(rows) {
  if (!rows.length) {
    els.myReportsList.innerHTML = '<div class="empty-state">Пока нет отчётов</div>';
    return;
  }
  els.myReportsList.innerHTML = "";
  rows.forEach(r => {
    const card = document.createElement("div");
    card.className = "report-card";
    card.innerHTML = `
      <div class="section-head">
        <h3>Цикл ${escapeHtml(r.cycle)}</h3>
        <span class="badge">${Number(r.total_geo) || 0} GEO</span>
      </div>
      <div class="kpi-row">
        <div class="kpi"><span>Расход</span><strong>${formatMoney(r.total_spend)}</strong></div>
        <div class="kpi"><span>ПДП</span><strong>${formatNumber(r.total_pdp)}</strong></div>
        <div class="kpi"><span>Ц/ПДП</span><strong>${formatMoney(r.avg_pdp_cost)}</strong></div>
        <div class="kpi"><span>Обновлён</span><strong>${escapeHtml(r.updated_at || "—")}</strong></div>
      </div>
      <div class="card-actions">
        <button class="btn btn-secondary" data-edit="${escapeHtml(r.report_key)}">Редактировать</button>
      </div>
    `;
    card.querySelector("[data-edit]").addEventListener("click", () => openReportForEdit(r.report_key));
    els.myReportsList.appendChild(card);
  });
}

async function openReportForEdit(reportKey) {
  try {
    const data = await apiCall("get_report_details", { report_key: reportKey });
    if (!data || data.ok === false) {
      showStatus(data?.message || "Отчёт не найден", true);
      return;
    }
    els.cycle.value = data.cycle || "";
    els.geoList.innerHTML = "";
    const items = Array.isArray(data.items) ? data.items : [];
    if (items.length) items.forEach(it => addGeoRow(it));
    else addGeoRow();
    setEditMode(true, data.report_key || reportKey);
    switchTab("new-report");
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (e) {
    showStatus(`Ошибка загрузки: ${e.message}`, true);
  }
}

async function loadAdminCycles() {
  els.adminCyclesList.innerHTML = '<div class="empty-state">Загрузка…</div>';
  try {
    const data = await apiCall("get_admin_cycles");
    if (data && data.ok === false) {
      els.adminCyclesList.innerHTML = `<div class="empty-state">${escapeHtml(data.message || "Нет доступа")}</div>`;
      return;
    }
    const rows = Array.isArray(data) ? data : [];
    renderAdminCycles(rows);
  } catch (e) {
    els.adminCyclesList.innerHTML = `<div class="empty-state">Ошибка: ${escapeHtml(e.message)}</div>`;
  }
}

function renderAdminCycles(rows) {
  if (!rows.length) {
    els.adminCyclesList.innerHTML = '<div class="empty-state">Нет данных по циклам</div>';
    return;
  }
  els.adminCyclesList.innerHTML = "";
  rows.forEach(r => {
    const card = document.createElement("div");
    card.className = "cycle-card";
    card.innerHTML = `
      <div class="section-head">
        <h3>Цикл ${escapeHtml(r.cycle)}</h3>
        <span class="badge">${Number(r.marketers_count) || 0} маркетологов</span>
      </div>
      <div class="kpi-row">
        <div class="kpi"><span>Расход</span><strong>${formatMoney(r.total_spend)}</strong></div>
        <div class="kpi"><span>ПДП</span><strong>${formatNumber(r.total_pdp)}</strong></div>
        <div class="kpi"><span>Ц/ПДП</span><strong>${formatMoney(r.avg_pdp_cost)}</strong></div>
        <div class="kpi"><span>GEO</span><strong>${Number(r.total_geo) || 0}</strong></div>
      </div>
    `;
    els.adminCyclesList.appendChild(card);
  });
}

async function loadAdminHistory() {
  els.adminHistoryList.innerHTML = '<div class="empty-state">Загрузка…</div>';
  try {
    const data = await apiCall("get_admin_history");
    if (data && data.ok === false) {
      els.adminHistoryList.innerHTML = `<div class="empty-state">${escapeHtml(data.message || "Нет доступа")}</div>`;
      return;
    }
    const rows = Array.isArray(data) ? data : [];
    renderAdminHistory(rows);
  } catch (e) {
    els.adminHistoryList.innerHTML = `<div class="empty-state">Ошибка: ${escapeHtml(e.message)}</div>`;
  }
}

function renderAdminHistory(rows) {
  if (!rows.length) {
    els.adminHistoryList.innerHTML = '<div class="empty-state">История пуста</div>';
    return;
  }
  els.adminHistoryList.innerHTML = "";
  rows.forEach(r => {
    const card = document.createElement("div");
    card.className = "history-card";
    card.innerHTML = `
      <div class="section-head">
        <h3>Цикл ${escapeHtml(r.cycle)}</h3>
        <span class="badge">${Number(r.total_geo) || 0} GEO</span>
      </div>
      <div class="meta-row">
        <span>${escapeHtml(r.marketer || r.username || r.telegram_id || "—")}</span>
        <span>${escapeHtml(r.updated_at || "—")}</span>
      </div>
      <div class="kpi-row">
        <div class="kpi"><span>Расход</span><strong>${formatMoney(r.total_spend)}</strong></div>
        <div class="kpi"><span>ПДП</span><strong>${formatNumber(r.total_pdp)}</strong></div>
      </div>
    `;
    els.adminHistoryList.appendChild(card);
  });
}

async function loadContext() {
  try {
    const ctx = await apiCall("get_context");
    state.role = ctx?.role === "admin" ? "admin" : "marketer";
  } catch {
    state.role = "marketer";
  }
  const isAdmin = state.role === "admin";
  els.adminCyclesTab.classList.toggle("hidden", !isAdmin);
  els.adminHistoryTab.classList.toggle("hidden", !isAdmin);
  renderUserPill();
}

function wireEvents() {
  els.tabs.addEventListener("click", (e) => {
    const btn = e.target.closest(".tab-btn");
    if (!btn) return;
    switchTab(btn.dataset.view);
  });
  els.addGeoBtn.addEventListener("click", () => addGeoRow());
  els.resetBtn.addEventListener("click", () => {
    if (state.editMode && !confirm("Выйти из режима редактирования без сохранения?")) return;
    resetForm();
  });
  els.previewBtn.addEventListener("click", buildPreview);
  els.closePreviewBtn.addEventListener("click", () => els.previewCard.classList.add("hidden"));
  els.submitBtn.addEventListener("click", submitForm);
  els.refreshMyReportsBtn.addEventListener("click", loadMyReports);
  els.refreshAdminCyclesBtn.addEventListener("click", loadAdminCycles);
  els.refreshAdminHistoryBtn.addEventListener("click", loadAdminHistory);
}

async function init() {
  readTelegramUser();
  renderUserPill();
  wireEvents();
  addGeoRow();
  await loadContext();
}

init();
