/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        bg: {
          DEFAULT: '#0F1117',
          surface: '#1A1D27',
          elevated: '#242836',
          hover: '#2D3245',
        },
        accent: {
          DEFAULT: '#A774F2',
          hover: '#9560E0',
          muted: '#A774F220',
        },
        error: {
          DEFAULT: '#EF4444',
          muted: '#EF444420',
        },
        warning: {
          DEFAULT: '#F59E0B',
          muted: '#F59E0B20',
        },
        success: {
          DEFAULT: '#22C55E',
          muted: '#22C55E20',
        },
        text: {
          primary: '#F8FAFC',
          secondary: '#94A3B8',
          muted: '#64748B',
        },
        border: {
          DEFAULT: '#2D3245',
          focus: '#A774F2',
        },
      },
      keyframes: {
        'toast-in': {
          '0%': { opacity: '0', transform: 'translateX(100%)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'toast-out': {
          '0%': { opacity: '1', transform: 'translateX(0)' },
          '100%': { opacity: '0', transform: 'translateX(100%)' },
        },
      },
      animation: {
        'toast-in': 'toast-in 300ms ease-out',
        'toast-out': 'toast-out 300ms ease-in forwards',
      },
    },
  },
  plugins: [],
}
