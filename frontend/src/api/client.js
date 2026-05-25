const BASE = import.meta.env.VITE_API_URL ?? "";

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: { "Content-Type": "application/json", ...options.headers },
      ...options,
    });
  } catch {
    throw new Error(
      "Cannot connect to backend. Run run.bat from the project folder (port 8080), then refresh."
    );
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error(
      "Backend API not available. Restart the Java server (run.bat) — an old server may still be running."
    );
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  getAccounts: () => request("/api/accounts"),
  createAccount: (body) => request("/api/accounts", { method: "POST", body: JSON.stringify(body) }),
  setFraudWatch: (id, enabled) =>
    request(`/api/accounts/${id}/fraud-watch`, {
      method: "PATCH",
      body: JSON.stringify({ enabled }),
    }),
  setAccountStatus: (id, status) =>
    request(`/api/accounts/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  getTransactions: (accountId) => request(`/api/transactions/${accountId}`),
  deposit: (body) =>
    request("/api/transactions/deposit", { method: "POST", body: JSON.stringify(body) }),
  withdraw: (body) =>
    request("/api/transactions/withdraw", { method: "POST", body: JSON.stringify(body) }),
  transfer: (body) =>
    request("/api/transactions/transfer", { method: "POST", body: JSON.stringify(body) }),
  getAlerts: () => request("/api/fraud/alerts"),
  analyze: (body) =>
    request("/api/fraud/analyze", { method: "POST", body: JSON.stringify(body) }),
  getSettings: () => request("/api/settings"),
  patchSettings: (body) =>
    request("/api/settings", { method: "PATCH", body: JSON.stringify(body) }),
};
