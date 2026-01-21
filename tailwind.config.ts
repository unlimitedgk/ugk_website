import type { Config } from "tailwindcss"

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          500: "#D4AF37",
          600: "#C9A227",
        },
        red: {
          500: "#ED2939",
          600: "#C9A227",
        },
      },
    },
  },
  plugins: [],
} satisfies Config