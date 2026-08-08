/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#1B3A5C",
        accent: "#007A8C",
      },
    },
  },
  plugins: [],
};
