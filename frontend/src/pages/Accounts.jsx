import { useState } from "react";
import TopNavbar from "../components/TopNavbar";
import Modal from "../components/Modal";
import Toggle from "../components/Toggle";
import { CardSkeleton } from "../components/Skeleton";
import { useApp } from "../context/AppContext";
import { api } from "../api/client";
import { formatINR } from "../utils/format";

export default function Accounts() {
  const { accounts, loading, refresh, addToast } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", initialBalance: "" });

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.createAccount({
        name: form.name.trim(),
        email: form.email.trim(),
        initialBalance: parseFloat(form.initialBalance) || 0,
      });
      addToast("Account created");
      setForm({ name: "", email: "", initialBalance: "" });
      setModalOpen(false);
      refresh();
    } catch (err) {
      addToast(err.message, "error");
    }
  };

  const toggleWatch = async (acc, on) => {
    try {
      await api.setFraudWatch(acc.accountId, on);
      addToast(on ? "Fraud watch enabled" : "Fraud watch disabled", "fraud");
      refresh();
    } catch (e) {
      addToast(e.message, "error");
    }
  };

  return (
    <div>
      <TopNavbar
        title="Account Vault"
        subtitle="Manage institutional entities"
        onCreateAccount={() => setModalOpen(true)}
      />

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : accounts.length === 0 ? (
        <div className="rounded-card glass p-12 text-center">
          <p className="text-white/50">No accounts yet. Create your first account.</p>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="mt-4 rounded-pill bg-vault-pink px-6 py-2 font-bold"
          >
            Create Account
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {accounts.map((acc) => {
            const blocked = acc.status === "BLOCKED";
            return (
              <div
                key={acc.accountId}
                className={`rounded-card bg-white p-6 text-vault-bg ${
                  blocked ? "ring-2 ring-red-500 ring-offset-2 ring-offset-vault-bg" : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold">{acc.name}</h3>
                    <p className="text-sm text-vault-bg/50">{acc.email}</p>
                  </div>
                  <span
                    className={`flex items-center gap-1 rounded-pill px-2 py-1 text-xs font-bold ${
                      blocked ? "bg-red-100 text-red-600" : "bg-success/15 text-success"
                    }`}
                  >
                    {blocked && <span className="material-symbols-outlined text-[14px]">lock</span>}
                    {acc.status}
                  </span>
                </div>
                <p className="mt-4 text-3xl font-extrabold text-vault-pink">{formatINR(acc.balance)}</p>
                <p className="mt-2 font-mono text-[10px] text-vault-bg/40">{acc.accountId}</p>
                <div className="mt-4 border-t border-black/10 pt-4">
                  <Toggle
                    label="Fraud Watch"
                    on={acc.fraudWatchEnabled !== false}
                    onChange={(on) => toggleWatch(acc, on)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create Account">
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-medium">
            Full name
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2"
            />
          </label>
          <label className="block text-sm font-medium">
            Email
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2"
            />
          </label>
          <label className="block text-sm font-medium">
            Initial balance (₹)
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.initialBalance}
              onChange={(e) => setForm({ ...form, initialBalance: e.target.value })}
              className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2"
            />
          </label>
          <button type="submit" className="w-full rounded-pill bg-vault-pink py-3 font-bold text-white">
            Create
          </button>
        </form>
      </Modal>
    </div>
  );
}
