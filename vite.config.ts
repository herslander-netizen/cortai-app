import { execSync } from "node:child_process";

import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type Plugin } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

/**
 * Identidade de cada publicação. O navegador guarda a do código que está rodando e compara com a do
 * `build-id.json` publicado: se mudou, os arquivos que ele conhece já podem ter sumido do servidor.
 *
 * Este arquivo é avaliado mais de uma vez no mesmo build (um ambiente por vez). Por isso a identidade não
 * pode nascer do relógio: fica guardada em `CORTAI_BUILD_ID` na primeira avaliação e todas as outras usam
 * a mesma. Sem isso, o código e o `build-id.json` saíam com identidades diferentes num build local e o app
 * se achava sempre desatualizado (cada toque virava recarga da página).
 */
function identidadeDoBuild(): string {
  const fixa = process.env["CORTAI_BUILD_ID"] ?? process.env["GITHUB_SHA"]?.slice(0, 12);
  if (fixa) return fixa;
  let commit = "sem-git";
  try {
    commit = execSync("git rev-parse --short=12 HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    /* sem git: identidade fixa */
  }
  return `local-${commit}`;
}
const BUILD_ID = (process.env["CORTAI_BUILD_ID"] = identidadeDoBuild());
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
