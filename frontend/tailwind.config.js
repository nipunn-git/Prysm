/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0d1117",
        foreground: "#c9d1d9",
        border: "#30363d",
        card: "#161b22",
        primary: "#238636", // GitHub green
        "primary-hover": "#2ea043",
        muted: "#8b949e",
        danger: "#da3633",
        accent: "#1f6feb", // GitHub blue
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
