import type { Config } from "tailwindcss";

/** Chaque couleur pointe vers un jeton de globals.css — jamais de hex ici. */
const token = (name: string) => `var(--${name})`;

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: token("bg"),
        surface: { DEFAULT: token("surface"), 2: token("surface-2"), 3: token("surface-3") },
        ink: { DEFAULT: token("ink"), 2: token("ink-2"), 3: token("ink-3"), 4: token("ink-4") },
        line: { DEFAULT: token("line"), 2: token("line-2") },
        brand: {
          DEFAULT: token("brand"), 2: token("brand-2"), 3: token("brand-3"),
          4: token("brand-4"), soft: token("brand-soft"),
        },
        gold: { DEFAULT: token("gold"), 2: token("gold-2"), soft: token("gold-soft") },
        success: { DEFAULT: token("success"), soft: token("success-soft") },
        warning: { DEFAULT: token("warning"), soft: token("warning-soft") },
        danger: { DEFAULT: token("danger"), soft: token("danger-soft") },
        violet: { DEFAULT: token("violet"), soft: token("violet-soft") },
        teal: { DEFAULT: token("teal"), soft: token("teal-soft") },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "Times New Roman", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      fontSize: {
        "2xs": ["11px", { lineHeight: "14px", letterSpacing: "0.06em" }],
        xs: ["12px", { lineHeight: "17px" }],
        sm: ["13px", { lineHeight: "20px" }],
        base: ["14px", { lineHeight: "21px" }],
        md: ["16px", { lineHeight: "25px" }],
        lg: ["18px", { lineHeight: "27px" }],
        xl: ["22px", { lineHeight: "28px", letterSpacing: "-0.02em" }],
        "2xl": ["28px", { lineHeight: "34px", letterSpacing: "-0.02em" }],
        "3xl": ["36px", { lineHeight: "42px", letterSpacing: "-0.025em" }],
        "4xl": ["48px", { lineHeight: "54px", letterSpacing: "-0.03em" }],
        "5xl": ["64px", { lineHeight: "68px", letterSpacing: "-0.035em" }],
      },
      borderRadius: { DEFAULT: "4px", sm: "4px", md: "8px", lg: "14px" },
      boxShadow: { 1: "var(--shadow-1)", 2: "var(--shadow-2)", 3: "var(--shadow-3)" },
      maxWidth: { content: "1440px", prose: "68ch" },
      transitionTimingFunction: { out: "cubic-bezier(.2,.8,.3,1)" },
    },
  },
  plugins: [],
} satisfies Config;
