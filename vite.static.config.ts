import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "static",
  base: "./",
  plugins: [react()],
  build: { outDir: "../dist-static", emptyOutDir: true },
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
});
