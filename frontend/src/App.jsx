import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider, useApp } from "./context/AppContext";
import Sidebar from "./components/Sidebar";
import ToastContainer from "./components/Toast";
import Dashboard from "./pages/Dashboard";
import Fraud from "./pages/Fraud";
import Accounts from "./pages/Accounts";
import Transactions from "./pages/Transactions";

function Layout() {
  const { toasts } = useApp();
  return (
    <div className="min-h-screen pl-64">
      <main className="px-8 py-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/fraud" element={<Fraud />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/transactions" element={<Transactions />} />
        </Routes>
      </main>
      <ToastContainer toasts={toasts} />
      <Sidebar />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Layout />
      </AppProvider>
    </BrowserRouter>
  );
}
