import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("visual compartilhado do Modo Foco", () => {
  it("é usado pelo produto e pela apresentação", () => {
    const real = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/barbeiro/AgendaFocoMobile.tsx"),
      "utf8",
    );
    const demo = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/apresentacao/ShowroomCortai.tsx"),
      "utf8",
    );
    expect(real).toContain("<CockpitFoco");
    expect(demo).toContain("<CockpitFoco");
    expect(demo).not.toContain("showroom-foco-estado");
    expect(demo).not.toContain("Finalizar atendimento");
  });

  it("mantém o Foco em hoje e não oferece setas de dia", () => {
    const operacao = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/barbeiro/AgendaOperacional.tsx"),
      "utf8",
    );
    const foco = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/barbeiro/AgendaFocoMobile.tsx"),
      "utf8",
    );
    expect(operacao).toContain("if (dia !== hoje) setDia(hoje)");
    expect(foco).not.toContain("ChevronLeft");
    expect(foco).not.toContain("ChevronRight");
  });
});
