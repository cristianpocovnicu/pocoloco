import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        orange: {
          DEFAULT: '#E8440A',
          light: '#FFF0EB',
          hover: '#D03D09',
        },
        violet: {
          DEFAULT: '#5B4FCF',
          light: '#EEEDFB',
          hover: '#4F44B8',
        },
        brand: {
          bg: '#F8F7F5',
          card: '#FFFFFF',
          border: 'rgba(0,0,0,0.08)',
          text: '#0F0F0F',
          text2: '#6B6B6B',
          text3: '#9B9B9B',
        },
      },
      fontFamily: {
        outfit: ['Outfit', 'sans-serif'],
        sans: ['DM Sans', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
      },
    },
  },
  plugins: [],
}
export default config
