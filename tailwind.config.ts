import { type Config } from "tailwindcss";
import daisyui from "daisyui";

export default {
  content: ["./index.html", "./src/**/*.{ts, tsx}"],
  plugins: [daisyui as any],
  daisyui: {
    themes: ["light"],
  },
} satisfies Config;
