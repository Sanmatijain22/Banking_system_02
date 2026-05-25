import { useMemo, useState } from "react";
import TopNavbar from "../components/TopNavbar";
import Toggle from "../components/Toggle";
import RiskGauge from "../components/RiskGauge";
import { useApp } from "../context/AppContext";
import { api } from "../api/client";
import { formatINR, formatDate, minutesAgo } from "../utils/format";

export default function Fraud() {
  const { accounts, alerts, aiVigilance, toggleAiVigilance, refresh, addToast, lastScan, setLastScan, loading } =
    useApp();
  const [filter, setFilter] = useState("ALL");
  const [scanning, setScanning] = useState(false);

  const globalRisk = useMemo(() => {
    if (!alerts.length) return 8;
    return Math.min(100, Math.round(alerts.reduce((s, a) => s + a.riskScore, 0) / alerts.length));
  }, [alerts]);

  const filtered = alerts.filter((a) => filter === "CRITICAL" ? a.riskScore >= 80 : true);
  const accountMap = Object.fromEntries(accounts.map((a) => [a.accountId, a]));

  const runScan = async () => {
    setScanning(true);
    try {
      let scanned = 0;
      for (const acc of accounts.filter((a) => a.fraudWatchEnabled !== false)) {
        const txs = await api.getTransactions(acc.accountId);
        const latest = txs.transactions?.[0];
        if (latest) {
          await api.analyze({ accountId: acc.accountId, transactionId: latest.transactionId });
          scanned++;
        }
      }
      setLastScan(new Date().toISOString());
      addToast(`Scanned ${scanned} account(s)`, "fraud");
      refresh();
    } catch (e) {
      addToast(e.message, "error");
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="relative">
      {!aiVigilance && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-card bg-vault-bg/80 backdrop-blur-sm">
          <p className="text-xl font-bold text-white/70">AI Monitoring Paused</p>
        </div>
      )}

      <TopNavbar title="Institutional Threat Analysis" subtitle={`Scanning ${accounts.length} accounts`} />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <span
            className={`rounded-pill px-4 py-2 text-sm font-bold ${
              aiVigilance ? "bg-vault-pink text-white shadow-[0_0_20px_#FF2D6B55]" : "bg-vault-toggleOff"
            }`}
          >
            AI VIGILANCE {aiVigilance ? "ON" : "OFF"}
          </span>
          <Toggle on={aiVigilance} onChange={toggleAiVigilance} pulse={aiVigilance} />
          <button
            type="button"
            disabled={scanning || !aiVigilance}
            onClick={runScan}
            className="rounded-pill bg-[#FF7F6B] px-5 py-2.5 text-sm font-bold disabled:opacity-50"
          >
            {scanning ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Scanning…
              </span>
            ) : (
              "⚡ Scan for Fraud"
            )}
          </button>
          <span className="text-sm text-white/40">
            Last checked {minutesAgo(lastScan)}
          </span>
        </div>
        <RiskGauge score={globalRisk} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="flex gap-2">
            {["ALL", "CRITICAL"].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-pill px-4 py-1.5 text-sm font-semibold ${
                  filter === f ? "bg-vault-pink" : "bg-white/10 text-white/50"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="h-40 animate-pulse rounded-card bg-white/10" />
          ) : filtered.length === 0 ? (
            <p className="rounded-card glass p-8 text-center text-white/50">No fraud alerts yet</p>
          ) : (
            filtered.map((alert) => {
              const acc = accountMap[alert.accountId];
              const blocked = acc?.status === "BLOCKED";
              const level = alert.riskLevel || "LOW";
              return (
                <div
                  key={alert.alertId}
                  className={`rounded-card p-5 ${
                    blocked ? "shimmer-border bg-white/5 p-[2px]" : "bg-white text-vault-bg"
                  }`}
                >
                  <div className={blocked ? "rounded-[14px] bg-vault-toggleOff/80 p-4 text-white/70" : ""}>
                    {blocked && (
                      <span className="material-symbols-outlined mb-2 text-red-400">lock</span>
                    )}
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold">{acc?.name || "Unknown"}</h4>
                        <p className="font-mono text-xs opacity-60">{alert.accountId.slice(0, 18)}…</p>
                      </div>
                      <span
                        className={`rounded-pill px-3 py-1 text-xs font-bold ${
                          level === "HIGH"
                            ? "bg-red-500 text-white"
                            : level === "MEDIUM"
                              ? "bg-warning text-black"
                              : "bg-success/20 text-success"
                        }`}
                      >
                        {level}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-pill bg-black/10 px-3 py-1 text-xs">
                        Anomaly · {alert.recommendation}
                      </span>
                      <span className="rounded-pill bg-vault-pink/10 px-3 py-1 text-xs text-vault-pink">
                        Score {alert.riskScore}
                      </span>
                    </div>
                    <ul className="mt-3 space-y-1 text-sm">
                      {(alert.reasons || []).map((r, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="material-symbols-outlined text-[16px] text-vault-pink">info</span>
                          {r}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-xs opacity-50">{formatDate(alert.timestamp)}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {blocked ? (
                        <>
                          <button type="button" className="rounded-pill border border-white/30 px-4 py-2 text-xs">
                            Review Appeal
                          </button>
                          <button type="button" className="rounded-pill border border-white/30 px-4 py-2 text-xs">
                            Audit Log
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={async () => {
                              await api.setAccountStatus(alert.accountId, "BLOCKED");
                              addToast("Account blocked", "fraud");
                              refresh();
                            }}
                            className="rounded-pill bg-vault-pink px-4 py-2 text-xs font-bold text-white"
                          >
                            BLOCK
                          </button>
                          <button type="button" className="rounded-pill border-2 border-vault-pink px-4 py-2 text-xs font-bold text-vault-pink">
                            FRAUD SUSPECT
                          </button>
                          <button type="button" className="text-xs font-semibold text-vault-pink">
                            Investigate →
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-card glass p-5">
            <h4 className="font-bold">AI Insights</h4>
            <p className="mt-2 text-sm text-white/60">
              Trending: rapid transfers & high-value withdrawals in last hour.
            </p>
            <div className="mt-4">
              <p className="mb-1 text-xs">Detection Accuracy</p>
              <div className="h-2 rounded-full bg-white/10">
                <div className="h-2 w-[94%] rounded-full bg-success" />
              </div>
            </div>
            <div className="mt-3">
              <p className="mb-1 text-xs">False Positive Rate</p>
              <div className="h-2 rounded-full bg-white/10">
                <div className="h-2 w-[8%] rounded-full bg-vault-pink" />
              </div>
            </div>
          </div>
          <div className="rounded-card glass p-5">
            <h4 className="font-bold">Risk Hotspots</h4>
            <div className="mt-3 h-24 rounded-lg bg-white/5 flex items-center justify-center text-xs text-white/30">
              Global map
            </div>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex justify-between"><span>Mumbai</span><span className="text-success">SAFE</span></li>
              <li className="flex justify-between"><span>Delhi</span><span className="text-warning">WATCH</span></li>
              <li className="flex justify-between"><span>Chennai</span><span className="text-red-400">RISK</span></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
