import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tsConfigPaths(),
    tanstackStart({
      // Keep the existing SSR error wrapper as the custom server entry.
      server: { entry: "server" },
    }),
    // Preserve the Cloudflare deployment target formerly supplied by Lovable.
    nitro({ preset: "cloudflare-module" }),
    viteReact(),
    tailwindcss(),
  ],
});
