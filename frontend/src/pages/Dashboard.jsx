import { useEffect, useMemo, useState } from "react";
import TopNavbar from "../components/TopNavbar";
import Toggle from "../components/Toggle";
import TransactionTable from "../components/TransactionTable";
import { CardSkeleton } from "../components/Skeleton";
import { useApp } from "../context/AppContext";
import { api } from "../api/client";
import { formatINR } from "../utils/format";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { accounts, alerts, loading, refresh, autoBlock, toggleAutoBlock } = useApp();
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(true);
  const navigate = useNavigate();

  const totalLiquidity = accounts.reduce((s, a) => s + a.balance, 0);
  const anomalies = alerts.filter((a) => a.riskScore >= 50).length;
  const topAlert = alerts.length
    ? [...alerts].sort((a, b) => b.riskScore - a.riskScore)[0]
    : null;

  useEffect(() => {
    async function loadTx() {
      setTxLoading(true);
      try {
        const all = [];
        for (const acc of accounts) {
          const res = await api.getTransactions(acc.accountId);
          all.push(...(res.transactions || []).map((t) => ({ ...t, _acc: acc.accountId })));
        }
        all.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setTransactions(all.slice(0, 12));
      } catch {
        setTransactions([]);
      } finally {
        setTxLoading(false);
      }
    }
    if (!loading) loadTx();
  }, [accounts, loading, alerts]);

  const globalRisk = useMemo(() => {
    if (!alerts.length) return 12;
    return Math.min(100, Math.round(alerts.reduce((s, a) => s + a.riskScore, 0) / alerts.length));
  }, [alerts]);

  return (
    <div>
      <TopNavbar
        title="Financial Control"
        subtitle="Institutional liquidity & threat overview"
        onCreateAccount={() => navigate("/accounts")}
      />

      <div className="mb-4 flex items-center gap-4 rounded-card glass px-4 py-3">
        <Toggle
          label="Auto-block accounts when risk > 80"
          on={autoBlock}
          onChange={toggleAutoBlock}
        />
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {loading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : (
          <>
            <div className="rounded-card bg-white p-6 text-vault-bg">
              <p className="text-xs font-semibold uppercase tracking-wide text-vault-bg/40">
                Total Liquidity
              </p>
              <p className="mt-2 text-4xl font-extrabold text-vault-pink">{formatINR(totalLiquidity)}</p>
              <span className="mt-2 inline-block rounded-pill bg-success/15 px-2 py-0.5 text-xs font-bold text-success">
                +4.2%
              </span>
            </div>
            <div className="rounded-card bg-white p-6 text-vault-bg">
              <p className="text-xs font-semibold uppercase tracking-wide text-vault-bg/40">
                Active Accounts
              </p>
              <p className="mt-2 text-4xl font-extrabold">{accounts.length}</p>
              <p className="mt-2 text-xs text-vault-bg/50">Managed entities</p>
            </div>
            <div className="rounded-card bg-white p-6 text-vault-bg">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-vault-bg/40">
                <span className="material-symbols-outlined text-vault-pink">bolt</span>
                AI Fraud Insights
              </p>
              <p className="mt-2 text-sm">
                ML models detected{" "}
                <strong className="text-vault-pink">{anomalies} anomalies</strong>
              </p>
            </div>
          </>
        )}
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <div className="relative overflow-hidden rounded-card glass p-6">
          <span className="ghost-stat">98.4%</span>
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-vault-pink/30" />
            <div>
              <p className="font-bold">EFFICIENCY 98.4%</p>
              <p className="text-sm text-white/50">analytics</p>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-card glass p-6">
          <span className="ghost-stat">2.8%</span>
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-blue-500/30" />
            <div>
              <p className="font-bold">YIELD 2.8%</p>
              <p className="text-sm text-white/50">monitoring</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-card bg-white">
            <div className="flex items-center justify-between border-b border-black/5 px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-vault-pink text-white">
                  <span className="material-symbols-outlined">receipt_long</span>
                </span>
                <h3 className="font-bold text-vault-bg">Institutional Transaction Feed</h3>
              </div>
              <button
                type="button"
                onClick={() => navigate("/transactions")}
                className="rounded-pill bg-vault-pink px-4 py-1.5 text-xs font-bold text-white"
              >
                View All →
              </button>
            </div>
            <TransactionTable
              transactions={transactions}
              accounts={accounts}
              alerts={alerts}
              loading={txLoading}
            />
          </div>
        </div>

        <div className="space-y-4">
          {topAlert ? (
            <div className="rounded-card bg-vault-alert p-5 text-vault-bg">
              <span className="rounded-pill bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                HIGH RISK
              </span>
              <h4 className="mt-2 font-bold">Suspicious activity detected</h4>
              <p className="mt-1 text-sm text-vault-bg/70">
                Risk {topAlert.riskScore} — {topAlert.reasons?.[0] || "Review required"}
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await api.setAccountStatus(topAlert.accountId, "BLOCKED");
                    refresh();
                  }}
                  className="rounded-pill bg-vault-pink px-4 py-2 text-xs font-bold text-white"
                >
                  FREEZE ACCOUNT
                </button>
                <button type="button" className="text-xs font-semibold text-vault-bg/60">
                  Dismiss
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-card bg-vault-alert/50 p-5 text-vault-bg/60 text-sm">
              No active high-risk alerts
            </div>
          )}
          <div className="rounded-card glass p-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span className="font-bold">99.99% Global Uptime</span>
            </div>
            <p className="mt-1 text-xs text-white/40">Risk index {globalRisk}/100</p>
          </div>
        </div>
      </div>
    </div>
  );
}
