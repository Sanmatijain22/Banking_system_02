const API = "";

const EMPTY_OPTION = '<option value="">— Select —</option>';

const views = {
  dashboard: { title: "Dashboard", subtitle: "Live data from your session" },
  accounts: { title: "Accounts", subtitle: "Create and manage accounts" },
  transactions: { title: "Transactions", subtitle: "Enter amounts and accounts for each operation" },
  fraud: { title: "Fraud Detection", subtitle: "Analyze transactions you have performed" },
};

let accounts = [];
let alerts = [];

// --- API ---
async function api(path, options = {}) {
  const res = await fetch(API + path, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

// --- Validation (user input only) ---
function getSelectedValue(selectId, label) {
  const el = document.getElementById(selectId);
  const value = el?.value?.trim();
  if (!value) {
    throw new Error(`Please select ${label}`);
  }
  return value;
}

function parseAmount(raw, label = "amount") {
  const amount = parseFloat(String(raw).trim());
  if (Number.isNaN(amount) || amount <= 0) {
    throw new Error(`Enter a valid ${label} greater than zero`);
  }
  return amount;
}

function getTextInput(form, name, label) {
  const value = form.querySelector(`[name="${name}"]`)?.value?.trim();
  if (!value) {
    throw new Error(`${label} is required`);
  }
  return value;
}

// --- UI helpers ---
function formatMoney(n) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n);
}

function formatDate(iso) {
  return new Date(iso).toLocaleString();
}

function showToast(message, type = "success") {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.className = `toast ${type}`;
  setTimeout(() => el.classList.add("hidden"), 4000);
}

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

function accountCard(acc) {
  const blocked = acc.status === "BLOCKED";
  return `
    <div class="account-card ${blocked ? "blocked" : ""}">
      <h4>${escapeHtml(acc.name)}</h4>
      <div class="email">${escapeHtml(acc.email)}</div>
      <div class="balance">${formatMoney(acc.balance)}</div>
      <div class="meta">
        <span class="badge ${blocked ? "badge-blocked" : "badge-active"}">${acc.status}</span>
        <span>${formatDate(acc.createdAt)}</span>
      </div>
      <div class="account-id">${acc.accountId}</div>
    </div>`;
}

function accountOptions(includeEmpty = true) {
  const opts = accounts.map(
    (a) => `<option value="${a.accountId}">${escapeHtml(a.name)} — ${formatMoney(a.balance)}</option>`
  );
  return (includeEmpty ? EMPTY_OPTION : "") + opts.join("");
}

function restoreSelect(selectId, preferredId) {
  const el = document.getElementById(selectId);
  if (!el) return;
  const prev = el.value;
  const html = accounts.length ? accountOptions(true) : EMPTY_OPTION;
  el.innerHTML = html;
  const pick = preferredId || prev;
  if (pick && accounts.some((a) => a.accountId === pick)) {
    el.value = pick;
  }
}

/** Transfer needs two different accounts — never copy the same selection into From and To. */
function populateTransferSelects() {
  const fromEl = document.getElementById("transferFrom");
  const toEl = document.getElementById("transferTo");
  if (!fromEl || !toEl) return;

  const prevFrom = fromEl.value;
  const prevTo = toEl.value;
  const html = accounts.length ? accountOptions(true) : EMPTY_OPTION;
  fromEl.innerHTML = html;
  toEl.innerHTML = html;

  if (accounts.length < 2) {
    return;
  }

  const validFrom = prevFrom && accounts.some((a) => a.accountId === prevFrom);
  const validTo = prevTo && accounts.some((a) => a.accountId === prevTo);

  if (validFrom && validTo && prevFrom !== prevTo) {
    fromEl.value = prevFrom;
    toEl.value = prevTo;
    return;
  }

  fromEl.value = accounts[0].accountId;
  toEl.value = accounts[1].accountId;
}

function populateAccountSelects() {
  restoreSelect("depositAccount");
  restoreSelect("withdrawAccount");
  restoreSelect("historyAccount");
  restoreSelect("analyzeAccount");
  populateTransferSelects();
  updateFormAvailability();
}

