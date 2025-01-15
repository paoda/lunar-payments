import { defineConfig } from "vite";
import deno from "@deno/vite-plugin";

export default defineConfig({
  plugins: [deno()],
  server: {
    proxy: {
      "/payment": "http://localhost:8000",
    },
  },
});
