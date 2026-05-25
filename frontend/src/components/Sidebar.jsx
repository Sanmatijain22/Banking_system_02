import { NavLink, useNavigate } from "react-router-dom";
import Toggle from "./Toggle";
import { useApp } from "../context/AppContext";

const nav = [
  { to: "/", icon: "dashboard", label: "Dashboard" },
  { to: "/fraud", icon: "shield", label: "Fraud Detection" },
  { to: "/accounts", icon: "account_balance", label: "Accounts" },
  { to: "/transactions", icon: "sync_alt", label: "Transactions" },
];

export default function Sidebar() {
  const { aiVigilance, toggleAiVigilance } = useApp();
  const navigate = useNavigate();

  return (
    <aside className="fixed left-0 top-0 flex h-screen w-64 flex-col bg-vault-sidebar px-4 py-6">
      <div className="mb-8 px-2">
        <h1 className="text-xl font-extrabold tracking-tight">VaultAI Bank</h1>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
          Institutional Vault
        </p>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-pill px-4 py-2.5 text-sm font-medium transition-all duration-300 ${
                isActive
                  ? "bg-vault-pink text-white"
                  : "text-white/50 hover:bg-white/5 hover:text-white"
              }`
            }
          >
            <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="mb-4 rounded-card border border-white/10 bg-white/5 p-3">
        <Toggle
          label="AI Vigilance"
          on={aiVigilance}
          onChange={toggleAiVigilance}
          pulse={aiVigilance}
        />
      </div>

      <button
        type="button"
        onClick={() => navigate("/transactions")}
        className="mb-6 flex w-full items-center justify-center gap-2 rounded-pill bg-vault-pink py-3 text-sm font-bold transition hover:brightness-110"
      >
        <span className="material-symbols-outlined text-[18px]">payments</span>
        Transfer Funds
      </button>

      <div className="border-t border-white/10 pt-4">
        <button type="button" className="mb-3 flex items-center gap-2 text-sm text-white/40 hover:text-white">
          <span className="material-symbols-outlined text-[18px]">settings</span>
          Settings
        </button>
        <div className="flex items-center gap-3 rounded-card bg-white/5 p-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-vault-pink text-sm font-bold">
            IU
          </div>
          <div>
            <p className="text-xs font-semibold">Institutional User</p>
            <p className="text-[10px] text-vault-pinkLight">PREMIUM ACCESS</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
