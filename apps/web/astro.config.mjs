import node from "@astrojs/node";
// @ts-check
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, envField } from "astro/config";

// https://astro.build/config
export default defineConfig({
  // Used for canonical URLs and any absolute URL computed via `Astro.site`.
  // The apex public domain; override here if you ever fork or rename.
  site: "https://burak.mulayim.app",
  output: "server",
  adapter: node({ mode: "standalone" }),
  env: {
    schema: {
      PUBLIC_SERVER_URL: envField.string({
        access: "public",
        context: "client",
        default: "http://localhost:3000",
      }),
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
