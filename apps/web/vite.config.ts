/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from "vite";
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

export default defineConfig({
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
});
