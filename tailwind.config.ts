import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#FFFFFF",
        primary: {
          DEFAULT: "#E52521",
          hover: "#C81E1B",
          light: "#FDF2F2",
        },
        obsidian: "#14171F",
        muted: "#6B7280",
        rule: "#E5E7EB",
        mario: {
          sky: "#5C94FC",
          brick: "#C84C0C",
          outline: "#2B1B0E",
        },
      },
      borderRadius: {
        theme: "10px",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        pixel: ["var(--font-press-start-2p)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
