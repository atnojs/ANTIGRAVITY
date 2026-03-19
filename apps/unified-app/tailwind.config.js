/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#041847',
        'bg-secondary': '#0c1445',
        'neon-cyan': '#2ee8ff',
        'neon-pink': '#ff4ecd',
        'neon-purple': '#d54cff',
      },
      fontFamily: {
        montserrat: ['Montserrat', 'sans-serif'],
        poppins: ['Poppins', 'sans-serif'],
      },
      backgroundImage: {
        'main-gradient': 'linear-gradient(135deg, #041847 0%, #0c1445 35%, #1e3a8a 75%, #00bcd4 100%)',
      },
    },
  },
  plugins: [],
}
