export default function ToastContainer({ toasts }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`min-w-[280px] rounded-card px-4 py-3 text-sm font-medium shadow-lg animate-[fadeIn_0.3s_ease] ${
            t.type === "success"
              ? "border border-success/40 bg-success/20 text-success"
              : t.type === "fraud"
                ? "border border-vault-pink/50 bg-vault-pink/20 text-vault-pinkLight"
                : "border border-red-500/50 bg-red-500/20 text-red-300"
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
