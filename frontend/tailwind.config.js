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
          light: '#E8F5E9',       // Premium soft green bg
          DEFAULT: '#2E7D32',     // Professional medium green
          primary: '#1B4332',     // Rich deep forest green
          secondary: '#40916C',   // Elegant secondary green
          accent: '#81C784',      // Soft accent green
          text: '#1C2E24',        // Rich dark text
          bg: '#FAFDFB',          // Clean canvas bg
          border: '#E3ECE6'       // Subtle border
        }
      },
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'sans-serif'],
        jakarta: ['Plus Jakarta Sans', 'sans-serif'],
        inter: ['Inter', 'sans-serif']
      }
    },
  },
  plugins: [],
}
