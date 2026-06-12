import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#0A1833",
          900: "#102142",
          800: "#172B52",
          700: "#203B69"
        },
        gold: {
          500: "#D4AF37",
          400: "#E0C15C",
          300: "#F1D98A"
        },
        charcoal: "#2F3542",
        cream: "#F7F3EB",
        ink: "#F7F3EB"
      },
      boxShadow: {
        gold: "0 0 0 1px rgba(212, 175, 55, .26), 0 24px 80px rgba(0, 0, 0, .28)"
      },
      fontFamily: {
        sans: ["Arial", "Helvetica", "sans-serif"],
        serif: ["Georgia", "Times New Roman", "serif"]
      }
    }
  },
  plugins: []
};

export default config;
