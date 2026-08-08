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
  // Nothing here touches `Astro.session`, and the node adapter would otherwise
  // wire up filesystem-backed session storage on every build. Opting out keeps
  // the session runtime out of the SSR bundle. Flip to `true` if a route ever
  // needs `Astro.session` — it is `undefined` while this is off.
  session: false,
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
