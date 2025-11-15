/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'amestris-blue': '#1e40af',
        'amestris-red': '#dc2626',
        'alchemy-gold': '#d97706',
      },
    },
  },
  plugins: [],
}