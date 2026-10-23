/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./index.html"],
  theme: {
    extend: {
      colors: {
        canvas: "#F6F7F5",
        ink: "#172027",
        "ink-2": "#4F5D68",
        steel: "#819199",
        rule: "#CBD2D5",
        laser: "#F05A24",
        bay: "#121A1F",
        wash: "#EEF0EE",   // hover and quiet fills
      },
      fontFamily: {
        sans: ['"Archivo Variable"', "Archivo", "system-ui", "sans-serif"],
      },
      maxWidth: { page: "96rem" },   // 1536 px at the base size, wider with the root size on large screens
      animation: {
        "fade-in-down": "fade-in-down 0.5s ease-out",
        featured: "featured 3s linear both",   // the featured tools' progress bar; ToolsIndex sets the duration
      },
      keyframes: {
        "fade-in-down": {
          "0%": { opacity: "0", transform: "translateY(-20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        featured: { "0%": { transform: "scaleX(0)" }, "100%": { transform: "scaleX(1)" } },
      },
    },
  },
  plugins: [],
};