function updateFormAvailability() {
  const hasAccounts = accounts.length > 0;
  const hasTwoAccounts = accounts.length >= 2;

  document.getElementById("txEmptyHint")?.classList.toggle("hidden", hasAccounts);
  document.getElementById("transferNeedTwoHint")?.classList.toggle("hidden", !hasAccounts || hasTwoAccounts);
  document.getElementById("fraudEmptyHint")?.classList.toggle("hidden", hasAccounts);

  ["depositForm", "withdrawForm"].forEach((id) => {
    const form = document.getElementById(id);
    if (form) form.querySelectorAll("input, select, button").forEach((el) => {
      el.disabled = !hasAccounts;
    });
  });

  const transferForm = document.getElementById("transferForm");
  if (transferForm) {
    transferForm.querySelectorAll("select, input, button").forEach((el) => {
      el.disabled = !hasTwoAccounts;
    });
  }

  const analyzeForm = document.getElementById("analyzeForm");
  if (analyzeForm) {
    analyzeForm.querySelectorAll("select, button").forEach((el) => {
      el.disabled = !hasAccounts;
    });
  }
}

async function loadAnalyzeTransactions() {
  const select = document.getElementById("analyzeTransaction");
  const accountId = document.getElementById("analyzeAccount")?.value;

  if (!select) return;

  if (!accountId) {
    select.innerHTML = EMPTY_OPTION;
    return;
  }

  select.innerHTML = '<option value="">Loading…</option>';
  try {
    const txs = await loadHistory(accountId);
    if (!txs.length) {
      select.innerHTML = '<option value="">No transactions for this account yet</option>';
      return;
    }
    select.innerHTML =
      EMPTY_OPTION +
      txs.map((tx) => {
        const label = `${tx.type} ${formatMoney(tx.amount)} — ${formatDate(tx.timestamp)}`;
        return `<option value="${tx.transactionId}">${escapeHtml(label)}</option>`;
      }).join("");
  } catch (e) {
    select.innerHTML = `<option value="">${escapeHtml(e.message)}</option>`;
  }
}

// --- Data ---
async function loadAccounts() {
  const data = await api("/api/accounts");
  accounts = data.accounts || [];
  return accounts;
}

async function loadAlerts() {
  const data = await api("/api/fraud/alerts");
  alerts = data.alerts || [];
  return alerts;
}

async function loadHistory(accountId) {
  if (!accountId) return [];
  const data = await api(`/api/transactions/${accountId}`);
  return data.transactions || [];
}

function renderDashboard() {
  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const blocked = accounts.filter((a) => a.status === "BLOCKED").length;

  document.getElementById("statAccounts").textContent = accounts.length;
  document.getElementById("statBalance").textContent = formatMoney(totalBalance);
  document.getElementById("statAlerts").textContent = alerts.length;
  document.getElementById("statBlocked").textContent = blocked;

  const container = document.getElementById("dashboardAccounts");
  container.innerHTML = accounts.length
    ? accounts.map(accountCard).join("")
    : '<p class="empty-state">No accounts yet. Go to Accounts and create one.</p>';
}

function renderAccounts() {
  const container = document.getElementById("accountsList");
  container.innerHTML = accounts.length
    ? accounts.map(accountCard).join("")
    : '<p class="empty-state">No accounts yet. Use the form to create your first account.</p>';
}

