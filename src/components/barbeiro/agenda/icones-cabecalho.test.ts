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
  it("calendário e sino com 20 dp desenhados, como na captura do Figaro, em alvos de 48 dp", () => {
    expect(cabecalho).toContain('className={`!size-7 transition-colors');
    expect(cabecalho).toContain('className="h-12 w-12 min-w-12 shrink-0');
    expect(sino).toContain("sino-de-avisos relative h-12 w-12");
    expect(cabecalho).toContain('aria-label={\n          modoBusca');
  });

  it("usa sino maior sem alterar badge, animação nem alvo de toque de 48 dp", () => {
    expect(sino).toContain("<Bell\n            size={30}");
    expect(sino).toContain("h-12 w-12 shrink-0 overflow-visible");
    expect(sino).toContain("aria-label={rotuloDoSino(naoLidas, naoVistos)}");
  });
});
