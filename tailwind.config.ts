// tailwind.config.ts
import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border-h) var(--border-s) var(--border-l) / <alpha-value>)",
        input: "hsl(var(--input-h) var(--input-s) var(--input-l) / <alpha-value>)",
        ring: "hsl(var(--ring-h) var(--ring-s) var(--ring-l) / <alpha-value>)",
        background: "hsl(var(--background-h) var(--background-s) var(--background-l) / <alpha-value>)", // Updated to use HSL components
        foreground: "hsl(var(--foreground-h) var(--foreground-s) var(--foreground-l) / <alpha-value>)",
        primary: {
          DEFAULT: "hsl(var(--primary-h) var(--primary-s) var(--primary-l) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground-h) var(--primary-foreground-s) var(--primary-foreground-l) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary-h) var(--secondary-s) var(--secondary-l) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground-h) var(--secondary-foreground-s) var(--secondary-foreground-l) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive-h) var(--destructive-s) var(--destructive-l) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground-h) var(--destructive-foreground-s) var(--destructive-foreground-l) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted-h) var(--muted-s) var(--muted-l) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground-h) var(--muted-foreground-s) var(--muted-foreground-l) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent-h) var(--accent-s) var(--accent-l) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground-h) var(--accent-foreground-s) var(--accent-foreground-l) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover-h) var(--popover-s) var(--popover-l) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground-h) var(--popover-foreground-s) var(--popover-foreground-l) / <alpha-value>)",
        },
        card: {
          DEFAULT: "hsl(var(--card-h) var(--card-s) var(--card-l) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground-h) var(--card-foreground-s) var(--card-foreground-l) / <alpha-value>)",
        },
        success: {
          DEFAULT: "hsl(var(--success-h) var(--success-s) var(--success-l) / <alpha-value>)",
          foreground: "hsl(var(--success-foreground-h) var(--success-foreground-s) var(--success-foreground-l) / <alpha-value>)",
        },
        warning: {
          DEFAULT: "hsl(var(--warning-h) var(--warning-s) var(--warning-l) / <alpha-value>)",
          foreground: "hsl(var(--warning-foreground-h) var(--warning-foreground-s) var(--warning-foreground-l) / <alpha-value>)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-ui)"],
        mono: ["var(--font-mono)"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "blink": "blink 1s step-start infinite",
      },
    },
  },
  plugins: [
    require("@tailwindcss/typography"),
    require("tailwindcss-animate")
  ],
}

export default config