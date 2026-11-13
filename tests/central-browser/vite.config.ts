import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const fixture = (arquivo: string) => path.join(aqui, arquivo);

/**
 * Monta o componente de produção SEM alterá-lo, substituindo APENAS o
 * backend servidor por dados inteiramente fictícios e sem credenciais.
 */
export default defineConfig({
  root: "tests/central-browser",
  plugins: [
    {
      name: "flow-central-backend-falso",
      enforce: "pre",
      resolveId(source) {
        if (source === "@/lib/central-atendimento.functions") return fixture("mock-backend.ts");
        if (source === "@tanstack/react-start") return fixture("mock-server-fn.ts");
        return null;
      },
    },
    tsconfigPaths(),
    react(),
    tailwindcss(),
  ],
  server: { host: "127.0.0.1", port: 4178, strictPort: true },
});
