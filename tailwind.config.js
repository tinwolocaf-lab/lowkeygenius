/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FF6DAA',
          soft: '#FF9FC7',
          light: '#FFD1E8',
          dark: '#E94E92',
          darker: '#D03578',
        },
        secondary: {
          DEFAULT: '#1CB0F6',
          light: '#7DD8FF',
          dark: '#0098DB',
        },
        accent: {
          yellow: '#FFC800',
          orange: '#FF9600',
          green: '#58CC02',
          red: '#FF4B4B',
        },
        neutral: {
          text: '#3C3C3C',
          'text-muted': '#777777',
          bg: '#FFFFFF',
          surface: '#F7F7F7',
          'surface-dark': '#E5E5E5',
          border: '#E5E5E5',
        },
      },
      borderRadius: {
        sm: '12px',
        md: '16px',
        lg: '20px',
        xl: '24px',
        '2xl': '32px',
        '3xl': '40px',
        pill: '999px',
      },
      boxShadow: {
        soft: '0 4px 12px rgba(0, 0, 0, 0.08)',
        tile: '0 6px 16px rgba(0, 0, 0, 0.1)',
        'tile-hover': '0 8px 20px rgba(0, 0, 0, 0.12)',
        button: '0 4px 0 rgba(0, 0, 0, 0.12)',
        'button-hover': '0 6px 0 rgba(0, 0, 0, 0.12)',
      },
      fontFamily: {
        display: ['Fredoka', 'Quicksand', 'Nunito', 'system-ui', 'sans-serif'],
        body: ['Nunito', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-xl': ['48px', { lineHeight: '1.1', fontWeight: '700', letterSpacing: '-0.02em' }],
        'display-lg': ['40px', { lineHeight: '1.1', fontWeight: '700', letterSpacing: '-0.01em' }],
        'display-md': ['32px', { lineHeight: '1.2', fontWeight: '700' }],
        'display-sm': ['24px', { lineHeight: '1.2', fontWeight: '700' }],
        'body-xl': ['20px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-lg': ['18px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-md': ['16px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-sm': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
      },
      animation: {
        'bounce-soft': 'bounce-soft 1s ease-in-out infinite',
        'scale-in': 'scale-in 0.2s ease-out',
      },
      keyframes: {
        'bounce-soft': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
