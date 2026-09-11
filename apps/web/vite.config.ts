/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const __dirname = import.meta.dirname;

/**
 * Drops HTML comments from the production `index.html`.
 *
 * The source file documents the ffmpeg recipe behind the Open Graph image, the
 * crop bounds it depends on and the absolute-URL caveat for deployment. That is
 * written for whoever maintains the file — it has no business in the bytes an
 * invité downloads over a weak mobile connection. Left in, it took index.html
 * from 0,7 ko to 4,7 ko. Development keeps the comments.
 */
function stripHtmlComments(): Plugin {
  return {
    name: "strip-html-comments",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler: (html) => html.replace(/<!--[\s\S]*?-->/g, "").replace(/\n\s*\n+/g, "\n"),
    },
  };
}

export default defineConfig(({ command, mode }) => {
  // `command === "build"` is the production build only — never the dev server
  // (`vite`/`vite dev`) nor Vitest (which drives this same config file but
  // never asks for the "build" command). Dev keeps its legitimate fallback to
  // http://localhost:3000 in src/lib/api.ts; a production build must not.
  //
  // Without this, a deploy that forgets to set VITE_API_URL on the hosting
  // provider (Vercel) produces a front end that silently talks to
  // localhost:3000 — which does not exist once the build is served from a
  // browser that isn't the developer's own machine. Failing here, loudly and
  // at build time, is cheaper than an invité opening a broken invitation.
  if (command === "build") {
    const env = loadEnv(mode, process.cwd(), "VITE_");
    if (!env.VITE_API_URL) {
      throw new Error(
        "VITE_API_URL manque. Le build de production a besoin de l'URL de " +
          "l'API déployée pour la graver dans le bundle — voir apps/web/.env.example. " +
          "En local, copie-le en apps/web/.env ; en production (Vercel), pose-la " +
          "dans les variables d'environnement du projet.",
      );
    }
  }

  return {
    plugins: [react(), tailwindcss(), stripHtmlComments()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: "./src/setupTests.ts",
    },
  };
});
