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
        // "Vital Blue" — primary. Confident, clinical-but-warm.
        primary: {
          DEFAULT: "#2F6FED",
          foreground: "#FFFFFF",
        },
        // "Pulse Teal" — secondary. Calm, restorative.
        secondary: {
          DEFAULT: "#0EA88B",
          foreground: "#FFFFFF",
        },
        // "Bloom Violet" — accent. Used sparingly in gradients.
        accent: {
          DEFAULT: "#8B7CF6",
          foreground: "#FFFFFF",
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "hsl(var(--foreground))",
        },
        danger: {
          DEFAULT: "#E0393F",
          foreground: "#FEF2F2",
        },
        success: {
          DEFAULT: "#16A34A",
          foreground: "#F0FDF4",
        },
        warning: {
          DEFAULT: "#F59E0B",
          foreground: "#78350F",
        },
        muted: {
          DEFAULT: "#EEF2F8",
          foreground: "#5B6577",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
        // Restrained editorial serif — used only for hero/section display
        // headlines to give the product warmth a pure-sans health app lacks.
        display: ["ui-serif", "Iowan Old Style", "Palatino Linotype", "Georgia", "serif"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      boxShadow: {
        glow: "0 0 40px -10px rgba(47, 111, 237, 0.30)",
        "glow-accent": "0 0 40px -10px rgba(14, 168, 139, 0.30)",
        soft: "0 8px 30px -8px rgba(30, 64, 175, 0.12)",
        popover: "0 20px 50px -12px rgba(20, 40, 80, 0.25)",
      },
      backgroundImage: {
        "grid-pattern":
          "linear-gradient(to right, rgba(30,41,59,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(30,41,59,0.05) 1px, transparent 1px)",
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
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
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
        float: "float 5s ease-in-out infinite",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
};

export default config;
