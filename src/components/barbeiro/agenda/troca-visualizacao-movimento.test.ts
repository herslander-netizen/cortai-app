import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const fonte = readFileSync("src/components/barbeiro/agenda/TrocaDeVisualizacao.tsx", "utf8");
const movimento = readFileSync("src/components/barbeiro/agenda/TrocaDeVisualizacao.css", "utf8");
const agenda = readFileSync("src/components/barbeiro/AgendaOperacional.tsx", "utf8");

describe("paridade da transição Timeline ↔ Cartões com o Flow oficial v3.7", () => {
  it("monta a nova visão durante a saída da anterior, sem intervalo vazio", () => {
    expect(fonte).toContain('<AnimatePresence initial={false} mode="popLayout">');
    expect(fonte).toContain("key={chave}");
    expect(fonte).not.toContain('mode="wait"');
    expect(agenda).toContain('chave={celular && visualizacao === "lista" ? "lista" : "grade"}');
  });

  it("usa deslocamento, opacidade, curva e duração do Flow oficial", () => {
    expect(fonte).toContain("const SUAVE = [0.22, 1, 0.36, 1] as const");
    expect(fonte).toContain('mode="popLayout"');
    expect(movimento).toContain("translate3d(0, 28px, 0)");
    expect(movimento).toContain("translate3d(0, -20px, 0)");
    expect(movimento).toContain("opacity: 0;");
    expect(movimento).toContain("opacity: 1;");
    expect(movimento).toContain("280ms cubic-bezier(0.22, 1, 0.36, 1)");
    expect(fonte).toContain("duration: 0.28, ease: SUAVE");
    expect(fonte).not.toContain("onExitComplete");
  });

  it("entra em Cartões sem callback tardio e preserva a posição anterior da Timeline", () => {
    const inicio = agenda.indexOf("function alterarVisualizacao");
    const fim = agenda.indexOf("function alternarModoDiscreto", inicio);
    const alterar = agenda.slice(inicio, fim);
    expect(alterar).toContain('if (celular && segura === "lista" && visualizacao === "timeline") {');
    expect(alterar).toContain("rolagemAntesDaLista.current = { dia, top: window.scrollY };");
    expect(alterar).toContain('window.scrollTo({ top: 0, behavior: "auto" });');
    expect(agenda).not.toContain("rolarParaListaAposSaida");
    expect(agenda).not.toContain("aoConcluirSaida");
  });

  it("continua preparando dados dos cartões sem pausa artificial", () => {
    const lista = readFileSync("src/components/barbeiro/agenda/ListaPeriodo.tsx", "utf8");
    expect(lista).toContain("motion-safe:animate-pulse");
    expect(lista).toContain("Carregando a lista");
    expect(agenda).toContain("void queryClient.prefetchInfiniteQuery(opcoesAgendaPeriodo(hojeDaLista))");
  });

  it("anima a altura da semana, sem alterar o calendário do mês", () => {
    const recolhe = fonte.slice(fonte.indexOf("export function RecolheNaLista"));
    expect(recolhe).toContain('key="semana"');
    expect(recolhe).toContain('height: "auto"');
    expect(recolhe).toContain('height: 0, opacity: 0, overflow: "hidden"');
    expect(agenda).toContain("<SemanaDoTopo");
  });

  it("a faixa semanal não possui duas animações de altura concorrentes", () => {
    const inicio = agenda.indexOf('<NaBarraDoTopo alvoId="topo-baixo">');
    const fim = agenda.indexOf("</NaBarraDoTopo>", inicio);
    const topo = agenda.slice(inicio, fim);
    expect(inicio).toBeGreaterThan(-1);
    expect(topo).toContain('<RecolheNaLista visivel={visualizacao !== "lista"}>');
    expect(topo).not.toContain("<motion.div");
    expect(topo).not.toContain('height: "auto"');
    const recolhe = fonte.slice(fonte.indexOf("export function RecolheNaLista"));
    expect(recolhe).toContain('height: "auto"');
  });

  it("restaura a rolagem anterior da Timeline antes do próximo paint", () => {
    const fonteTimeline = readFileSync("src/components/barbeiro/AgendaTimeline.tsx", "utf8");
    expect(agenda).toContain("rolagemAntesDaLista.current = { dia, top: window.scrollY };");
    expect(agenda).toContain("rolagemAoRetornar={");
    expect(fonteTimeline).toContain("posicionouRef.current = dia;");
    expect(fonteTimeline).toContain("useLayoutEffect(() => {");
    expect(fonteTimeline).toContain('window.scrollTo({ top: Math.max(0, rolagemAoRetornar), behavior: "auto" });');
  });

  it("respeita movimento reduzido nas duas superfícies e isola o painel de saída", () => {
    expect(fonte.match(/useReducedMotion\(\)/g)).toHaveLength(2);
    expect(movimento).toContain("prefers-reduced-motion: reduce");
    expect(movimento).toContain("animation: none !important;");
    expect(fonte).toContain("aria-hidden={!presente}");
    expect(fonte).toContain("inert={!presente}");
    const recolhe = fonte.slice(fonte.indexOf("export function RecolheNaLista"));
    expect(recolhe).toContain("initial={reduzirMovimento ? false");
    expect(recolhe).toContain("transition={reduzirMovimento ? { duration: 0 }");
  });
});
