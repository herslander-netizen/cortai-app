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
});
