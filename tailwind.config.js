/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ridesync: {
          // Primary green — used for primary actions and accents
          50: '#f0faf4',
          100: '#dcf2e6',
          200: '#bbe5d0',
          300: '#8ad3b1',
          400: '#54b888',
          500: '#2f9d6a',
          600: '#1f8055',
          700: '#1a6747',
          800: '#18523a',
          900: '#154331',
          950: '#0a2618',
        },
        charcoal: {
          DEFAULT: '#1d2421',
          soft: '#3a4441',
          muted: '#6b7570',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(16, 24, 40, 0.06), 0 1px 2px 0 rgba(16, 24, 40, 0.04)',
        'card-hover':
          '0 4px 12px 0 rgba(16, 24, 40, 0.08), 0 2px 4px 0 rgba(16, 24, 40, 0.04)',
        focus: '0 0 0 3px rgba(47, 157, 106, 0.25)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.35s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
