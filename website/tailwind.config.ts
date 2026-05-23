import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ["Playfair Display", "Georgia", "serif"],
        sans:  ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        navy: {
          950: "#040C17",
          900: "#060E1B",
          800: "#091525",
          700: "#0E1E31",
          600: "#14273E",
          500: "#1C334F",
        },
        gold: {
          300: "#F0CC7A",
          400: "#E4B84A",
          500: "#C9A140",
          600: "#A67C28",
          700: "#7D5C1A",
        },
        ink: {
          50:  "#F2F4F7",
          100: "#D8DFE8",
          200: "#B0BFCF",
          300: "#8799AE",
          400: "#627385",
          500: "#435462",
          600: "#2E3C4E",
          700: "#1E2C3A",
        },
      },
      animation: {
        "fade-up":   "fadeUp 0.7s ease-out both",
        "fade-in":   "fadeIn 0.6s ease-out both",
        "line-grow": "lineGrow 1s ease-out both",
      },
      keyframes: {
        fadeUp: {
          "0%":   { opacity: "0", transform: "translateY(32px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        lineGrow: {
          "0%":   { transform: "scaleX(0)" },
          "100%": { transform: "scaleX(1)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
