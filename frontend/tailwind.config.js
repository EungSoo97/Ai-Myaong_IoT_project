/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0f1419',
        foreground: '#e7e9ea',
        card: '#16202a',
        'card-foreground': '#e7e9ea',
        primary: '#1d9bf0',
        'primary-foreground': '#ffffff',
        secondary: '#1e2732',
        'secondary-foreground': '#8b98a5',
        muted: '#1e2732',
        'muted-foreground': '#71767b',
        accent: '#1d9bf0',
        'accent-foreground': '#ffffff',
        border: '#2f3336',
        input: '#1e2732',
        ring: '#1d9bf0',
        success: '#00ba7c',
        warning: '#ffad1f',
        destructive: '#f4212e',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
