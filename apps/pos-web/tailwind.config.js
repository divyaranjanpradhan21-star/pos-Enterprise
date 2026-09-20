/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        surface: {
          50:  'hsl(222,47%,97%)',
          100: 'hsl(222,47%,93%)',
          800: 'hsl(222,47%,11%)',
          900: 'hsl(222,47%,8%)',
          950: 'hsl(222,47%,5%)',
        },
        brand: {
          400: 'hsl(245,85%,70%)',
          500: 'hsl(245,85%,60%)',
          600: 'hsl(245,85%,50%)',
        },
        success: 'hsl(142,76%,36%)',
        warning: 'hsl(38,92%,50%)',
        danger:  'hsl(0,84%,60%)',
      },
      animation: {
        'fade-in':    'fadeIn 0.15s ease-out',
        'slide-up':   'slideUp 0.2s ease-out',
        'slide-down': 'slideDown 0.2s ease-out',
        'pulse-fast': 'pulse 0.8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer':    'shimmer 1.5s infinite',
      },
      keyframes: {
        fadeIn:    { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp:   { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideDown: { from: { opacity: '0', transform: 'translateY(-8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      boxShadow: {
        'glow-brand': '0 0 20px hsl(245,85%,60%,0.35)',
        'glow-success': '0 0 16px hsl(142,76%,36%,0.30)',
        'card': '0 1px 3px 0 rgba(0,0,0,0.4), 0 1px 2px -1px rgba(0,0,0,0.4)',
        'card-hover': '0 4px 12px 0 rgba(0,0,0,0.5)',
      },
    },
  },
  plugins: [],
};
