import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0b0f17",
        foreground: "#f1f5f9",
        card: {
          DEFAULT: "#111827",
          foreground: "#f8fafc",
          border: "#1f2937",
        },
        popover: {
          DEFAULT: "#111827",
          foreground: "#f8fafc",
        },
        primary: {
          DEFAULT: "#3b82f6",
          foreground: "#ffffff",
          muted: "#1d4ed8",
        },
        secondary: {
          DEFAULT: "#1e293b",
          foreground: "#cbd5e1",
        },
        muted: {
          DEFAULT: "#1e293b",
          foreground: "#94a3b8",
        },
        accent: {
          DEFAULT: "#0284c7",
          foreground: "#ffffff",
        },
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "#ffffff",
          muted: "#7f1d1d",
        },
        warning: {
          DEFAULT: "#f59e0b",
          foreground: "#111827",
          muted: "#78350f",
        },
        success: {
          DEFAULT: "#10b981",
          foreground: "#ffffff",
          muted: "#064e3b",
        },
        border: "#1f2937",
        input: "#1e293b",
        ring: "#3b82f6",
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem",
      },
    },
  },
  plugins: [],
} satisfies Config;
