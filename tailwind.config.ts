import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          base: '#F3F3F6',
          panel: '#FFFFFF',
          elevated: '#FAFAFD',
          hover: '#EBEBF0',
          canvas: '#E2E2E8',
        },
        accent: {
          DEFAULT: '#6442FF',
          muted: '#B9A7FF',
          glow: '#8A6BFF',
        },
        text: {
          primary: '#16161C',
          secondary: '#4A4A55',
          tertiary: '#82828F',
        },
        line: {
          subtle: 'rgba(0, 0, 0, 0.05)',
          DEFAULT: 'rgba(0, 0, 0, 0.09)',
          strong: 'rgba(0, 0, 0, 0.14)',
        },
        selection: {
          glow: '#F08237',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        bravura: ['Bravura', 'serif'],
      },
      fontSize: {
        'micro': ['10px', { lineHeight: '14px', letterSpacing: '0.06em' }],
        'label': ['11px', { lineHeight: '14px', letterSpacing: '0.12em' }],
      },
      boxShadow: {
        'inset-hairline': 'inset 0 1px 0 rgba(255, 255, 255, 0.6)',
        'panel': '0 1px 0 rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.06)',
        'float': '0 8px 24px -8px rgba(20,20,30,0.18), 0 2px 6px rgba(20,20,30,0.06)',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
