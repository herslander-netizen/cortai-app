import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const cabecalho = readFileSync(
  resolve(process.cwd(), "src/components/barbeiro/agenda/CabecalhoAgenda.tsx"),
  "utf8",
);
const sino = readFileSync(
  resolve(process.cwd(), "src/components/notificacoes/SinoDeAvisos.tsx"),
  "utf8",
);

describe("ícones do cabeçalho da Agenda no mobile", () => {
  it("usa calendário maior sem aumentar o alvo de toque de 56 dp", () => {
    expect(cabecalho).toContain('className={`size-10 transition-[transform,color]');
    expect(cabecalho).toContain('className="h-14 w-14 min-w-14 shrink-0');
    expect(cabecalho).toContain('aria-label={\n          modoBusca');
  });

  it("usa sino maior sem alterar badge, animação nem alvo de toque de 48 dp", () => {
    expect(sino).toContain("<Bell\n            size={30}");
    expect(sino).toContain("h-12 w-12 shrink-0 overflow-visible");
    expect(sino).toContain("aria-label={rotuloDoSino(naoLidas, naoVistos)}");
  });
});
