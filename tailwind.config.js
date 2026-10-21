/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        canvas: "#F6F7F5",
        ink: "#172027",
        "ink-2": "#4F5D68",
        steel: "#819199",
        rule: "#CBD2D5",
        laser: "#F05A24",
        bay: "#1B252C",
      },
      fontFamily: {
        sans: ['"Archivo Variable"', "Archivo", "system-ui", "sans-serif"],
      },
      maxWidth: { page: "1200px" },
      animation: {
        "fade-in-down": "fade-in-down 0.5s ease-out",
      },
      keyframes: {
        "fade-in-down": {
          "0%": { opacity: "0", transform: "translateY(-20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
