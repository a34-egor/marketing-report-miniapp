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
  currentReportKey: null
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
  toastContainer: $("toastContainer")
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

function formatDateShort(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso).slice(0, 10);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}`;
}

function formatDateTimeShort(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso).slice(0, 16);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}.${mm} ${hh}:${mi}`;
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function openExternal(url) {
  if (!url) return;
  if (tg && typeof tg.openLink === "function") tg.openLink(url);
  else window.open(url, "_blank", "noopener");
}

function openTgLink(url) {
  if (!url) return;
  if (tg && typeof tg.openTelegramLink === "function") {
    tg.openTelegramLink(url);
    return;
  }
  if (tg && typeof tg.openLink === "function") {
    tg.openLink(url);
    return;
  }
  window.open(url, "_blank", "noopener");
}

const DRAFT_KEY_PREFIX = "mr_draft_";
let saveDraftTimer = null;

function draftKey() {
  return state.telegram_id ? `${DRAFT_KEY_PREFIX}${state.telegram_id}` : null;
}

function saveDraft() {
  if (state.editMode) return;
  const key = draftKey();
  if (!key) return;
  const cycle = els.cycle.value.trim();
  const items = collectItems();
  const hasContent = cycle ||
    items.some(it => it.geo || it.spend || it.pdp || it.next_cycle_plan);
  try {
    if (!hasContent) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify({ cycle, items, saved_at: Date.now() }));
  } catch {}
}

function scheduleSaveDraft() {
  clearTimeout(saveDraftTimer);
  saveDraftTimer = setTimeout(saveDraft, 600);
}

function clearDraft() {
  const key = draftKey();
  if (!key) return;
  try { localStorage.removeItem(key); } catch {}
}

function loadDraft() {
  if (state.editMode) return false;
  const key = draftKey();
  if (!key) return false;
  let draft = null;
  try {
    const raw = localStorage.getItem(key);
    if (raw) draft = JSON.parse(raw);
  } catch {}
  if (!draft) return false;
  const cycle = typeof draft.cycle === "string" ? draft.cycle : "";
  const items = Array.isArray(draft.items) ? draft.items : [];
  const hasContent = cycle || items.some(it => it.geo || it.spend || it.pdp || it.next_cycle_plan);
  if (!hasContent) return false;
  els.cycle.value = cycle;
  els.geoList.innerHTML = "";
  if (items.length) items.forEach(it => addGeoRow(it));
  else addGeoRow();
  showToast("Восстановлен черновик");
  return true;
}

function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = "toast" + (type === "error" ? " toast-error" : type === "success" ? " toast-success" : "");
  toast.textContent = message;
  els.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("out");
    setTimeout(() => toast.remove(), 200);
  }, 3500);
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
  const text = await res.text();
  if (!text.trim()) return [];
  try { return JSON.parse(text); }
  catch { return []; }
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
    scheduleSaveDraft();
  };
  spendInput.addEventListener("input", updateAvg);
  pdpInput.addEventListener("input", updateAvg);
  geoInput.addEventListener("input", () => { calcTotals(); scheduleSaveDraft(); });
  planInput.addEventListener("input", scheduleSaveDraft);

  removeBtn.addEventListener("click", () => {
    row.remove();
    renumberGeoRows();
    calcTotals();
    scheduleSaveDraft();
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
  const planText = data.next_cycle_plan || data.plan || "";
  fields.planInput.value = planText;
  if (planText) {
    const details = row.querySelector(".plan-details");
    if (details) details.open = true;
  }

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
  const lines = [`Цикл: ${cycle}`, `ГЕО: ${items.length}`, ""];
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
  const fail = (msg, field) => {
    if (field) {
      (field.closest(".geo-item") || field).scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => field.focus(), 300);
    }
    return msg;
  };
  if (!els.cycle.value.trim()) return fail("Укажи номер цикла", els.cycle);
  const rows = [...els.geoList.children];
  if (!rows.length) return "Добавь хотя бы одно ГЕО";
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const n = i + 1;
    const geo = row.querySelector(".geo-input");
    const spend = row.querySelector(".spend-input");
    const pdp = row.querySelector(".pdp-input");
    const plan = row.querySelector(".plan-input");
    if (!geo.value.trim()) return fail(`ГЕО #${n}: не указано название`, geo);
    if (!spend.value.trim()) return fail(`ГЕО #${n}: не указан расход`, spend);
    if (!pdp.value.trim()) return fail(`ГЕО #${n}: не указано ПДП`, pdp);
    if (!plan.value.trim()) {
      const details = row.querySelector(".plan-details");
      if (details) details.open = true;
      return fail(`ГЕО #${n}: не указан план`, plan);
    }
  }
  const seen = new Map();
  for (let i = 0; i < rows.length; i++) {
    const geoInput = rows[i].querySelector(".geo-input");
    const key = geoInput.value.trim().toLowerCase();
    if (seen.has(key)) {
      const first = seen.get(key) + 1;
      return fail(`ГЕО #${i + 1}: "${geoInput.value.trim()}" уже было в строке #${first}`, geoInput);
    }
    seen.set(key, i);
  }
  return null;
}

