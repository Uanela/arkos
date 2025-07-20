/** @type {import('tailwindcss').Config} */
module.exports = {
  // important: ".tailwind",
  corePlugins: {
    preflight: false, // This prevents Tailwind from resetting your styles
  },
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",

    // Or if using `src` directory:
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./docs/**/*.{js,ts,jsx,tsx,mdx}",
    "./blog/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [
    // other plugins...
  ],
  // safelist: [
  //   "hover:outline-sky-500/50",
  //   "hover:outline-green-500/50",
  //   "hover:outline-yellow-500/50",
  //   "hover:outline-purple-500/50",
  //   "hover:outline-indigo-500/50",
  //   "hover:outline-red-500/50",
  //   "hover:outline-teal-500/50",
  //   "hover:outline-pink-500/50",
  //   "hover:outline-orange-500/50",
  // ],
  // safeList: [
  //   {
  //     pattern: /outline-(sky|green|yellow|purple|indigo|red|pink|orange)-(500)/,
  //     variants: ["hover"],
  //   },
  //   {
  //     pattern: /text-(xs|sm|base|lg|xl|2xl)/,
  //   },
  // ],
};
