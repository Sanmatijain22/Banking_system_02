import { useEffect, useState } from "react";
import TopNavbar from "../components/TopNavbar";
import Modal from "../components/Modal";
import Toggle from "../components/Toggle";
import TransactionTable from "../components/TransactionTable";
import { useApp } from "../context/AppContext";
import { api } from "../api/client";

export default function Transactions() {
  const { accounts, alerts, refresh, addToast, aiVigilance } = useApp();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [realtimeScan, setRealtimeScan] = useState(false);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});

  const loadAll = async () => {
    setLoading(true);
    try {
      const all = [];
      for (const acc of accounts) {
        const res = await api.getTransactions(acc.accountId);
        all.push(...(res.transactions || []));
      }
      all.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setTransactions(all);
    } catch (e) {
      addToast(e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accounts.length) loadAll();
    else setLoading(false);
  }, [accounts]);

  const maybeScan = async (accountId, transactionId) => {
    if (!realtimeScan || !aiVigilance) return;
    try {
      const res = await api.analyze({ accountId, transactionId });
      const d = res.data;
      addToast(`Fraud scan: ${d.riskLevel} (${d.riskScore})`, "fraud");
      refresh();
    } catch (e) {
      addToast(e.message, "error");
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      let res;
      const amount = parseFloat(form.amount);
      if (modal === "deposit") {
        res = await api.deposit({ accountId: form.accountId, amount });
        await maybeScan(form.accountId, res.data.transactionId);
      } else if (modal === "withdraw") {
        res = await api.withdraw({ accountId: form.accountId, amount });
        await maybeScan(form.accountId, res.data.transactionId);
      } else {
        res = await api.transfer({
          fromAccountId: form.fromAccountId,
          toAccountId: form.toAccountId,
          amount,
        });
        await maybeScan(form.fromAccountId, res.data.transactionId);
      }
      addToast(`${modal} successful`, "success");
      setModal(null);
      setForm({});
      refresh();
      loadAll();
    } catch (err) {
      addToast(err.message, "error");
    }
  };

  const openModal = (type) => {
    setModal(type);
    setForm({
      accountId: accounts[0]?.accountId || "",
      fromAccountId: accounts[0]?.accountId || "",
      toAccountId: accounts[1]?.accountId || "",
      amount: "",
    });
  };

  return (
    <div>
      <TopNavbar title="Transaction Hub" subtitle="Deposits, withdrawals & transfers" />

      <div className="mb-6 flex flex-wrap items-center gap-4">
        {["deposit", "withdraw", "transfer"].map((type) => (
          <button
            key={type}
            type="button"
            disabled={accounts.length < (type === "transfer" ? 2 : 1)}
            onClick={() => openModal(type)}
            className="rounded-pill bg-vault-pink px-5 py-2.5 text-sm font-bold capitalize disabled:opacity-40"
          >
            {type}
          </button>
        ))}
        <Toggle
          label="Real-time Fraud Scan"
          on={realtimeScan}
          onChange={setRealtimeScan}
        />
      </div>

      <div className="overflow-hidden rounded-card bg-white">
        <TransactionTable
          transactions={transactions}
          accounts={accounts}
          alerts={alerts}
          loading={loading}
        />
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal}>
        <form onSubmit={submit} className="space-y-4">
          {modal === "transfer" ? (
            <>
              <label className="block text-sm">
                From
                <select
                  required
                  value={form.fromAccountId}
                  onChange={(e) => setForm({ ...form, fromAccountId: e.target.value })}
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                >
                  {accounts.map((a) => (
                    <option key={a.accountId} value={a.accountId}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                To
                <select
                  required
                  value={form.toAccountId}
                  onChange={(e) => setForm({ ...form, toAccountId: e.target.value })}
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                >
                  {accounts.map((a) => (
                    <option key={a.accountId} value={a.accountId}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : (
            <label className="block text-sm">
              Account
              <select
                required
                value={form.accountId}
                onChange={(e) => setForm({ ...form, accountId: e.target.value })}
                className="mt-1 w-full rounded-lg border px-3 py-2"
              >
                {accounts.map((a) => (
                  <option key={a.accountId} value={a.accountId}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block text-sm">
            Amount (₹)
            <input
              type="number"
              required
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
          </label>
          <button type="submit" className="w-full rounded-pill bg-vault-pink py-3 font-bold text-white">
            Submit
          </button>
        </form>
      </Modal>
    </div>
  );
}
