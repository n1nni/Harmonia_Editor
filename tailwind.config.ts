import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          base: '#0B0B0E',
          panel: '#15151A',
          elevated: '#1F1F26',
          hover: '#2A2A33',
        },
        accent: {
          DEFAULT: '#7C5CFF',
          muted: '#5A45BF',
          glow: '#9B82FF',
        },
        text: {
          primary: '#EDEDF0',
          secondary: '#9A9AA6',
          tertiary: '#5F5F6B',
        },
        line: {
          subtle: 'rgba(255, 255, 255, 0.05)',
          DEFAULT: 'rgba(255, 255, 255, 0.08)',
          strong: 'rgba(255, 255, 255, 0.12)',
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
        'inset-hairline': 'inset 0 1px 0 rgba(255, 255, 255, 0.04)',
        'panel': '0 1px 0 rgba(255,255,255,0.04) inset, 0 0 0 1px rgba(255,255,255,0.05)',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
