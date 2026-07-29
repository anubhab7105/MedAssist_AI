import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1280px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#2563EB",
          foreground: "#F8FAFC",
        },
        secondary: {
          DEFAULT: "#14B8A6",
          foreground: "#F8FAFC",
        },
        accent: {
          DEFAULT: "#06B6D4",
          foreground: "#F8FAFC",
        },
        card: {
          DEFAULT: "#1E293B",
          foreground: "#F1F5F9",
        },
        danger: {
          DEFAULT: "#EF4444",
          foreground: "#FEF2F2",
        },
        success: {
          DEFAULT: "#22C55E",
          foreground: "#F0FDF4",
        },
        warning: {
          DEFAULT: "#F59E0B",
          foreground: "#FFFBEB",
        },
        muted: {
          DEFAULT: "#334155",
          foreground: "#94A3B8",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      boxShadow: {
        glow: "0 0 40px -10px rgba(37, 99, 235, 0.35)",
        "glow-accent": "0 0 40px -10px rgba(6, 182, 212, 0.35)",
        soft: "0 8px 30px rgba(0, 0, 0, 0.25)",
      },
      backgroundImage: {
        "grid-pattern":
          "linear-gradient(to right, rgba(148,163,184,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.06) 1px, transparent 1px)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-line": {
          "0%": { strokeDashoffset: "1000" },
          "100%": { strokeDashoffset: "0" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s ease-out forwards",
        "pulse-line": "pulse-line 2.4s linear infinite",
        shimmer: "shimmer 2s infinite linear",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
};

export default config;
