/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        nbs: {
          primary: '#0272a7',
          'primary-hover': '#02618e',
          'primary-active': '#024d70',
          'primary-soft': '#e6f2f8',
          ink: '#0a1f3d',
          secondary: '#1e293b',
          accent: '#219f94',
          'accent-soft': '#d6f0ed',
          highlight: '#edc91e',
          'highlight-soft': '#fbf1c6',
          muted: '#475569',
          border: '#e2e8f0',
          surface: '#f8fafc',
          success: '#059669',
          'success-soft': '#ecfdf5',
          'success-border': '#a7f3d0',
          warning: '#d97706',
          'warning-soft': '#fffbeb',
          'warning-border': '#fde68a',
          info: '#0284c7',
          'info-soft': '#f0f9ff',
          'info-border': '#bae6fd',
          danger: '#dc2626',
          'danger-hover': '#b91c1c',
          'danger-soft': '#fef2f2',
          'danger-border': '#fecaca',
        },
      },
      fontFamily: {
        sans: [
          'Public Sans',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'sans-serif',
        ],
        display: ['Libre Franklin', 'Public Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'nbs-card':
          '0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06)',
        'nbs-hover': '0 10px 30px -12px rgba(15, 23, 42, 0.25)',
      },
      backgroundImage: {
        'nbs-hero':
          'radial-gradient(120% 120% at 100% 0%, #0394d9 0%, #0272a7 45%, #024d70 100%)',
      },
      keyframes: {
        'overlay-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'modal-in': {
          from: { opacity: '0', transform: 'translateY(8px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        'overlay-in': 'overlay-in 150ms ease-out',
        'modal-in': 'modal-in 180ms ease-out',
      },
    },
  },
  plugins: [],
};
