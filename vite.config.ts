import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type Plugin } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

/**
 * Identidade de cada publicação. O navegador guarda a do código que está rodando e compara com a do
 * `build-id.json` publicado: se mudou, os arquivos que ele conhece já podem ter sumido do servidor.
 */
const BUILD_ID = process.env["GITHUB_SHA"]?.slice(0, 12) ?? `local-${Date.now().toString(36)}`;
const marcaDoBuild = (): Plugin => ({
  name: "cortai-build-id",
  apply: "build",
  applyToEnvironment: (ambiente) => ambiente.name === "client",
  generateBundle() {
    this.emitFile({
      type: "asset",
      fileName: "build-id.json",
      source: JSON.stringify({ id: BUILD_ID }),
    });
  },
});

export default defineConfig({
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  plugins: [
    marcaDoBuild(),
    tsConfigPaths(),
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tanstackStart({
      // Preserve the existing request-context wrapper during the migration.
      server: { entry: "server" },
    }),
    viteReact(),
    tailwindcss(),
  ],
});
