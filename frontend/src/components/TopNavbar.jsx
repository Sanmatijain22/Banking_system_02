export default function TopNavbar({ title, subtitle, onCreateAccount }) {
  return (
    <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 className="text-3xl font-bold leading-tight">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-white/50">{subtitle}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-pill bg-black/30 px-4 py-2">
          <span className="material-symbols-outlined text-white/40 text-[20px]">search</span>
          <input
            type="search"
            placeholder="Search vault..."
            className="w-40 bg-transparent text-sm outline-none placeholder:text-white/30"
          />
        </div>
        {["Portfolio", "Invoices", "Reports"].map((link) => (
          <button
            key={link}
            type="button"
            className="hidden text-sm text-white/50 hover:text-white md:block"
          >
            {link}
          </button>
        ))}
        <button type="button" className="rounded-full p-2 hover:bg-white/10">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        {onCreateAccount && (
          <button
            type="button"
            onClick={onCreateAccount}
            className="rounded-pill bg-vault-pink px-5 py-2.5 text-sm font-bold hover:brightness-110"
          >
            Create Account
          </button>
        )}
      </div>
    </header>
  );
}
