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
          red: '#E30613',
          'red-dark': '#B8050F',
          dark: '#111827',
          gray: '#F3F4F6',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
