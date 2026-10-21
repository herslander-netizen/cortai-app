import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { paginaPublicaDisponivel } from "./pagina-publica-status";

describe("estado da página pública", () => {
  it("mantém páginas legadas no ar quando o estado não existe", () => {
    expect(paginaPublicaDisponivel(undefined)).toBe(true);
    expect(paginaPublicaDisponivel(null)).toBe(true);
    expect(paginaPublicaDisponivel(true)).toBe(true);
  });

  it("retorna falso quando a página está fora do ar", () => {
    expect(paginaPublicaDisponivel(false)).toBe(false);
  });

  it("consulta o estado persistido antes de servir a vitrine", () => {
    const fonte = readFileSync("src/lib/publico.functions.ts", "utf8");
    expect(fonte).toContain('.select("published_config, is_online")');
    expect(fonte).toContain("if (!paginaPublicaDisponivel(pageConfig?.is_online)) return null;");
    const metadata = readFileSync("src/lib/agendamento-publico.functions.ts", "utf8");
    expect(metadata).toContain('.select("published_config, is_online")');
    expect(metadata).toContain("const paginaOnline = paginaPublicaDisponivel(cfg?.is_online);");
    expect(metadata).toContain("paginaOnline,");
    expect(metadata).not.toContain("if (!paginaPublicaDisponivel(cfg?.is_online)) return null;");
    const rotaVitrine = readFileSync("src/routes/b.$slug.tsx", "utf8");
    expect(rotaVitrine).toContain("!loaderData.paginaOnline");
    const rotaCurta = readFileSync("src/routes/$slug.tsx", "utf8");
    expect(rotaCurta).toContain("previa?.experiencia ?? \"vitrine\"");
  });
});
