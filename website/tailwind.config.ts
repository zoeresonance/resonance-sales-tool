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
          50: "#f0f8f8",
          100: "#d9eeed",
          200: "#b8d9d9",
          300: "#8bbfbf",
          400: "#6baaaa",
          500: "#4e9494",
          600: "#3a7878",
          700: "#2d5f5f",
          dark: "#1a1a1a",
        },
      },
    },
  },
  plugins: [],
};

export default config;
