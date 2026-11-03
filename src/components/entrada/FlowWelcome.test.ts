import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("entrada pública do Flow", () => {
  it("mantém o palco no Navy por tokens locais, sem depender do tema do sistema", () => {
    const tela = readFileSync("src/components/entrada/FlowWelcome.tsx", "utf8");
    expect(tela).toContain('className="relative mx-auto flex h-full min-h-0 w-full max-w-[430px] flex-col overflow-hidden bg-ink');
    expect(tela).toContain('<OndasDaEntrada />');
    expect(tela).toContain('variante="clara"');
    expect(tela).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(tela).not.toContain("bg-white");
    expect(tela).not.toContain("<button");
  });

  it("usa os primitivos de botão e mantém as três jornadas reais de entrada", () => {
    const tela = readFileSync("src/components/entrada/FlowWelcome.tsx", "utf8");
    expect(tela).toContain('import { Button } from "@/components/ui/button"');
    expect(tela).toContain("onCreateAccount");
    expect(tela).toContain("onSignIn");
    expect(tela).toContain("onCustomerBooking");
    expect(tela).toContain('variant="primary"');
    expect(tela).toContain('variant="link"');
  });

  it("identifica os mockups como exemplos e não como estado real da conta", () => {
    const demos = readFileSync("src/components/entrada/DemosDaEntrada.tsx", "utf8");
    expect(demos).toContain("Exemplo visual");
    expect(demos).toContain("export function DemoFila()");
    expect(demos).toContain("Dados ilustrativos");
    expect(demos).not.toContain('>Ativo<');
  });
});
