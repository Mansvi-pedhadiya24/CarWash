/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#fff1ef',
          100: '#fee0db',
          500: '#f6413b',
          600: '#eb3c25',
          700: '#d81d1d',
        },
      },
      keyframes: {
        'slide-up': {
          '0%':   { opacity: '0', transform: 'translateY(20px) scale(0.95)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'bounce-in': {
          '0%':   { transform: 'scale(0)', opacity: '0' },
          '60%':  { transform: 'scale(1.15)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'typing': {
          '0%, 60%, 100%': { transform: 'translateY(0)' },
          '30%':           { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        'slide-up':  'slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in':   'fade-in 0.2s ease',
        'bounce-in': 'bounce-in 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'typing-1':  'typing 1.2s ease-in-out infinite',
        'typing-2':  'typing 1.2s ease-in-out 0.2s infinite',
        'typing-3':  'typing 1.2s ease-in-out 0.4s infinite',
      },
    },
  },
  plugins: [],
}