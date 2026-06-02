import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#07111f",
          900: "#0b1728",
          800: "#10233c",
          700: "#17365c"
        },
        gold: {
          500: "#d6ad55",
          400: "#e3c675",
          300: "#f3dc9b"
        },
        ink: "#dce6f5"
      },
      boxShadow: {
        gold: "0 0 0 1px rgba(214, 173, 85, .26), 0 24px 80px rgba(0, 0, 0, .28)"
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
