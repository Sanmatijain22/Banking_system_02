import { formatDate, formatINR } from "../utils/format";

function rowStatus(tx, flaggedIds) {
  if (flaggedIds.has(tx.transactionId)) return "FLAGGED";
  return tx.status === "COMPLETED" ? "SETTLED" : "PENDING";
}

function counterparty(tx, accountMap) {
  if (tx.type === "DEPOSIT") return accountMap[tx.toAccount]?.name || "Deposit";
  if (tx.type === "WITHDRAW") return accountMap[tx.fromAccount]?.name || "Withdrawal";
  const from = accountMap[tx.fromAccount]?.name || tx.fromAccount?.slice(0, 8);
  const to = accountMap[tx.toAccount]?.name || tx.toAccount?.slice(0, 8);
  return `${from} → ${to}`;
}

export default function TransactionTable({ transactions, accounts, alerts, loading }) {
  const accountMap = Object.fromEntries(accounts.map((a) => [a.accountId, a]));
  const flaggedIds = new Set(
    (alerts || []).filter((a) => a.riskScore >= 50).map((a) => a.transactionId)
  );

  if (loading) {
    return (
      <div className="space-y-3 p-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-black/5" />
        ))}
      </div>
    );
  }

  if (!transactions?.length) {
    return (
      <p className="p-8 text-center text-sm text-vault-bg/50">
        No transactions yet. Perform a deposit, withdraw, or transfer.
      </p>
    );
  }

  return (
    <table className="w-full text-left text-sm text-vault-bg">
      <thead>
        <tr className="border-b border-black/10 text-xs uppercase tracking-wide text-vault-bg/40">
          <th className="px-6 py-3">Transaction ID</th>
          <th className="px-6 py-3">Counterparty</th>
          <th className="px-6 py-3">Status</th>
          <th className="px-6 py-3 text-right">Amount</th>
        </tr>
      </thead>
      <tbody>
        {transactions.map((tx) => {
          const status = rowStatus(tx, flaggedIds);
          const flagged = status === "FLAGGED";
          return (
            <tr
              key={tx.transactionId}
              className={`border-b border-black/5 ${flagged ? "flagged-row" : "bg-white"}`}
            >
              <td className="px-6 py-4 font-mono text-xs">{tx.transactionId.slice(0, 12)}…</td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-vault-pink/20 text-xs font-bold text-vault-pink">
                    {(counterparty(tx, accountMap)[0] || "?").toUpperCase()}
                  </span>
                  {counterparty(tx, accountMap)}
                </div>
              </td>
              <td className="px-6 py-4">
                <span
                  className={`inline-flex items-center gap-1 rounded-pill px-3 py-1 text-xs font-semibold ${
                    status === "SETTLED"
                      ? "bg-success/15 text-success"
                      : status === "FLAGGED"
                        ? "bg-red-100 text-red-600"
                        : "bg-vault-bg/10 text-vault-bg"
                  }`}
                >
                  {status === "FLAGGED" && <span className="h-2 w-2 rounded-full bg-red-500" />}
                  {status}
                </span>
              </td>
              <td className={`px-6 py-4 text-right font-bold ${flagged ? "text-vault-pink" : ""}`}>
                {formatINR(tx.amount)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
