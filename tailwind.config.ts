import type { Config } from "tailwindcss";

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "var(--bg-main)",
        surface: "var(--bg-card)",
        "surface-card": "var(--bg-card)",
        "surface-border": "var(--border-color)",
        brand: {
          emerald: "#10b981",
          sky: "#0ea5e9",
          amber: "#f59e0b",
          rose: "#f43f5e",
          purple: "#8b5cf6",
        }
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["Roboto Mono", "Courier New", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
