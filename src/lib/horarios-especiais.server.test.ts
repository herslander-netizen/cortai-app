import { describe, expect, it } from "vitest";

import { tabelaAusente } from "./horarios-especiais.server";

describe("tabelaAusente", () => {
  it("reconhece a ausência da tabela durante a implantação gradual", () => {
    expect(tabelaAusente({ code: "42P01", message: "relation does not exist" }, "horarios_especiais")).toBe(true);
    expect(tabelaAusente({ code: "PGRST205", message: "table not found in schema cache" }, "horarios_especiais")).toBe(true);
  });

  it("não mascara erros reais de permissão ou conexão", () => {
    expect(tabelaAusente({ code: "42501", message: "permission denied" }, "horarios_especiais")).toBe(false);
    expect(tabelaAusente({ code: "08006", message: "connection failure" }, "horarios_especiais")).toBe(false);
  });
});
