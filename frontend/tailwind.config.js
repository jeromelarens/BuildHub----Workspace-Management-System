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
        brand: {
          DEFAULT: '#C7FF00',       // Electric Lemon Green primary
          50: '#F7FFD6',
          100: '#EFFFAD',
          200: '#E5FF70',
          300: '#D4FF33',           // Secondary lemon
          400: '#C7FF00',           // Main Brand
          500: '#A6D600',
          600: '#82A800',
          700: '#5F7A00',
          800: '#3D4D00',
          900: '#1D2400',
          hover: '#D4FF33',
          muted: '#C7FF001A',       // 10% opacity for pills / active backgrounds
          border: '#C7FF004D',      // 30% opacity for focused borders
        },
        dark: {
          bg: '#080A08',            // Deep Dark background
          surface: '#101410',       // Default Card / Container Surface
          elevated: '#151A15',      // Elevated surface (modals, dropdowns, hovered items)
          hover: '#192019',         // Item hover state
          border: '#242A24',        // Default subtle border
          borderSubtle: '#1C221C',  // Divider border
          borderHover: '#333C33',   // Interactive border hover
        },
        text: {
          primary: '#F5F7F2',       // Crisp primary high contrast text
          secondary: '#A1A99F',     // Secondary descriptive text
          muted: '#6F776D',         // Subtle metadata text
        },
        status: {
          success: '#5CFF7A',
          warning: '#FFB84D',
          danger: '#FF5C5C',
          info: '#5CC8FF',
          todo: '#A1A99F',
          inProgress: '#5CC8FF',
          completed: '#5CFF7A',
          blocked: '#FF5C5C',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Outfit', 'Plus Jakarta Sans', 'sans-serif'],
        handwritten: ['Caveat', 'cursive', 'sans-serif'],
      },
      borderRadius: {
        'sm': '6px',
        'md': '10px',
        'lg': '14px',
        'xl': '18px',
        '2xl': '22px',
      },
      boxShadow: {
        'card': '0 4px 20px -2px rgba(0, 0, 0, 0.45)',
        'elevated': '0 10px 30px -4px rgba(0, 0, 0, 0.6)',
        'lemon-glow': '0 0 20px -2px rgba(199, 255, 0, 0.25)',
        'lemon-sm': '0 0 10px -1px rgba(199, 255, 0, 0.2)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
