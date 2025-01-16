import { defineConfig, loadEnv, UserConfig } from "vite";
import deno from "@deno/vite-plugin";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, Deno.cwd());
  if (env.VITE_BASE_URL == null) throw new Error("$VITE_BASE_URL must be set");

  return {
    base: env.VITE_BASE_URL,
    // deno-lint-ignore no-explicit-any
    plugins: [deno() as any],
    server: {
      proxy: {
        "/payment/confirm": {
          target: "http://localhost:8000",
          changeOrigin: true,
        },
      },
    },
  } satisfies UserConfig;
});
