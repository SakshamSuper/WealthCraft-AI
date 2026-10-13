import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        groww: {
          bg: "#0D0F12",
          card: "#181B20",
          "card-hover": "#20242B",
          border: "rgba(255, 255, 255, 0.06)",
          green: "#00D09C",
          "green-dark": "#00B386",
          red: "#EB5757",
          "text-muted": "#8F92A1",
          "text-subtle": "#5F6270",
        },
        obsidian: {
          DEFAULT: "#0D0F12",
          light: "#181B20",
          card: "#181B20",
          border: "rgba(255, 255, 255, 0.06)",
        },
        emerald: {
          500: "#00D09C",
          600: "#00B386",
        },
        primary: {
          DEFAULT: "#181B20",
          light: "#20242B",
          dark: "#0D0F12",
        },
        card: {
          DEFAULT: "#181B20",
          border: "rgba(255, 255, 255, 0.06)",
        }
      },
      backgroundImage: {
        "groww-card": "linear-gradient(180deg, #181B20 0%, #15181D 100%)",
      },
      borderRadius: {
        "groww": "12px",
      },
      backdropBlur: {
        xs: "2px",
        xl: "20px",
      },
      boxShadow: {
        "groww": "0 4px 20px rgba(0, 0, 0, 0.25)",
        "groww-hover": "0 8px 30px rgba(0, 0, 0, 0.4)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out forwards",
        "slide-up": "slideUp 0.3s ease-out forwards",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        }
      }
    },
  },
  plugins: [],
};

export default config;
