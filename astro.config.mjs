// @ts-check
import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import vue from "@astrojs/vue";
import { version } from "./package.json";

// https://astro.build/config
export default defineConfig({
  site: "https://nordea-se-to-ynab-csv.pages.dev/",
  integrations: [tailwind(), vue()],
  vite: {
    define: {
      'import.meta.env.APP_VERSION': JSON.stringify(version),
    },
  }
});
