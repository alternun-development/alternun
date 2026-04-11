/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        teal: {
          DEFAULT: '#1ccba1',
          dark: '#0fa880',
          light: '#5bf6d0',
        },
        gold: '#d4b96a',
        navy: {
          DEFAULT: '#040f1e',
          light: '#081627',
        },
      },
      fontFamily: {
        sans: ['var(--font-anek-latin)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
