/** @type {import('tailwindcss').Config} */
module.exports = {
  mode: "jit",
  // "media" (not "class"): the content script renders inside a shadow root
  // and the popup/options pages never get a `.dark` ancestor, so class-based
  // dark mode silently never fired. prefers-color-scheme works everywhere.
  darkMode: "media",
  content: [
    "./**/*.tsx",
    "./**/*.ts",
    "!./node_modules/**",
    "!./.plasmo/**",
    "!./build/**"
  ],
  theme: {
    extend: {
      fontSize: {
        // The baseline read a touch small in the 360px panel — nudge the two
        // workhorse sizes up one notch. Absolute px (not the default rem) so
        // sizes don't drift with the host page's root font-size inside the
        // content-script shadow root.
        xs: ["13px", { lineHeight: "18px" }],
        sm: ["15px", { lineHeight: "21px" }]
      },
      colors: {
        persona: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
          950: "#2e1065"
        }
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" }
        }
      },
      animation: {
        "fade-up": "fade-up 0.18s ease-out",
        "fade-in": "fade-in 0.15s ease-out"
      }
    }
  },
  plugins: []
}
