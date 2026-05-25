export default function Toggle({ on, onChange, label, showState = true, pulse = false }) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      {label && <span className="text-sm text-white/70">{label}</span>}
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => onChange(!on)}
        className={`relative h-7 w-14 rounded-pill transition-colors duration-300 ${
          on ? "bg-vault-pink" : "bg-vault-toggleOff"
        }`}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all duration-300 ${
            on ? "left-7" : "left-0.5"
          }`}
        />
        {on && pulse && (
          <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-vault-pinkLight animate-pulsePink" />
        )}
      </button>
      {showState && (
        <span className={`text-xs font-semibold ${on ? "text-vault-pink" : "text-white/40"}`}>
          {on ? "ON" : "OFF"}
        </span>
      )}
    </label>
  );
}