async function submitForm() {
  const error = validateForm();
  if (error) return showToast(error, "error");
  if (!state.telegram_id) return showToast("Не удалось определить Telegram ID — открой форму через Telegram", "error");

  const payload = {
    telegram_id: state.telegram_id,
    username: state.username,
    first_name: state.first_name,
    last_name: state.last_name,
    cycle: els.cycle.value.trim(),
    report_key: state.editMode ? state.currentReportKey : undefined,
    items: collectItems()
  };

  const finishedText = state.editMode ? "Сохранить" : "Отправить";
  const loadingText = state.editMode ? "Сохранение…" : "Отправка…";
  els.submitBtn.classList.add("is-loading");
  els.submitBtn.textContent = loadingText;
  els.submitBtn.disabled = true;
  try {
    const result = state.editMode
      ? await apiCall("save_report_edit", payload)
      : await submitNewReport(payload);
    if (result && result.ok === false) {
      showToast(result.message || "Не удалось сохранить", "error");
      els.submitBtn.textContent = finishedText;
    } else {
      const wasEdit = state.editMode;
      showToast(wasEdit ? "Изменения сохранены" : "Отчёт отправлен", "success");
      if (!wasEdit) clearDraft();
      resetForm();
      switchTab("my-reports");
    }
  } catch (e) {
    showToast(`Ошибка отправки: ${e.message}`, "error");
    els.submitBtn.textContent = finishedText;
  } finally {
    els.submitBtn.classList.remove("is-loading");
    els.submitBtn.disabled = false;
  }
}

