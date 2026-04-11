// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        head: ['var(--font-head)', 'Syne', 'sans-serif'],
        body: ['var(--font-body)', 'DM Sans', 'sans-serif'],
      },
      colors: {
        accent:  '#FF6B35',
        accent2: '#4A90D9',
        accent3: '#2DCB7A',
        accent4: '#F5A623',
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
