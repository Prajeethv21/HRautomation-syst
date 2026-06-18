/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          light: '#F7FAF4',       // Sleek light brand green-tint
          DEFAULT: '#91ba30',     // Premium green from the 2nd image
          primary: '#111111',     // Rich black
          secondary: '#333333',   // Charcoal grey
          accent: '#e7d801',      // Radiant logo yellow/lime
          text: '#111111',        // Rich dark charcoal text
          bg: '#FFFFFF',          // Clean white canvas bg
          border: '#E5E7EB'       // Subtle light gray border
        }
      },
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'sans-serif'],
        jakarta: ['Plus Jakarta Sans', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
        poppins: ['Plus Jakarta Sans', 'Inter', 'sans-serif']
      }
    },
  },
  plugins: [],
}
