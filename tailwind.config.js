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
          secondary: "#1e293b",
          accent: "#0d9488",
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
    },
  },
  plugins: [],
};
