import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        display: ['"Fraunces"', 'Georgia', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      colors: {
        wine: {
          50: '#fdf2f4',
          100: '#fce7eb',
          200: '#f9d0d8',
          300: '#f3a7b6',
          400: '#ea7389',
          500: '#dc4763',
          600: '#c52a4d',
          700: '#a51e3f',
          800: '#7a1530',
          900: '#5c1226',
          950: '#2d0610',
        },
        cream: {
          50: '#fdfbf7',
          100: '#faf5ec',
          200: '#f4e9d3',
          300: '#ecd9b3',
          400: '#e0c184',
        },
        ink: {
          900: '#1a0f0a',
          800: '#2a1a14',
          700: '#3d2820',
        },
      },
    },
  },
  plugins: [],
};

export default config;
