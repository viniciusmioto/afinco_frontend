import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        panel: "#1e293b",
        canvas: "#f8fafc",
      },
      boxShadow: {
        panel: "0 20px 45px -28px rgba(15, 23, 42, 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
