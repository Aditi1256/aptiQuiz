/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        petrol: {
          950: '#07181c',
          900: '#0a2127',
          850: '#0d2930',
          800: '#11343c',
          750: '#16404a',
          700: '#1c4e5b',
          600: '#276879',
          500: '#34849a',
        },
        brand: {
          amber: '#f59e0b',
          'amber-hover': '#d97706',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'system-ui', '-apple-system', 'sans-serif'],
      },
      keyframes: {
        modalIn: {
          '0%': { opacity: '0', transform: 'scale(0.97) translateY(6px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        }
      },
      animation: {
        'modal-in': 'modalIn 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in': 'fadeIn 0.15s ease-out forwards',
      }
    },
  },
  plugins: [],
}
