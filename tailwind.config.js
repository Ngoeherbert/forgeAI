/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0b0b0d",
          subtle: "#111114",
          panel: "#151519",
          hover: "#1b1b20",
          border: "#26262c",
        },
        accent: {
          DEFAULT: "#3b82f6",
          hover: "#2563eb",
        },
        muted: {
          DEFAULT: "#8a8a94",
          strong: "#c7c7cf",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};
