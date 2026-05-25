import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../api/client";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [accounts, setAccounts] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiVigilance, setAiVigilance] = useState(true);
  const [autoBlock, setAutoBlock] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [lastScan, setLastScan] = useState(null);

  const addToast = useCallback((message, type = "success") => {
    const id = crypto.randomUUID();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [accRes, alertRes] = await Promise.all([api.getAccounts(), api.getAlerts()]);
      setAccounts(accRes.accounts || []);
      setAlerts(alertRes.alerts || []);

      try {
        const settingsRes = await api.getSettings();
        setAiVigilance(settingsRes.aiVigilanceEnabled ?? true);
        setAutoBlock(settingsRes.autoBlockEnabled ?? true);
      } catch {
        // Older backend without /api/settings — use defaults
        setAiVigilance(true);
        setAutoBlock(true);
      }
    } catch (e) {
      addToast(e.message, "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updateSettings = async (patch) => {
    const res = await api.patchSettings(patch);
    if (patch.aiVigilanceEnabled !== undefined) setAiVigilance(res.aiVigilanceEnabled);
    if (patch.autoBlockEnabled !== undefined) setAutoBlock(res.autoBlockEnabled);
  };

  const toggleAiVigilance = async (on) => {
    setAiVigilance(on);
    await updateSettings({ aiVigilanceEnabled: on });
    addToast(on ? "AI Vigilance enabled" : "AI Monitoring paused", on ? "success" : "fraud");
  };

  const toggleAutoBlock = async (on) => {
    setAutoBlock(on);
    await updateSettings({ autoBlockEnabled: on });
    addToast(on ? "Auto-block enabled" : "Auto-block disabled — flag only", "fraud");
  };

  const value = {
    accounts,
    alerts,
    loading,
    refresh,
    aiVigilance,
    autoBlock,
    toggleAiVigilance,
    toggleAutoBlock,
    toasts,
    addToast,
    lastScan,
    setLastScan,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
