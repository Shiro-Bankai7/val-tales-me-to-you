import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#2A1103",
        cocoa: "#3D1606",
        rose: "#A7001E",
        blush: "#9F2042",
        cream: "#F4E8EE",
        white: "#FFFFFF"
      },
      boxShadow: {
        soft: "0 10px 30px rgba(47, 36, 52, 0.15)"
      }
    }
  },
  plugins: []
};

export default config;
