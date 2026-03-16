/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#0f172a',
          card: '#1e293b',
          hover: '#334155',
          border: '#334155',
        },
        brand: {
          DEFAULT: '#6366f1',
          hover: '#4f46e5',
          light: '#818cf8',
        },
        accent: {
          green: '#22c55e',
          yellow: '#eab308',
          red: '#ef4444',
        },
      },
    },
  },
  plugins: [],
}
