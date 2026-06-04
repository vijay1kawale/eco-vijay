// FIXED: replaced incorrect purple brand palette with correct Boltz-style navy/gold palette
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './pages/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#0A0F1E',
          900: '#0D1321',
          800: '#111827',
          700: '#1A2235',
          600: '#1E2D45',
        },
        gold: {
          DEFAULT: '#C9A84C',
          light: '#E2C97E',
          dark: '#A8872F',
        },
        // Keep old brand names pointing to new palette for backward compat during migration
        brand: {
          primary: '#C9A84C',   // gold — was incorrect purple
        },
        background: {
          DEFAULT: '#0A0F1E',   // navy-950 — was incorrect light
          sidebar: '#0D1321',   // navy-900
          card: '#111827',      // navy-800
          hover: '#1A2235',     // navy-700
        },
        border: {
          DEFAULT: '#1E2D45',   // navy-600
          gold: '#C9A84C',
        },
        text: {
          primary: '#F1F5F9',
          secondary: '#94A3B8',
          muted: '#475569',
        }
      },
      fontFamily: {
        inter: ['Inter', 'ui-sans-serif', 'system-ui']
      },
      boxShadow: {
        gold: '0 0 20px rgba(201,168,76,0.15)',
        card: '0 1px 3px rgba(0,0,0,0.4)',
      },
      borderRadius: {
        '2xl': '1rem'
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #C9A84C 0%, #E2C97E 50%, #C9A84C 100%)',
      }
    }
  },
  plugins: []
};

export default config;
