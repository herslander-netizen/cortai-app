import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("gaveta da linha da plataforma (ADM)", () => {
  const fonte = readFileSync("src/components/admin/LinhaDaPlataformaCartao.tsx", "utf8");

  it("não depende do QR para ficar aberta: pedir o código por número zera o QR e a gaveta sumia (07/11/2026)", () => {
    expect(fonte).toContain("gaveta && !conectada");
    expect(fonte).not.toMatch(/gaveta && linha\?\.qrCode/);
    expect(fonte).toContain("valor={linha?.qrCode ?? null}");
  });

  it("dá um caminho de volta enquanto conecta pelo número", () => {
    expect(fonte).toContain("Continuar conexão");
  });
});