async function renderHistory() {
  const accountId = document.getElementById("historyAccount")?.value;
  const tbody = document.getElementById("historyBody");

  if (!accountId) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Select an account to view history</td></tr>';
    return;
  }

  try {
    const txs = await loadHistory(accountId);
    if (!txs.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No transactions yet for this account</td></tr>';
      return;
    }

    tbody.innerHTML = txs.map((tx) => {
      const parties = [tx.fromAccount, tx.toAccount].filter(Boolean).join(" → ") || "—";
      return `
        <tr>
          <td><span class="type-${tx.type.toLowerCase()}">${tx.type}</span></td>
          <td>${formatMoney(tx.amount)}</td>
          <td style="font-size:0.75rem">${parties}</td>
          <td>${tx.status}</td>
          <td>${formatDate(tx.timestamp)}</td>
          <td>
            <button type="button" class="btn-sm" data-tx-id="${tx.transactionId}" data-acc="${accountId}">Analyze</button>
          </td>
        </tr>`;
    }).join("");

    tbody.querySelectorAll("[data-tx-id]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        document.querySelector('[data-view="fraud"]').click();
        document.getElementById("analyzeAccount").value = btn.dataset.acc;
        await loadAnalyzeTransactions();
        document.getElementById("analyzeTransaction").value = btn.dataset.txId;
      });
    });
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state">${escapeHtml(e.message)}</td></tr>`;
  }
}

function renderAlerts() {
  const container = document.getElementById("alertsList");
  if (!alerts.length) {
    container.innerHTML =
      '<p class="empty-state">No alerts yet. They appear after transactions when AI risk score is 50+.</p>';
    return;
  }

  container.innerHTML = alerts
    .slice()
    .reverse()
    .map((a) => {
      const level = (a.riskLevel || "").toLowerCase();
      const cls = level.includes("high") ? "risk-high" : level.includes("medium") ? "risk-medium" : "risk-low";
      const reasons = (a.reasons || []).map((r) => `<li>${escapeHtml(r)}</li>`).join("");
      return `
        <div class="alert-card ${cls}">
          <div class="risk-row">
            <span class="risk-score">${a.riskScore}</span>
            <span class="badge badge-${level.includes("high") ? "blocked" : "active"}">${a.riskLevel} · ${a.recommendation}</span>
          </div>
          <div style="font-size:0.8rem;color:var(--text-muted)">
            Account: <code>${a.accountId}</code><br/>
            Tx: <code>${a.transactionId}</code><br/>
            ${formatDate(a.timestamp)}
          </div>
          <ul class="alert-reasons">${reasons}</ul>
        </div>`;
    })
    .join("");
}

async function refreshAll() {
  try {
    await loadAccounts();
    await loadAlerts();
    populateAccountSelects();
    renderDashboard();
    renderAccounts();
    renderAlerts();
    await renderHistory();
    await loadAnalyzeTransactions();
    document.getElementById("serverStatus").textContent = "Connected";
    document.querySelector(".status-dot").style.background = "var(--accent)";
  } catch (e) {
    document.getElementById("serverStatus").textContent = "Offline";
    document.querySelector(".status-dot").style.background = "var(--danger)";
    showToast("Cannot reach server. Start the backend on port 8080.", "error");
  }
}

// --- Navigation ---
document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const view = btn.dataset.view;
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    document.getElementById(`view-${view}`).classList.add("active");
    const meta = views[view];
    document.getElementById("pageTitle").textContent = meta.title;
    document.getElementById("pageSubtitle").textContent = meta.subtitle;
    if (view === "transactions") renderHistory();
    if (view === "fraud") {
      renderAlerts();
      loadAnalyzeTransactions();
    }
  });
});

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    document.querySelectorAll(".tx-form").forEach((f) => f.classList.add("hidden"));
    document.getElementById(`${tab.dataset.tx}Form`).classList.remove("hidden");
    if (tab.dataset.tx === "transfer") {
      populateTransferSelects();
    }
  });
});

document.getElementById("refreshBtn").addEventListener("click", refreshAll);
document.getElementById("historyAccount").addEventListener("change", renderHistory);
document.getElementById("analyzeAccount").addEventListener("change", loadAnalyzeTransactions);

document.getElementById("transferFrom")?.addEventListener("change", () => {
  const from = document.getElementById("transferFrom").value;
  const toEl = document.getElementById("transferTo");
  if (toEl && from && toEl.value === from) {
    const other = accounts.find((a) => a.accountId !== from);
    if (other) toEl.value = other.accountId;
  }
});

document.getElementById("transferTo")?.addEventListener("change", () => {
  const to = document.getElementById("transferTo").value;
  const fromEl = document.getElementById("transferFrom");
  if (fromEl && to && fromEl.value === to) {
    const other = accounts.find((a) => a.accountId !== to);
    if (other) fromEl.value = other.accountId;
  }
});

