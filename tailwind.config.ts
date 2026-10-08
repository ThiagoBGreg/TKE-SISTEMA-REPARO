import type { Config } from 'tailwindcss';

export default {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        tke: {
          purple: '#791E88',
          'purple-light': '#9C27B0',
          'purple-dark': '#4A154B',
          magenta: '#B81B6C',
          ruby: '#E11D48',
          orange: '#FF5E00',
          'orange-light': '#FF7A29',
          'orange-dark': '#D64900',
          amber: '#F59E0B',
          dark: '#0B0F19',
          'dark-surface': '#131B2E',
          'dark-card': '#1E293B',
          gray: '#F8FAFC',
          red: '#FF5E00', // Adaptado para a nova identidade
          'red-dark': '#D64900',
        },
      },
      backgroundImage: {
        'tke-gradient': 'linear-gradient(135deg, #791E88 0%, #B81B6C 45%, #FF5E00 100%)',
        'tke-gradient-h': 'linear-gradient(90deg, #791E88 0%, #B81B6C 45%, #FF5E00 100%)',
        'tke-gradient-orange': 'linear-gradient(135deg, #FF5E00 0%, #FF7A29 100%)',
        'tke-gradient-purple': 'linear-gradient(135deg, #4A154B 0%, #791E88 100%)',
        'tke-gradient-dark': 'linear-gradient(135deg, #0B0F19 0%, #131B2E 100%)',
      },
      animation: {
        'shimmer': 'shimmer 2.5s infinite linear',
        'pulse-glow': 'pulseGlow 2.8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float-slow': 'floatSlow 4s ease-in-out infinite',
        'gradient-flow': 'gradientFlow 6s ease infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-150%)' },
          '100%': { transform: 'translateX(250%)' },
        },
        pulseGlow: {
          '0%, 100%': {
            boxShadow: '0 0 15px -3px rgba(255, 94, 0, 0.35), 0 0 6px -2px rgba(121, 30, 136, 0.3)',
          },
          '50%': {
            boxShadow: '0 0 30px 2px rgba(255, 94, 0, 0.65), 0 0 14px 1px rgba(184, 27, 108, 0.5)',
          },
        },
        floatSlow: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        gradientFlow: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;

