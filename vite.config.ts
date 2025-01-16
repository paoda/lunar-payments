import { defineConfig } from "vite";
import deno from "@deno/vite-plugin";

const BASE_URL = Deno.env.get("BASE_URL");
if (!BASE_URL) throw new Error("$BASE_URL must be set");

export default defineConfig({
  base: BASE_URL,
  plugins: [deno()],
});
