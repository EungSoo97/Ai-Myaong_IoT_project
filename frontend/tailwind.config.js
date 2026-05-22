/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-primary': '#F08D86',
        'brand-primary-soft': '#F7B5B0',
        'brand-brown': '#4B3621',
        'brand-brown-soft': '#6B4F36',
        'brand-bg': '#FFF9F1',
        'brand-card': '#FFFFFF',
        'brand-cream': '#FBEFDD',
        'brand-paw': '#F5B5A8',
        'brand-mute': '#9C8A78',
        'brand-line': '#EFE3D2',
        'brand-success': '#7FB77E',
        'brand-warning': '#F0B860',
        'brand-danger': '#E26D5C',
      },
      fontFamily: {
        sans: ['Pretendard', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['"Gmarket Sans"', 'Pretendard', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        'soft': '0 8px 24px -6px rgba(75, 54, 33, 0.10), 0 2px 6px -2px rgba(75, 54, 33, 0.06)',
        'soft-lg': '0 18px 40px -12px rgba(75, 54, 33, 0.18), 0 4px 10px -4px rgba(75, 54, 33, 0.06)',
        'soft-inset': 'inset 2px 2px 6px rgba(75, 54, 33, 0.08), inset -2px -2px 6px rgba(255, 255, 255, 0.7)',
        'press': '0 4px 10px -2px rgba(240, 141, 134, 0.45)',
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
      },
    },
  },
  plugins: [],
}
