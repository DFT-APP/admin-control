export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // The @fontsource-variable/geist faces are imported in index.css, but
        // nothing selected them: index.css declared --font-sans on a `.theme`
        // class that is never applied to any element, and Tailwind's own
        // `font-sans` utility resolved to its default stack. The result was a
        // 58KB font bundle that shipped on every load and was never drawn.
        sans: [
          "'Geist Variable'",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "'Segoe UI'",
          "Roboto",
          "sans-serif",
          "'Apple Color Emoji'",
          "'Segoe UI Emoji'",
        ],
      },
      screens: {
        // Small phones (iPhone SE is 375px) get their own step so two-up grids
        // can stay single-column below it.
        xs: "420px",
      },
      colors: {
        border: "oklch(var(--border) / <alpha-value>)",
        input: "oklch(var(--input) / <alpha-value>)",
        ring: "oklch(var(--ring) / <alpha-value>)",
        background: "oklch(var(--background) / <alpha-value>)",
        foreground: "oklch(var(--foreground) / <alpha-value>)",
        primary: "oklch(var(--primary) / <alpha-value>)",
        secondary: "oklch(var(--secondary) / <alpha-value>)",
        muted: "oklch(var(--muted) / <alpha-value>)",
        accent: "oklch(var(--accent) / <alpha-value>)",
        destructive: "oklch(var(--destructive) / <alpha-value>)",
        // The panel's own palette, so the lime and the surface greys stop being
        // repeated as hex literals in every file.
        brand: {
          DEFAULT: "#a3e635",
          hover: "#bef264",
          soft: "#1a2a1a",
        },
        surface: {
          base: "#0a0a0a",
          raised: "#111111",
          card: "#161819",
          sunken: "#0d0d0d",
          chrome: "#0b0b0b",
        },
      },
      spacing: {
        // Notch, home indicator and landscape ear insets.
        safe: "env(safe-area-inset-bottom, 0px)",
        "safe-t": "env(safe-area-inset-top, 0px)",
        "safe-l": "env(safe-area-inset-left, 0px)",
        "safe-r": "env(safe-area-inset-right, 0px)",
      },
      minHeight: {
        // Apple HIG / Material minimum comfortable touch target.
        touch: "44px",
      },
      minWidth: {
        touch: "44px",
      },
      height: {
        // dvh tracks the collapsing mobile browser toolbar; vh does not.
        screend: "100dvh",
      },
      maxHeight: {
        screend: "100dvh",
      },
    },
  },
  plugins: [],
}
