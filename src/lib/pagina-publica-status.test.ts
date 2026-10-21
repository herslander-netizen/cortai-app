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
});
