/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#07090E",
        surface: "#0D111A",
        surfaceBorder: "#1E293B",
        neon: {
          green: "#00FF66",
          greenDark: "#00CC52",
          blue: "#00E5FF",
          purple: "#9D4EDD",
          purpleDark: "#7B2CBF",
          pink: "#FF007F",
          amber: "#FFB703",
        },
      },
      boxShadow: {
        "neon-green": "0 0 20px rgba(0, 255, 102, 0.45)",
        "neon-blue": "0 0 20px rgba(0, 229, 255, 0.45)",
        "neon-purple": "0 0 20px rgba(157, 78, 221, 0.45)",
        "glass": "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
        "float": "float 6s ease-in-out infinite",
      },
      keyframes: {
        glow: {
          "0%": { filter: "drop-shadow(0 0 5px rgba(0, 255, 102, 0.4))" },
          "100%": { filter: "drop-shadow(0 0 20px rgba(0, 255, 102, 0.85))" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      backgroundImage: {
        "cyber-grid":
          "linear-gradient(to right, rgba(0, 255, 102, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 255, 102, 0.05) 1px, transparent 1px)",
        "cyber-radial":
          "radial-gradient(circle at 50% 0%, rgba(0, 255, 102, 0.15) 0%, transparent 70%)",
      },
    },
  },
  plugins: [],
};

