/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        nbs: {
          primary: "#0066cc",
          "primary-hover": "#0052a3",
          "primary-active": "#003d7a",
          "primary-soft": "#e8f1fc",
          ink: "#0a1f3d",
          secondary: "#1e293b",
          accent: "#0d9488",
          "accent-soft": "#ccfbf1",
          highlight: "#f59e0b",
          "highlight-soft": "#fef3c7",
          muted: "#64748b",
          border: "#e2e8f0",
          surface: "#f8fafc",
          danger: "#dc2626",
          "danger-hover": "#b91c1c",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      boxShadow: {
        "nbs-card":
          "0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06)",
        "nbs-hover": "0 10px 30px -12px rgba(15, 23, 42, 0.25)",
      },
      backgroundImage: {
        "nbs-hero":
          "radial-gradient(120% 120% at 100% 0%, #0a3a78 0%, #003d7a 45%, #0a1f3d 100%)",
      },
      keyframes: {
        "overlay-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "modal-in": {
          from: { opacity: "0", transform: "translateY(8px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
      animation: {
        "overlay-in": "overlay-in 150ms ease-out",
        "modal-in": "modal-in 180ms ease-out",
      },
    },
  },
  plugins: [],
};
