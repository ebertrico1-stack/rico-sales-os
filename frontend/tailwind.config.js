/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#F4F5F0",       // ruhiger, leicht salbeiger Neutralton — kein Creme/Terrakotta-Default
        surface: "#FFFFFF",
        border: "#E1E4DC",
        ink: "#1B201C",
        muted: "#6B7169",
        brand: {
          DEFAULT: "#2F5D50",  // tiefes Kiefergrün — "on track"
          dark: "#213F37",
        },
        overdue: "#B3432D",    // Ziegelrot
        today: "#C98A22",      // Amber
        later: "#3E7C6D",      // helles Kiefergrün
        done: "#8A8F86",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
