import { cpSync, statSync } from "node:fs";
import { extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const root = fileURLToPath(new URL(".", import.meta.url));
const media = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif", ".svg", ".mp3", ".ogg", ".wav", ".m4a", ".woff", ".woff2", ".ttf", ".otf"]);

// Separate from the existing vinext/Cloudflare preview and its Worker output.
export default defineConfig(({command}) => ({
  root,
  base: "/",
  plugins: [react(), {
    name: "copy-public-media-only",
    apply: "build",
    closeBundle() {
      cpSync(resolve(root, "public"), resolve(root, "dist-public"), {
        recursive: true,
        filter(source) {
          const relative = source.slice(resolve(root, "public").length);
          return relative === "" || relative === "/favicon.svg"
            || (relative.startsWith("/assets") && (statSync(source).isDirectory() || media.has(extname(source).toLowerCase())));
        },
      });
    },
  }],
  publicDir: command === "serve" ? "public" : false,
  build: {
    outDir: "dist-public",
    assetsDir: "_static",
    sourcemap: false,
  },
  server: { host: "127.0.0.1" },
  preview: { host: "127.0.0.1" },
}));
