/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'ui-sans-serif', 'sans-serif'],
      },
      colors: {
        pitch: {
          950: '#000000',
          900: '#09090b',
          850: '#121215',
          800: '#18181b',
          700: '#27272a',
          600: '#3f3f46',
        },
        brand: {
          50: '#f4f5f7',
          100: '#e7e9ed',
          200: '#cfd3db',
          300: '#a8afbd',
          400: '#7c8598',
          500: '#5b6478',
          600: '#454c5e',
          700: '#383e4d',
          800: '#2c303b',
          900: '#1c1e26',
          950: '#101117',
        },
      },
      boxShadow: {
        subtle: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.06)',
        'card-dark': '0 1px 3px 0 rgba(0, 0, 0, 0.5), 0 1px 2px -1px rgba(0, 0, 0, 0.5)',
        elevated: '0 8px 24px -8px rgba(15, 23, 42, 0.12)',
      },
      backgroundImage: {
        'grid-light':
          'linear-gradient(rgba(0,0,0,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.025) 1px, transparent 1px)',
        'grid-dark':
          'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
        'fade-radial':
          'radial-gradient(60% 50% at 50% 0%, rgba(15,23,42,0.06), transparent)',
      },
      backgroundSize: { grid: '36px 36px' },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-up': 'fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        shimmer: 'shimmer 1.8s infinite',
      },
    },
  },
  plugins: [],
};
