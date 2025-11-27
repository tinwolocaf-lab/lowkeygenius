/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          soft: 'var(--color-primary-soft)',
          light: 'var(--color-primary-light)',
          dark: 'var(--color-primary-dark)',
          darker: 'var(--color-primary-darker)',
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)',
          light: 'var(--color-secondary-light)',
          dark: 'var(--color-secondary-dark)',
        },
        accent: {
          yellow: 'var(--color-accent-yellow)',
          orange: 'var(--color-accent-orange)',
          green: 'var(--color-accent-green)',
          red: 'var(--color-accent-red)',
        },
        neutral: {
          text: 'var(--color-neutral-text)',
          'text-muted': 'var(--color-neutral-text-muted)',
          bg: 'var(--color-neutral-bg)',
          surface: 'var(--color-neutral-surface)',
          'surface-dark': 'var(--color-neutral-surface-dark)',
          border: 'var(--color-neutral-border)',
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
        soft: 'var(--shadow-soft)',
        tile: 'var(--shadow-tile)',
        'tile-hover': 'var(--shadow-tile-hover)',
        button: 'var(--shadow-button)',
        'button-hover': 'var(--shadow-button-hover)',
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
