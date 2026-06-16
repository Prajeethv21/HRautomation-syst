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
          light: '#F4F9EC',       // Soft yellow-green bg tint
          DEFAULT: '#8CC63F',     // Vibrant yellow-green logo color
          primary: '#111111',     // Rich black
          secondary: '#333333',   // Charcoal grey
          accent: '#A6D763',      // Soft yellow-green accent
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
