/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        fox: {
          pink: "#EF4593",
          "pink-dark": "#D23882",
          "pink-light": "#F98BC0",
          dark: "#1A1A2E",
          gray: "#F5F7FA",
          "gray-dark": "#2D3748",
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        display: ["Poppins", "sans-serif"],
      },
      boxShadow: {
        fox: "0 4px 20px rgba(239, 69, 147, 0.15)",
        "fox-lg": "0 10px 40px rgba(239, 69, 147, 0.2)",
      },
    },
  },
  plugins: [],
};