async function loadMyReports() {
  els.myReportsList.innerHTML = '<div class="empty-state">Загрузка…</div>';
  try {
    const data = await apiCall("get_my_reports");
    const rows = Array.isArray(data?.reports) ? data.reports : (Array.isArray(data) ? data : []);
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
    const items = Array.isArray(r.items) ? r.items : [];
    const itemsHtml = items.length
      ? `<div class="report-items">${items.map(it => {
          const spend = formatMoney(it.spend);
          const pdp = formatNumber(it.pdp);
          return `<div class="report-item">
            <span class="report-item-name">${escapeHtml(it.geo || "—")}</span>
            <span class="report-item-stats">${spend} · ${pdp} ПДП</span>
          </div>`;
        }).join("")}</div>`
      : "";
    const card = document.createElement("div");
    card.className = "report-card";
    card.innerHTML = `
      <div class="section-head">
        <h3>Цикл ${escapeHtml(r.cycle)}</h3>
        <span class="meta-stamp">${escapeHtml(formatDateShort(r.updated_at))}</span>
      </div>
      <div class="kpi-row kpi-row-3">
        <div class="kpi"><span>Расход</span><strong>${formatMoney(r.total_spend)}</strong></div>
        <div class="kpi"><span>ПДП</span><strong>${formatNumber(r.total_pdp)}</strong></div>
        <div class="kpi"><span>Ц/ПДП</span><strong>${formatMoney(r.avg_pdp_cost)}</strong></div>
      </div>
      ${itemsHtml}
      <div class="card-actions">
        <button class="btn btn-secondary btn-sm" data-edit="${escapeHtml(r.report_key)}">Редактировать</button>
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
      showToast(data?.message || "Отчёт не найден", "error");
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
    showToast(`Ошибка загрузки: ${e.message}`, "error");
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
    const rows = Array.isArray(data?.cycles) ? data.cycles : (Array.isArray(data) ? data : []);
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
    const filled = Array.isArray(r.filled) ? r.filled : [];
    const missing = Array.isArray(r.missing) ? r.missing : [];
    const total = Number(r.marketers_total) || (filled.length + missing.length);
    const badge = total
      ? `${filled.length}/${total} сдали`
      : `${Number(r.marketers_count) || 0} маркетологов`;
    const renderName = (m) => {
      const tgLink = (uname) =>
        `<a class="tg-link" data-tg="${escapeHtml(uname)}" href="https://t.me/${escapeHtml(uname)}">@${escapeHtml(uname)}</a>`;
      if (m.name && m.username) {
        return escapeHtml(m.name) + ` <span class="status-meta">${tgLink(m.username)}</span>`;
      }
      if (m.username) return tgLink(m.username);
      return escapeHtml(m.name || m.telegram_id || "—");
    };
    const filledHtml = filled.length
      ? filled.map(m => `<div class="status-row status-filled"><span class="status-mark">✅</span><span>${renderName(m)}</span></div>`).join("")
      : '<div class="status-row status-empty">— никто</div>';
    const missingHtml = missing.length
      ? missing.map(m => `<div class="status-row status-missing"><span class="status-mark">❌</span><span>${renderName(m)}</span></div>`).join("")
      : '<div class="status-row status-empty">— все сдали 🎉</div>';
    const breakdownHtml = total
      ? `<div class="status-list">
          <div class="status-group">
            <div class="status-group-title">Сдали (${filled.length})</div>
            ${filledHtml}
          </div>
          <div class="status-group">
            <div class="status-group-title">Не сдали (${missing.length})</div>
            ${missingHtml}
          </div>
        </div>`
      : "";
    const card = document.createElement("div");
    card.className = "cycle-card" + (r.is_active ? " cycle-card-active" : "");
    const activeMark = r.is_active ? '<span class="badge badge-active">Активный</span>' : "";
    const jiraHtml = r.jira_url
      ? `<div class="card-actions"><button class="btn btn-secondary btn-sm jira-link" data-url="${escapeHtml(r.jira_url)}">Открыть в Jira →</button></div>`
      : "";
    card.innerHTML = `
      <div class="section-head">
        <h3>Цикл ${escapeHtml(r.cycle)} ${activeMark}</h3>
        <span class="badge">${escapeHtml(badge)}</span>
      </div>
      <div class="kpi-row kpi-row-3">
        <div class="kpi"><span>Расход</span><strong>${formatMoney(r.total_spend)}</strong></div>
        <div class="kpi"><span>ПДП</span><strong>${formatNumber(r.total_pdp)}</strong></div>
        <div class="kpi"><span>Ц/ПДП</span><strong>${formatMoney(r.avg_pdp_cost)}</strong></div>
      </div>
      ${breakdownHtml}
      ${jiraHtml}
    `;
    const jiraBtn = card.querySelector(".jira-link");
    if (jiraBtn) jiraBtn.addEventListener("click", () => openExternal(jiraBtn.dataset.url));
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
    const rows = Array.isArray(data?.history) ? data.history : (Array.isArray(data) ? data : []);
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
  const MARK = { added: "+", changed: "∆", removed: "−", unchanged: "", initial: "" };
  function formatStats(spend, pdp) {
    return `${formatMoney(spend)} · ${formatNumber(pdp)} ПДП`;
  }
  function renderItem(it) {
    const change = it.change || "initial";
    const marker = MARK[change] || "";
    const cls = `report-item is-${change}`;
    const stats = formatStats(it.spend, it.pdp);
    const planChanged = change === "changed" && it.prev &&
      String(it.prev.next_cycle_plan || "").trim() !== String(it.next_cycle_plan || "").trim();
    let prevLine = "";
    if (change === "changed" && it.prev) {
      const prevStats = formatStats(it.prev.spend, it.prev.pdp);
      const numChanged = Number(it.prev.spend || 0) !== Number(it.spend || 0) ||
                         Number(it.prev.pdp || 0) !== Number(it.pdp || 0);
      const planBit = planChanged ? `<div class="diff-plan">план: <s>${escapeHtml(it.prev.next_cycle_plan || "—")}</s> → ${escapeHtml(it.next_cycle_plan || "—")}</div>` : "";
      const numBit = numChanged ? `<div class="diff-prev"><s>${prevStats}</s> → <strong>${stats}</strong></div>` : "";
      prevLine = numBit + planBit;
    }
    const statsBlock = (change === "changed" || change === "removed")
      ? "" // shown via prevLine or strikethrough container
      : `<span class="report-item-stats">${stats}</span>`;
    const removedStats = change === "removed"
      ? `<span class="report-item-stats"><s>${stats}</s></span>`
      : "";
    return `
      <div class="${cls}">
        <div class="report-item-row">
          ${marker ? `<span class="diff-marker">${marker}</span>` : ""}
          <span class="report-item-name">${escapeHtml(it.geo || "—")}</span>
          ${statsBlock}
          ${removedStats}
        </div>
        ${prevLine}
      </div>`;
  }

  els.adminHistoryList.innerHTML = "";
  rows.forEach(r => {
    const items = Array.isArray(r.items) ? r.items : [];
    const itemsHtml = items.length
      ? `<div class="report-items diff-items">${items.map(renderItem).join("")}</div>`
      : "";
    const tgLink = r.username
      ? `<a class="tg-link" data-tg="${escapeHtml(r.username)}" href="https://t.me/${escapeHtml(r.username)}">@${escapeHtml(r.username)}</a>`
      : "";
    let whoHtml;
    if (r.marketer && r.username) whoHtml = `${escapeHtml(r.marketer)} (${tgLink})`;
    else if (r.username) whoHtml = tgLink;
    else whoHtml = escapeHtml(r.marketer || r.telegram_id || "—");
    const versionBadge = r.has_prev
      ? `<span class="badge badge-neutral">v${Number(r.version) || ""}</span>`
      : `<span class="badge">Первая версия</span>`;
    const card = document.createElement("div");
    card.className = "history-card";
    card.innerHTML = `
      <div class="section-head">
        <h3>Цикл ${escapeHtml(r.cycle)} ${versionBadge}</h3>
        <span class="meta-stamp">${escapeHtml(formatDateTimeShort(r.updated_at))}</span>
      </div>
      <div class="meta-row">
        <span>${whoHtml}</span>
      </div>
      <div class="kpi-row kpi-row-3">
        <div class="kpi"><span>ГЕО</span><strong>${Number(r.total_geo) || 0}</strong></div>
        <div class="kpi"><span>Расход</span><strong>${formatMoney(r.total_spend)}</strong></div>
        <div class="kpi"><span>ПДП</span><strong>${formatNumber(r.total_pdp)}</strong></div>
      </div>
      ${itemsHtml}
    `;
    els.adminHistoryList.appendChild(card);
  });
}

let didAutoRoute = false;

function applyRoleToUI() {
  const isAdmin = state.role === "admin";
  const isDenied = state.role === "denied";
  const isOk = isAdmin || state.role === "marketer";
  document.body.classList.toggle("app-loading", !isOk && !isDenied);
  document.body.classList.toggle("app-denied", isDenied);
  document.body.classList.toggle("app-ok", isOk);
  els.adminCyclesTab.classList.toggle("hidden", !isAdmin);
  els.adminHistoryTab.classList.toggle("hidden", !isAdmin);
  renderUserPill();
  autoRouteIfAdmin();
}

function autoRouteIfAdmin() {
  if (didAutoRoute) return;
  if (state.role !== "admin") return;
  // Skip auto-route if user has already started filling the form
  if (els.cycle.value || els.geoList.querySelector(".geo-input")?.value) {
    didAutoRoute = true;
    return;
  }
  didAutoRoute = true;
  switchTab("admin-cycles");
}

function roleCacheKey() {
  return state.telegram_id ? `mr_role_${state.telegram_id}` : null;
}

async function loadContext() {
  const key = roleCacheKey();
  const validRoles = new Set(["admin", "marketer", "denied"]);
  if (key) {
    try {
      const cached = localStorage.getItem(key);
      if (validRoles.has(cached)) {
        state.role = cached;
        applyRoleToUI();
      }
    } catch {}
  }
  try {
    const ctx = await apiCall("get_context");
    const role = ctx?.role;
    state.role = validRoles.has(role) ? role : "marketer";
    if (key) try { localStorage.setItem(key, state.role); } catch {}
  } catch {
    if (!state.role) state.role = "marketer";
  }
  applyRoleToUI();
}

function wireEvents() {
  document.addEventListener("click", (e) => {
    const link = e.target.closest(".tg-link");
    if (!link) return;
    e.preventDefault();
    const uname = link.dataset.tg;
    if (uname) openTgLink(`https://t.me/${uname}`);
  });
  els.tabs.addEventListener("click", (e) => {
    const btn = e.target.closest(".tab-btn");
    if (!btn) return;
    switchTab(btn.dataset.view);
  });
  els.cycle.addEventListener("input", scheduleSaveDraft);
  els.addGeoBtn.addEventListener("click", () => { addGeoRow(); scheduleSaveDraft(); });
  els.resetBtn.addEventListener("click", () => {
    if (state.editMode && !confirm("Выйти из режима редактирования без сохранения?")) return;
    clearDraft();
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
  if (!loadDraft()) addGeoRow();
  await loadContext();
}

init();
