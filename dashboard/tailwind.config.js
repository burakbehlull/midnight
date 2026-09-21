/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        midnight: {
          darker: '#0a0a0f',
          dark: '#121218',
          base: '#1a1a24',
          light: '#24242f',
          purple: '#9333ea',
          pink: '#ec4899'
        }
      }
    },
  },
  plugins: [],
}