// Create account — all fields from user
document.getElementById("createAccountForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  try {
    const name = getTextInput(form, "name", "Name");
    const email = getTextInput(form, "email", "Email");
    const balanceRaw = form.querySelector('[name="initialBalance"]').value;
    const initialBalance = balanceRaw.trim() === "" ? 0 : parseAmount(balanceRaw, "initial balance");

    await api("/api/accounts", {
      method: "POST",
      body: JSON.stringify({ name, email, initialBalance }),
    });
    showToast("Account created");
    form.reset();
    await refreshAll();
  } catch (err) {
    showToast(err.message, "error");
  }
});

document.getElementById("depositForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  try {
    const accountId = getSelectedValue("depositAccount", "an account");
    const amount = parseAmount(form.querySelector('[name="amount"]').value);

    await api("/api/transactions/deposit", {
      method: "POST",
      body: JSON.stringify({ accountId, amount }),
    });
    showToast("Deposit successful");
    form.querySelector('[name="amount"]').value = "";
    await refreshAll();
    document.getElementById("historyAccount").value = accountId;
    await renderHistory();
  } catch (err) {
    showToast(err.message, "error");
  }
});

document.getElementById("withdrawForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  try {
    const accountId = getSelectedValue("withdrawAccount", "an account");
    const amount = parseAmount(form.querySelector('[name="amount"]').value);

    await api("/api/transactions/withdraw", {
      method: "POST",
      body: JSON.stringify({ accountId, amount }),
    });
    showToast("Withdrawal successful");
    form.querySelector('[name="amount"]').value = "";
    await refreshAll();
    document.getElementById("historyAccount").value = accountId;
    await renderHistory();
  } catch (err) {
    showToast(err.message, "error");
  }
});

document.getElementById("transferForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  try {
    const fromAccountId = getSelectedValue("transferFrom", "source account");
    const toAccountId = getSelectedValue("transferTo", "destination account");
    if (fromAccountId === toAccountId) {
      throw new Error("Source and destination must be different accounts");
    }
    const amount = parseAmount(form.querySelector('[name="amount"]').value);

    await api("/api/transactions/transfer", {
      method: "POST",
      body: JSON.stringify({ fromAccountId, toAccountId, amount }),
    });
    showToast("Transfer successful");
    form.querySelector('[name="amount"]').value = "";
    await refreshAll();
    document.getElementById("historyAccount").value = fromAccountId;
    await renderHistory();
  } catch (err) {
    showToast(err.message, "error");
  }
});

document.getElementById("analyzeForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const resultEl = document.getElementById("analysisResult");
  resultEl.classList.remove("hidden");
  resultEl.innerHTML = "<p>Analyzing with Claude AI…</p>";

  try {
    const accountId = getSelectedValue("analyzeAccount", "an account");
    const transactionId = getSelectedValue("analyzeTransaction", "a transaction");

    const res = await api("/api/fraud/analyze", {
      method: "POST",
      body: JSON.stringify({ accountId, transactionId }),
    });
    const d = res.data;
    const scoreClass = d.riskScore > 80 ? "stat-danger" : d.riskScore >= 50 ? "stat-warn" : "";
    resultEl.innerHTML = `
      <p><strong>Analysis complete</strong></p>
      <div class="score ${scoreClass}">${d.riskScore} / 100</div>
      <p>Risk: <strong>${d.riskLevel}</strong> · Recommendation: <strong>${d.recommendation}</strong></p>
      <p>Fraudulent: ${d.isFraudulent ? "Yes" : "No"}</p>
      <ul class="alert-reasons">${(d.reasons || []).map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ul>`;
    showToast("Fraud analysis complete");
    await refreshAll();
  } catch (err) {
    resultEl.innerHTML = `<p class="stat-danger">${escapeHtml(err.message)}</p>`;
    showToast(err.message, "error");
  }
});

// Initial load only — updates happen when you submit forms or click Refresh
refreshAll();
