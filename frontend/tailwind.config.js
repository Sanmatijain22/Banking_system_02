/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        vault: {
          bg: "#1A0A2E",
          sidebar: "#120820",
          pink: "#FF2D6B",
          pinkLight: "#FF6BC4",
          flagged: "#FFE4EE",
          alert: "#FFD6E0",
          toggleOff: "#2A2A3E",
        },
        success: "#00C48C",
        warning: "#FF9500",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "16px",
        pill: "50px",
      },
      animation: {
        pulsePink: "pulsePink 2s ease-in-out infinite",
        shimmer: "shimmer 2.5s linear infinite",
        gauge: "gauge 1.2s ease-out forwards",
      },
      keyframes: {
        pulsePink: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(255, 45, 107, 0.5)" },
          "50%": { boxShadow: "0 0 0 8px rgba(255, 45, 107, 0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        gauge: {
          "0%": { strokeDashoffset: "283" },
        },
      },
    },
  },
  plugins: [],
};
