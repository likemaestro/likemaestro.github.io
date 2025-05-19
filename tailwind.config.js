/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        "custom-dark-blue": "#102c53", // This will be the lighter end of the gradient
        "custom-deep-ocean": "#030B1A", // This is the new much darker color
      },
      fontFamily: {
        sans: ["Manrope", "sans-serif"],
      },
      animation: {
        "fade-in-down": "fade-in-down 0.5s ease-out",
        "slide-in-left": "slide-in-left 0.5s ease-out",
      },
      keyframes: {
        "fade-in-down": {
          "0%": {
            opacity: "0",
            transform: "translateY(-20px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "slide-in-left": {
          "0%": {
            opacity: "0",
            transform: "translateX(-20px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateX(0)",
          },
        },
      },
    },
  },
  plugins: [],
};
