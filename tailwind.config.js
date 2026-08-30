/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        fox: {
          pink: '#FF4C9C',
          'pink-dark': '#E03E8A',
          'pink-light': '#FF6BAF',
          dark: '#1A1A2E',
          gray: '#F5F7FA',
          'gray-dark': '#2D3748',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Poppins', 'sans-serif'],
      },
      boxShadow: {
        'fox': '0 4px 20px rgba(255, 76, 156, 0.15)',
        'fox-lg': '0 10px 40px rgba(255, 76, 156, 0.2)',
      }
    },
  },
  plugins: [],
}