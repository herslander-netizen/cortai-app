import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("entrada pública do Flow", () => {
  it("mantém o palco no Navy por tokens locais, sem depender do tema do sistema", () => {
    const tela = readFileSync("src/components/entrada/FlowWelcome.tsx", "utf8");
    expect(tela).toContain(
      'className="relative mx-auto flex h-full min-h-0 w-full max-w-[430px] flex-col overflow-hidden bg-ink',
    );
    expect(tela).toContain("<OndasDaEntrada />");
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

  it("segue a referência do dono de 06/11: celular com mini-histórias, assinatura e Começar agora", () => {
    const tela = readFileSync("src/components/entrada/FlowWelcome.tsx", "utf8");
    expect(tela).toContain("CAPITULOS");
    expect(tela).toContain("capitulo.historia()");
    expect(tela).toContain("Começar agora");
    expect(tela).toContain("Seu negócio no ritmo certo.");
    expect(tela).toContain("<Celular>");
  });

  it("identifica os mockups como exemplos e não como estado real da conta", () => {
    const frame = readFileSync("src/components/entrada/DemoFrame.tsx", "utf8");
    const operacionais = readFileSync(
      "src/components/entrada/DemosOperacionaisDaEntrada.tsx",
      "utf8",
    );
    expect(frame).toContain("Exemplo visual");
    expect(operacionais).toContain("export function DemoFila()");
    expect(operacionais).toContain("Dados ilustrativos");
    expect(frame).not.toContain(">Ativo<");
  });

  it("divide a apresentação em componentes com até 300 linhas", () => {
    const arquivos = [
      "src/components/entrada/FlowWelcome.tsx",
      "src/components/entrada/DemoFrame.tsx",
      "src/components/entrada/DemosDaEntrada.tsx",
      "src/components/entrada/DemosPublicasDaEntrada.tsx",
      "src/components/entrada/DemosOperacionaisDaEntrada.tsx",
    ];
    for (const arquivo of arquivos) {
      expect(readFileSync(arquivo, "utf8").split("\n").length, arquivo).toBeLessThanOrEqual(300);
    }
  });
});
