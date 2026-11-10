import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const agenda = readFileSync("src/components/barbeiro/AgendaOperacional.tsx", "utf8");

describe("troca de visualização da Agenda no celular", () => {
  it("anima apenas a área de conteúdo, sem remontar os controles flutuantes", () => {
    expect(agenda).toContain('<AnimatePresence initial={false} mode="wait">');
    expect(agenda).toContain('key={celular ? visualizacao : "desktop"}');
    expect(agenda).toContain('id="agenda-painel-visualizacao"');
    expect(agenda.indexOf("</AnimatePresence>")).toBeLessThan(
      agenda.lastIndexOf("<BotaoAgoraPrincipal"),
    );
  });

  it("recolhe a faixa semanal na Lista sem impedir a abertura manual do calendário", () => {
    expect(agenda).toContain('visualizacao === "timeline" || calAberto');
    expect(agenda).toContain('if (segura === "lista") setCalAberto(false);');
    expect(agenda).toContain('animate={{ height: "auto", opacity: 1 }}');
    expect(agenda).toContain('exit={{ height: 0, opacity: 0 }}');
  });

  it("desativa a transição quando há preferência por movimento reduzido", () => {
    expect(agenda).toContain("const menosMovimento = useMenosMovimento();");
    expect(agenda).toContain("duration: menosMovimento ? 0 : DURACAO.base");
    expect(agenda).toContain("duration: celular && !menosMovimento ? DURACAO.base : 0");
    expect(agenda).toContain("initial={celular && !menosMovimento ? { opacity: 0, y: 10 } : false}");
  });
});
