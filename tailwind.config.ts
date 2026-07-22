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
          50:  "#e8f6fd",
          100: "#c9eafa",
          200: "#98d5f5",
          300: "#65c0f2",
          400: "#39aeed",
          500: "#1e9de8",
          600: "#0487D9",
          700: "#023E73",
          800: "#023373",
          900: "#011f4d",
        },
        awq: {
          gold:         "#C9A84C",
          "gold-light": "#E8D59A",
          "gold-dark":  "#A68A3A",
          dark:         "#1A1A2E",
          "dark-600":   "#252542",
          "dark-400":   "#3A3A5C",
          navy:         "#023373",
          panel:        "#0487D9",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          subtle:  "#F9FAFB",
          muted:   "#F3F4F6",
          sunken:  "#E5E7EB",
        },
        // Identidade visual da Patricia Canto Advocacia (CRM independente em /patricia-canto).
        canto: {
          50:  "#FBF9F5",
          100: "#F3EEE4",
          200: "#E3D9C4",
          300: "#CBBB9A",
          400: "#B3A385",
          500: "#9C8B6C",
          600: "#847455",
          700: "#665845",
          800: "#473F34",
          900: "#2B2620",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        "canto-serif": ["var(--font-canto-serif)", "Georgia", "serif"],
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
