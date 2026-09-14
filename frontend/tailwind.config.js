/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#0B0F14",
        panel: {
          DEFAULT: "#12181F",
          raised: "#182029",
        },
        subtle: "#232B36",
        focus: "#3E8EED",
        textPrimary: "#E6EDF3",
        textSecondary: "#8B95A1",
        textDisabled: "#4A5461",
        accent: {
          primary: "#3E8EED",
          success: "#22C55E",
          danger: "#EF4444",
          warning: "#F5A623",
        },
        level: {
          0: "#6B7280",
          1: "#F5A623",
          2: "#8B5CF6",
          3: "#3E8EED",
          4: "#10B981",
        },
      },
      fontFamily: {
        heading: ["'Space Grotesk'", "sans-serif"],
        sans: ["'Inter'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      borderRadius: {
        card: "12px",
        btn: "8px",
      },
    },
  },
  plugins: [],
}
