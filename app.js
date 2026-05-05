const CONFIG = {
  submitWebhookUrl: "https://mlmotiv.app.n8n.cloud/webhook/marketing-miniapp-submit",
  apiWebhookUrl: "https://mlmotiv.app.n8n.cloud/webhook/marketing-miniapp-api"
};

const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  try { tg.expand(); } catch {}
}

const useNativeMainButton = !!(tg && tg.MainButton);
function showMainButton(text) {
  if (!useNativeMainButton) return;
  if (text) tg.MainButton.setText(text);
  tg.MainButton.show();
}
function hideMainButton() {
  if (!useNativeMainButton) return;
  tg.MainButton.hide();
}
function setMainButtonLoading(on) {
  if (!useNativeMainButton) return;
  if (on) tg.MainButton.showProgress();
  else tg.MainButton.hideProgress();
}
function haptic(kind) {
  try { tg && tg.HapticFeedback && tg.HapticFeedback.notificationOccurred(kind); } catch {}
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
  newReportTab: $("newReportTab"),
  myReportsTab: $("myReportsTab"),
  copyPrevGeoBtn: $("copyPrevGeoBtn"),
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
  searchMyReports: $("searchMyReports"),
  adminCyclesList: $("adminCyclesList"),
  refreshAdminCyclesBtn: $("refreshAdminCyclesBtn"),
  searchAdminCycles: $("searchAdminCycles"),
  adminHistoryList: $("adminHistoryList"),
  refreshAdminHistoryBtn: $("refreshAdminHistoryBtn"),
  searchAdminHistory: $("searchAdminHistory"),
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

function renderDelta(pct) {
  if (pct == null || !Number.isFinite(Number(pct))) return "";
  const v = Number(pct);
  if (Math.abs(v) < 0.05) return `<span class="delta delta-zero">=</span>`;
  const cls = v > 0 ? "delta-up" : "delta-down";
  const arrow = v > 0 ? "↑" : "↓";
  const abs = Math.abs(v).toFixed(Math.abs(v) < 10 ? 1 : 0).replace(/\.0$/, "");
  return `<span class="delta ${cls}">${arrow} ${abs}%</span>`;
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

const SKELETON_LIST_HTML = (() => {
  const card = `
    <div class="skeleton-card">
      <div class="skeleton-line" style="width:35%"></div>
      <div class="skeleton-line skeleton-line-tall" style="width:60%"></div>
      <div class="skeleton-line" style="width:80%"></div>
    </div>`;
  return card.repeat(3);
})();

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

// Storage abstraction — Telegram CloudStorage when in TG (cross-device sync),
// localStorage as fallback for browser preview.
const useCloudStorage = !!(tg && tg.CloudStorage);
function storageGet(key) {
  return new Promise((resolve) => {
    if (useCloudStorage) {
      tg.CloudStorage.getItem(key, (err, value) => resolve(err ? null : (value || null)));
    } else {
      try { resolve(localStorage.getItem(key)); } catch { resolve(null); }
    }
  });
}
function storageSet(key, value) {
  return new Promise((resolve) => {
    if (useCloudStorage) {
      tg.CloudStorage.setItem(key, value, () => resolve());
    } else {
      try { localStorage.setItem(key, value); } catch {}
      resolve();
    }
  });
}
function storageRemove(key) {
  return new Promise((resolve) => {
    if (useCloudStorage) {
      tg.CloudStorage.removeItem(key, () => resolve());
    } else {
      try { localStorage.removeItem(key); } catch {}
      resolve();
    }
  });
}

function saveDraft() {
  if (state.editMode) return;
  const key = draftKey();
  if (!key) return;
  const cycle = els.cycle.value.trim();
  const items = collectItems();
  const hasContent = cycle ||
    items.some(it => it.geo || it.spend || it.pdp || it.next_cycle_plan);
  if (!hasContent) storageRemove(key);
  else storageSet(key, JSON.stringify({ cycle, items, saved_at: Date.now() }));
}

function scheduleSaveDraft() {
  clearTimeout(saveDraftTimer);
  saveDraftTimer = setTimeout(saveDraft, 600);
}

function clearDraft() {
  const key = draftKey();
  if (key) storageRemove(key);
}

async function loadDraft() {
  if (state.editMode) return false;
  const key = draftKey();
  if (!key) return false;
  let draft = null;
  try {
    const raw = await storageGet(key);
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
  const cls = type === "error" ? " toast-error"
    : type === "success" ? " toast-success"
    : type === "warning" ? " toast-warning"
    : "";
  toast.className = "toast" + cls;
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
  if (view === "new-report") {
    showMainButton(state.editMode ? "Сохранить" : "Отправить");
  } else {
    hideMainButton();
  }
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

function setEditMode(on, reportKey = null, marketerInfo = null) {
  state.editMode = on;
  state.currentReportKey = reportKey;
  state.editingMarketer = marketerInfo;
  els.editingReportKey.value = reportKey || "";
  els.editBadge.classList.toggle("hidden", !on);
  if (on && marketerInfo && marketerInfo.name) {
    els.formTitle.textContent = `Редактирование · ${marketerInfo.name}`;
  } else if (on && marketerInfo && marketerInfo.username) {
    els.formTitle.textContent = `Редактирование · @${marketerInfo.username}`;
  } else {
    els.formTitle.textContent = on ? "Редактирование отчёта" : "Новый отчёт";
  }
  els.submitBtn.textContent = on ? "Сохранить" : "Отправить";
  // Hide "copy from previous" button when editing existing report
  if (els.copyPrevGeoBtn) els.copyPrevGeoBtn.classList.toggle("hidden", on);
  // Sync MainButton text if visible
  if (useNativeMainButton && document.getElementById("view-new-report")?.classList.contains("active")) {
    showMainButton(on ? "Сохранить" : "Отправить");
  }
  // Tab label changes for everyone; visibility toggled only for admin role
  if (els.newReportTab) {
    els.newReportTab.textContent = on ? "Редактирование" : "Новый";
    if (state.role === "admin") {
      els.newReportTab.classList.toggle("hidden", !on);
    }
  }
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
  if (error) {
    haptic("error");
    return showToast(error, "error");
  }
  if (!state.telegram_id) {
    haptic("error");
    return showToast("Не удалось определить Telegram ID — открой форму через Telegram", "error");
  }

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
  setMainButtonLoading(true);
  try {
    const result = state.editMode
      ? await apiCall("save_report_edit", payload)
      : await submitNewReport(payload);
    if (result && result.ok === false) {
      showToast(result.message || "Не удалось сохранить", "error");
      els.submitBtn.textContent = finishedText;
      haptic("error");
    } else {
      const wasEdit = state.editMode;
      const noChange = !!(result && result.no_change);
      if (noChange) {
        showToast(result.message || "Без изменений", "warning");
        haptic("warning");
      } else {
        showToast(wasEdit ? "Изменения сохранены" : "Отчёт отправлен", "success");
        haptic("success");
      }
      if (!wasEdit) clearDraft();
      resetForm();
      // Admin doesn't have "Мои отчёты" — send back to Циклы
      switchTab(state.role === "admin" ? "admin-cycles" : "my-reports");
    }
  } catch (e) {
    showToast(`Ошибка отправки: ${e.message}`, "error");
    els.submitBtn.textContent = finishedText;
    haptic("error");
  } finally {
    els.submitBtn.classList.remove("is-loading");
    els.submitBtn.disabled = false;
    setMainButtonLoading(false);
  }
}

let cachedMyReports = [];
let cachedAdminCycles = [];
let cachedAdminHistory = [];
let myReportsPrefetch = null;

function filterByQuery(rows, q, fields) {
  const s = String(q || "").toLowerCase().trim();
  if (!s) return rows;
  return rows.filter(r => fields.some(f => {
    const v = f(r);
    return v && String(v).toLowerCase().includes(s);
  }));
}

async function copyPrevCycleGeo() {
  // Use cached results, prefer awaiting the in-flight prefetch over a fresh call
  let reports = cachedMyReports;
  if ((!reports || !reports.length) && myReportsPrefetch) {
    try { await myReportsPrefetch; reports = cachedMyReports; } catch {}
  }
  if (!reports || !reports.length) {
    try {
      const data = await apiCall("get_my_reports");
      reports = Array.isArray(data?.reports) ? data.reports : [];
      cachedMyReports = reports;
    } catch (e) {
      showToast(`Не удалось получить отчёты: ${e.message}`, "error");
      return;
    }
  }
  if (!reports.length) {
    showToast("Нет прошлых отчётов для копирования", "warning");
    return;
  }
  // Pick most recent numeric cycle (or latest by updated_at as fallback)
  const sorted = [...reports].sort((a, b) => {
    const an = Number(a.cycle), bn = Number(b.cycle);
    if (Number.isFinite(an) && Number.isFinite(bn)) return bn - an;
    return String(b.updated_at || "").localeCompare(String(a.updated_at || ""));
  });
  const prev = sorted[0];
  const items = Array.isArray(prev.items) ? prev.items : [];
  if (!items.length) {
    showToast("В прошлом отчёте нет ГЕО", "warning");
    return;
  }
  const names = items.map(it => String(it.geo || "").trim()).filter(Boolean);
  const shown = names.slice(0, 8).join(", ");
  const more = names.length > 8 ? ` и ещё ${names.length - 8}` : "";
  if (!confirm(`Скопировать ${items.length} ГЕО из цикла ${prev.cycle}:\n${shown}${more}?\n\nТекущая структура заменится. Цифры и план переписываются вручную.`)) return;
  els.geoList.innerHTML = "";
  for (const it of items) addGeoRow({ geo: it.geo || "" });
  scheduleSaveDraft();
  showToast(`Скопировано ${items.length} ГЕО из цикла ${prev.cycle}`, "success");
  haptic("success");
}

async function loadMyReports() {
  els.myReportsList.innerHTML = SKELETON_LIST_HTML;
  try {
    const data = await apiCall("get_my_reports");
    const rows = Array.isArray(data?.reports) ? data.reports : (Array.isArray(data) ? data : []);
    cachedMyReports = rows;
    renderMyReports(filterByQuery(rows, els.searchMyReports?.value, [r => r.cycle, r => r.marketer]));
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
      ${r.editable === false ? "" : `
      <div class="card-actions">
        <button class="btn btn-secondary btn-sm" data-edit="${escapeHtml(r.report_key)}">Редактировать</button>
      </div>`}
    `;
    const editBtn = card.querySelector("[data-edit]");
    if (editBtn) editBtn.addEventListener("click", () => openReportForEdit(r.report_key));
    els.myReportsList.appendChild(card);
  });
}

async function openReportForEdit(reportKey, marketerInfo = null) {
  try {
    const data = await apiCall("get_report_details", { report_key: reportKey });
    if (!data || data.ok === false) {
      showToast(data?.message || "Отчёт не найден", "error");
      return;
    }
    // Prefer click-source info; fall back to whatever the report itself carries
    const info = (marketerInfo && (marketerInfo.name || marketerInfo.username))
      ? marketerInfo
      : (data.marketer || data.username
          ? { name: data.marketer || "", username: data.username || "" }
          : null);
    // For admin/superadmin always show marketer; for marketer editing own report info is null
    const isAdminLike = state.role === "admin" || state.role === "superadmin";
    const showInfo = isAdminLike ? info : null;
    els.cycle.value = data.cycle || "";
    els.geoList.innerHTML = "";
    const items = Array.isArray(data.items) ? data.items : [];
    if (items.length) items.forEach(it => addGeoRow(it));
    else addGeoRow();
    setEditMode(true, data.report_key || reportKey, showInfo);
    switchTab("new-report");
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (e) {
    showToast(`Ошибка загрузки: ${e.message}`, "error");
  }
}

async function loadAdminCycles() {
  els.adminCyclesList.innerHTML = SKELETON_LIST_HTML;
  try {
    const data = await apiCall("get_admin_cycles");
    if (data && data.ok === false) {
      els.adminCyclesList.innerHTML = `<div class="empty-state">${escapeHtml(data.message || "Нет доступа")}</div>`;
      return;
    }
    const rows = Array.isArray(data?.cycles) ? data.cycles : (Array.isArray(data) ? data : []);
    cachedAdminCycles = rows;
    renderAdminCycles(filterByQuery(rows, els.searchAdminCycles?.value, [
      r => r.cycle,
      r => (r.filled || []).map(m => `${m.name} ${m.username}`).join(" "),
      r => (r.missing || []).map(m => `${m.name} ${m.username}`).join(" "),
    ]));
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
      ? filled.map(m => {
          const rk = m.report_key || "";
          const attrs = rk
            ? ` data-edit-report="${escapeHtml(rk)}" data-edit-name="${escapeHtml(m.name || "")}" data-edit-username="${escapeHtml(m.username || "")}" role="button" tabindex="0"`
            : "";
          return `<div class="status-row status-filled${rk ? ' status-clickable' : ''}"${attrs}><span class="status-mark">✅</span><span>${renderName(m)}</span></div>`;
        }).join("")
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
        <div class="kpi"><span>Расход</span><strong>${formatMoney(r.total_spend)}</strong>${renderDelta(r.spend_delta_pct)}</div>
        <div class="kpi"><span>ПДП</span><strong>${formatNumber(r.total_pdp)}</strong>${renderDelta(r.pdp_delta_pct)}</div>
        <div class="kpi"><span>Ц/ПДП</span><strong>${formatMoney(r.avg_pdp_cost)}</strong></div>
      </div>
      ${breakdownHtml}
      ${jiraHtml}
    `;
    const jiraBtn = card.querySelector(".jira-link");
    if (jiraBtn) jiraBtn.addEventListener("click", () => openExternal(jiraBtn.dataset.url));
    card.querySelectorAll("[data-edit-report]").forEach(el => {
      el.addEventListener("click", (e) => {
        if (e.target.closest(".tg-link")) return; // username link → TG chat, not edit
        const rk = el.dataset.editReport;
        if (rk) openReportForEdit(rk, {
          name: el.dataset.editName || "",
          username: el.dataset.editUsername || ""
        });
      });
    });
    els.adminCyclesList.appendChild(card);
  });
}

async function loadAdminHistory() {
  els.adminHistoryList.innerHTML = SKELETON_LIST_HTML;
  try {
    const data = await apiCall("get_admin_history");
    if (data && data.ok === false) {
      els.adminHistoryList.innerHTML = `<div class="empty-state">${escapeHtml(data.message || "Нет доступа")}</div>`;
      return;
    }
    const rows = Array.isArray(data?.history) ? data.history : (Array.isArray(data) ? data : []);
    cachedAdminHistory = rows;
    renderAdminHistory(filterByQuery(rows, els.searchAdminHistory?.value, [
      r => r.cycle, r => r.marketer, r => r.username
    ]));
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
    function personHtml(name, username, tid) {
      const link = username
        ? `<a class="tg-link" data-tg="${escapeHtml(username)}" href="https://t.me/${escapeHtml(username)}">@${escapeHtml(username)}</a>`
        : "";
      if (name && username) return `${escapeHtml(name)} (${link})`;
      if (username) return link;
      return escapeHtml(name || tid || "—");
    }
    const ownerHtml = personHtml(r.owner_name, r.owner_username, r.owner_telegram_id);
    const editorHtml = personHtml(r.editor_name || r.marketer, r.editor_username || r.username, r.editor_telegram_id || r.telegram_id);
    const isAdminEdit = !!r.is_admin_edit;
    const metaHtml = isAdminEdit
      ? `<div class="meta-row"><span><b>Маркетолог:</b> ${ownerHtml}</span></div>
         <div class="meta-row"><span><b>Редактировал:</b> ${editorHtml}</span></div>`
      : `<div class="meta-row"><span>${ownerHtml || editorHtml}</span></div>`;
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
      ${metaHtml}
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
  const isSuperAdmin = state.role === "superadmin";
  const isMarketer = state.role === "marketer";
  const isDenied = state.role === "denied";
  const isOk = isAdmin || isSuperAdmin || isMarketer;
  document.body.classList.toggle("app-loading", !isOk && !isDenied);
  document.body.classList.toggle("app-denied", isDenied);
  document.body.classList.toggle("app-ok", isOk);
  // Marketer-side tabs visible to marketer + superadmin (admin-only sees just admin tabs)
  els.newReportTab.classList.toggle("hidden", isAdmin);
  els.myReportsTab.classList.toggle("hidden", isAdmin);
  // Admin-side tabs visible to admin + superadmin
  els.adminCyclesTab.classList.toggle("hidden", !(isAdmin || isSuperAdmin));
  els.adminHistoryTab.classList.toggle("hidden", !(isAdmin || isSuperAdmin));
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
  const validRoles = new Set(["admin", "superadmin", "marketer", "denied"]);
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
  els.copyPrevGeoBtn?.addEventListener("click", copyPrevCycleGeo);
  els.resetBtn.addEventListener("click", () => {
    if (state.editMode && !confirm("Выйти из режима редактирования без сохранения?")) return;
    const wasEditing = state.editMode;
    clearDraft();
    resetForm();
    // For admin: only after exiting an edit, return to Циклы (admin has no Новый/Мои tabs)
    if (wasEditing && state.role === "admin") switchTab("admin-cycles");
  });
  els.previewBtn.addEventListener("click", buildPreview);
  els.closePreviewBtn.addEventListener("click", () => els.previewCard.classList.add("hidden"));
  els.submitBtn.addEventListener("click", submitForm);
  els.refreshMyReportsBtn.addEventListener("click", loadMyReports);
  els.refreshAdminCyclesBtn.addEventListener("click", loadAdminCycles);
  els.refreshAdminHistoryBtn.addEventListener("click", loadAdminHistory);
  els.searchMyReports?.addEventListener("input", () => {
    renderMyReports(filterByQuery(cachedMyReports, els.searchMyReports.value, [r => r.cycle, r => r.marketer]));
  });
  els.searchAdminCycles?.addEventListener("input", () => {
    renderAdminCycles(filterByQuery(cachedAdminCycles, els.searchAdminCycles.value, [
      r => r.cycle,
      r => (r.filled || []).map(m => `${m.name} ${m.username}`).join(" "),
      r => (r.missing || []).map(m => `${m.name} ${m.username}`).join(" "),
    ]));
  });
  els.searchAdminHistory?.addEventListener("input", () => {
    renderAdminHistory(filterByQuery(cachedAdminHistory, els.searchAdminHistory.value, [
      r => r.cycle, r => r.marketer, r => r.username
    ]));
  });
  if (useNativeMainButton) {
    tg.MainButton.onClick(submitForm);
    els.submitBtn.classList.add("hidden");
  }

  // GEO autocomplete: focus / input / blur on any .geo-input
  document.addEventListener("focusin", (e) => {
    const inp = e.target.closest(".geo-input");
    if (!inp) return;
    showSuggestions(inp);
  });
  document.addEventListener("input", (e) => {
    const inp = e.target.closest(".geo-input");
    if (!inp) return;
    showSuggestions(inp);
  });
  document.addEventListener("focusout", (e) => {
    const inp = e.target.closest(".geo-input");
    if (!inp) return;
    setTimeout(hideSuggestions, 120); // allow click on suggestion to register
  });
  // Click on a suggestion (mousedown so it fires before input blur)
  const sugBox = document.getElementById("geoSuggestions");
  if (sugBox) {
    sugBox.addEventListener("mousedown", (e) => {
      const item = e.target.closest(".geo-suggestion-item");
      if (!item) return;
      e.preventDefault();
      pickSuggestion(item.dataset.value);
    });
  }
}

function getCountryList() {
  return Array.isArray(window.GEO_CANONICAL) ? window.GEO_CANONICAL : [];
}
function nameOnly(canonical) {
  // "🇩🇪 Германия" → "Германия"
  const space = canonical.indexOf(" ");
  return space > 0 ? canonical.slice(space + 1) : canonical;
}
function filterCountries(query) {
  const list = getCountryList();
  const q = String(query || "").toLowerCase().trim();
  if (!q) return list.slice(0, 8);
  const startsWith = [];
  const contains = [];
  for (const c of list) {
    const lcName = nameOnly(c).toLowerCase();
    if (lcName.startsWith(q)) startsWith.push(c);
    else if (lcName.includes(q)) contains.push(c);
  }
  startsWith.sort((a, b) => nameOnly(a).localeCompare(nameOnly(b)));
  contains.sort((a, b) => nameOnly(a).localeCompare(nameOnly(b)));
  return [...startsWith, ...contains].slice(0, 8);
}

let suggestionsTarget = null;
function positionSuggestions(input) {
  const box = document.getElementById("geoSuggestions");
  if (!box) return;
  const r = input.getBoundingClientRect();
  box.style.left = `${r.left + window.scrollX}px`;
  box.style.top = `${r.bottom + window.scrollY + 4}px`;
  box.style.width = `${r.width}px`;
}
let suggestionsRafScheduled = false;
let lastSuggestionsKey = "";
function showSuggestions(input) {
  suggestionsTarget = input;
  if (suggestionsRafScheduled) return;
  suggestionsRafScheduled = true;
  requestAnimationFrame(() => {
    suggestionsRafScheduled = false;
    if (!suggestionsTarget) return;
    const box = document.getElementById("geoSuggestions");
    if (!box) return;
    const matches = filterCountries(suggestionsTarget.value);
    if (!matches.length) { hideSuggestions(); return; }
    const key = matches.join("");
    if (key !== lastSuggestionsKey) {
      lastSuggestionsKey = key;
      box.innerHTML = matches.map(c =>
        `<div class="geo-suggestion-item" data-value="${escapeHtml(c)}">${escapeHtml(c)}</div>`
      ).join("");
    }
    positionSuggestions(suggestionsTarget);
    box.classList.remove("hidden");
  });
}
function hideSuggestions() {
  const box = document.getElementById("geoSuggestions");
  if (box) box.classList.add("hidden");
  suggestionsTarget = null;
}
function pickSuggestion(value) {
  if (!suggestionsTarget) return;
  suggestionsTarget.value = value;
  suggestionsTarget.dispatchEvent(new Event("input", { bubbles: true }));
  suggestionsTarget.focus();
  hideSuggestions();
}

async function init() {
  readTelegramUser();
  renderUserPill();
  wireEvents();
  // Prefetch own reports in the background so "↻ Из прошлого" feels instant
  if (state.telegram_id) {
    myReportsPrefetch = apiCall("get_my_reports").then(data => {
      cachedMyReports = Array.isArray(data?.reports) ? data.reports : [];
    }).catch(() => null);
  }
  if (!await loadDraft()) addGeoRow();
  await loadContext();
  // Show MainButton if we ended up on the form view
  if (document.getElementById("view-new-report")?.classList.contains("active")) {
    showMainButton(state.editMode ? "Сохранить" : "Отправить");
  }
}

init();
