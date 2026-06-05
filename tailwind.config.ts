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
        warm: {
          background: "#F7F4EF",
          foreground: "#1F1E1A",
          muted: "#6F6860",
          border: "#E5DDD2",
          surface: "#FFFDF8",
          accent: "#A85F45",
          accentDark: "#864934",
          accentSoft: "#E8D5C8",
        },
      },
      borderRadius: {
        card: "8px",
      },
      fontFamily: {
        sans: [
          "Anthropic Sans",
          "Inter",
          "PingFang SC",
          "Microsoft YaHei",
          "Noto Sans SC",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
        serif: [
          "Anthropic Serif Display",
          "Georgia",
          "Times New Roman",
          "Songti SC",
          "Noto Serif SC",
          "serif",
        ],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "Liberation Mono",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
