/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        accent: '#1ccba1',
        'bg-page': '#050510',
        'bg-section': '#0a0a18',
        'text-primary': '#e8e8ff',
      },
      fontFamily: {
        sans: ['AnekLatin', 'sans-serif'],
        mono: ['SpaceMono', 'monospace'],
      },
    },
  },
  plugins: [],
};
