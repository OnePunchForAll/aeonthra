import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  base: "./",
  plugins: [react()],
  server: {
    port: 5176,
    strictPort: true,
    fs: {
      allow: [
        resolve(__dirname, "../../"),     // worktree root: awesome-gould/
        resolve(__dirname, "../../../../") // main repo root: Canvas Converter/ (packages symlink target)
      ]
    },
    watch: {
      usePolling: true,
      interval: 300
    }
  },
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      "@learning/schema": resolve(__dirname, "../../packages/schema/src/index.ts"),
      "@learning/content-engine": resolve(__dirname, "../../packages/content-engine/src/index.ts"),
      "@learning/interactions-engine": resolve(__dirname, "../../packages/interactions-engine/src/index.ts")
    }
  },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("react") || id.includes("scheduler")) {
            return "react-core";
          }
          if (id.includes("framer-motion")) {
            return "motion";
          }
          if (id.includes("pdfjs-dist")) {
            return "pdf";
          }
          if (id.includes("packages/content-engine")) {
            return "content-engine";
          }
          if (id.includes("packages/interactions-engine")) {
            return "interactions-engine";
          }
          return undefined;
        }
      }
    }
  }
});
