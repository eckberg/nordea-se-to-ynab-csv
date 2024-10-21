import defaultTheme from "tailwindcss/defaultTheme";
import colors from "tailwindcss/colors";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    container: {
      center: true,
      padding: defaultTheme.spacing[5],
      screens: {
        sm: defaultTheme.screens.sm,
        md: defaultTheme.screens.md,
        lg: defaultTheme.screens.md,
        xl: defaultTheme.screens.md,
        "2xl": defaultTheme.screens.md,
      },
    },
    extend: {
      colors: {
        accent: colors.emerald,
        gray: colors.zinc,
        nordea: "#00005e",
      },
    },
    fontFamily: {
      sans: ["Inter Variable", "ui-sans-serif", "system-ui"],
    },
  },
  plugins: [],
};
