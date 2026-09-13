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
        // Not named after a color: `shadow-<color>` would recolor the shadow with that color at full opacity.
        card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 6px 16px -12px rgba(15, 23, 42, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
