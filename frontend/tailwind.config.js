/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#1B3A5C",
        accent: "#007A8C",
        surface: "#F4F6F8",
        danger: "#E57373",
        success: "#2ECC71",
      },
      borderRadius: {
        card: "1rem",
      },
      boxShadow: {
        card: "0 8px 24px rgba(27, 58, 92, 0.08)",
      },
    },
  },
  plugins: [],
};
