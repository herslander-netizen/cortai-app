import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const fonte = readFileSync("src/components/barbeiro/agenda/TrocaDeVisualizacao.tsx", "utf8");
const agenda = readFileSync("src/components/barbeiro/AgendaOperacional.tsx", "utf8");

describe("animações da troca Timeline e Lista", () => {
  it("usa apenas a chave do modo e espera a saída antes de montar outra visualização", () => {
    expect(fonte).toContain('<AnimatePresence initial={false} mode="wait">');
    expect(fonte).toContain("key={chave}");
    expect(agenda).toContain('chave={celular && visualizacao === "lista" ? "lista" : "grade"}');
    expect(fonte).not.toContain("layoutId=");
  });

  it("preserva a transição curta de saída e a revelação do conteúdo no padrão Figaroo", () => {
    // A visualização não desaparece antes de entrar o próximo modo.
    expect(fonte).toContain("initial={reduzirMovimento ? false : { opacity: 1, y: 8 }}");
    expect(fonte).toContain("opacity: 1,");
    expect(fonte).not.toContain("opacity: 0.65, y: 8");
    expect(fonte).toContain("y: -8,");
    expect(fonte).toContain("duration: TEMPO.botaoSai");
    expect(fonte).toContain("duration: TEMPO.conteudoEntra");
    expect(fonte).toContain("ease: CURVA.linearParaLenta");
  });

  it("prepara os cartões sem esperar e mostra skeleton se o período ainda não chegou", () => {
    const lista = readFileSync("src/components/barbeiro/agenda/ListaPeriodo.tsx", "utf8");
    expect(lista).toContain("motion-safe:animate-pulse");
    expect(lista).toContain("Carregando a lista");
    expect(agenda).toContain("void queryClient.prefetchInfiniteQuery(opcoesAgendaPeriodo(hojeDaLista))");
    expect(agenda).not.toContain("      1500,");
  });

  it("anima a faixa semanal junto com a troca, sem mexer na altura nem no calendário mensal", () => {
    expect(fonte).toContain('key="semana"');
    expect(fonte).toContain("initial={reduzirMovimento ? false : { opacity: 0, y: -8 }}");
    expect(fonte).not.toContain("height:");
    expect(fonte).not.toContain("gridTemplateRows");
    expect(agenda).toContain("<SemanaDoTopo");
  });

  it("respeita movimento reduzido nas duas superfícies", () => {
    expect(fonte.match(/useReducedMotion\(\)/g)).toHaveLength(2);
    expect(fonte.match(/reduzirMovimento\s*\?\s*\{ duration: 0 \}/g)).toHaveLength(2);
    expect(fonte).toContain("reduzirMovimento ? false");
  });
});
