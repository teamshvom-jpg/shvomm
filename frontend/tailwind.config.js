/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#FAF8F5",
        charcoal: "#1A1A1A",
        gold: {
          DEFAULT: "#B89B6A",
          light: "#D4BE96",
          dark: "#967A4D"
        },
        stone: {
          50: "#FAF8F5",
          100: "#F2EFE9",
          200: "#E7E3DC",
          300: "#D3CEC4",
          400: "#8E8880",
          500: "#5A5A58",
          800: "#2B2A29",
          900: "#1A1A1A"
        }
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Playfair Display', 'Georgia', 'serif'],
        sans: ['"Montserrat"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif']
      },
      letterSpacing: {
        'widest-luxury': '0.28em',
        'loose-luxury': '0.18em'
      },
      boxShadow: {
        'subtle': '0 2px 20px -2px rgba(26, 26, 26, 0.04)',
        'elevated': '0 12px 35px -4px rgba(26, 26, 26, 0.08)'
      }
    },
  },
  plugins: [],
}
