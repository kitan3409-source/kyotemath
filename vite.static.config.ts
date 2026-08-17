import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  root: "static",
  base: "./",
  plugins: [react()],
  build: { outDir: "../dist-static", emptyOutDir: true },
  resolve: { alias: { "@": "/workspace/sites/kyote-math-60" } },
});
