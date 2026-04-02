import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
        },
        awq: {
          gold:     "#C9A84C",
          "gold-light": "#E8D59A",
          "gold-dark":  "#A68A3A",
          dark:     "#1A1A2E",
          "dark-600": "#252542",
          "dark-400": "#3A3A5C",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          subtle:  "#F9FAFB",
          muted:   "#F3F4F6",
          sunken:  "#E5E7EB",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],  // 10px
        "caption": ["0.6875rem", { lineHeight: "1rem" }],  // 11px
      },
      boxShadow: {
        "card": "0 1px 3px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.02)",
        "card-hover": "0 4px 12px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.04)",
        "elevated": "0 4px 6px -1px rgba(0, 0, 0, 0.06), 0 2px 4px -2px rgba(0, 0, 0, 0.04)",
        "executive": "0 1px 3px rgba(0, 0, 0, 0.06), 0 8px 24px rgba(0, 0, 0, 0.04)",
      },
      borderRadius: {
        "2.5xl": "1.25rem",
      },
      animation: {
        "fade-in": "fadeIn 200ms ease-out",
        "slide-in": "slideIn 250ms ease-out",
        "slide-in-left": "slideInLeft 250ms ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideIn: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInLeft: {
          "0%": { opacity: "0", transform: "translateX(-8px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
