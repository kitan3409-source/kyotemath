import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const distStatic = resolve(fileURLToPath(new URL(".", import.meta.url)), "dist-static");
function listFiles(directory: string, prefix = "."): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relative = `${prefix}/${entry.name}`;
    return entry.isDirectory() ? listFiles(resolve(directory, entry.name), relative) : [relative];
  });
}

const staticPwaPlugin = {
  name: "static-pwa-assets",
  closeBundle() {
    const cacheFiles = listFiles(distStatic).filter((file) => file !== "./sw.js").sort();
    const serviceWorkerPath = resolve(distStatic, "sw.js");
    const serviceWorker = readFileSync(serviceWorkerPath, "utf8");
    const html = readFileSync(resolve(distStatic, "index.html"), "utf8");
    const hash = createHash("sha256").update(serviceWorker).update(html);
    for (const file of cacheFiles) hash.update(file).update(readFileSync(resolve(distStatic, file.slice(2))));
    const cacheVersion = hash.digest("hex").slice(0, 12);
    const encodedAssets = JSON.stringify(JSON.stringify(cacheFiles));
    writeFileSync(serviceWorkerPath, serviceWorker.replace('"__STATIC_ASSETS__"', encodedAssets).replace("__CACHE_VERSION__", cacheVersion));
  },
};

export default defineConfig({
  root: "static",
  base: "./",
  publicDir: fileURLToPath(new URL("./public", import.meta.url)),
  plugins: [react(), staticPwaPlugin],
  build: { outDir: "../dist-static", emptyOutDir: true },
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
});
