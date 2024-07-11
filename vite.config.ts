import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [preact()],
  css: {
    devSourcemap: true
  },
  build: {
    sourcemap: true,
    target: "esnext"
  }
});
