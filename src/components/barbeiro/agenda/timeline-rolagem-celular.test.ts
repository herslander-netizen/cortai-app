import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/styles.css", "utf8");
const timeline = readFileSync("src/components/barbeiro/AgendaTimeline.tsx", "utf8");

function blocosCelular() {
  const blocos: string[] = [];
  const re = /@media \(max-width: 600px\) \{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) {
    let nivel = 1;
    let i = m.index + m[0].length;
    for (; i < css.length && nivel > 0; i += 1)
      nivel += css[i] === "{" ? 1 : css[i] === "}" ? -1 : 0;
    blocos.push(css.slice(m.index, i));
  }
  return blocos;
}

describe("rolagem da Timeline no celular", () => {
  it("a Timeline não é contêiner de rolagem no celular", () => {
    const regra = blocosCelular()
      .map((b) => b.match(/\.agenda-timeline-scroll \{([^}]*)\}/)?.[1])
      .find(Boolean);
    expect(regra).toContain("overflow: visible;");
    expect(regra).toContain("overflow-x: clip;");
    expect(regra).toContain("overscroll-behavior: auto;");
  });

  it("indicador do vazio só aparece quando o toque longo é confirmado", () => {
    const pointerDown = timeline.slice(
      timeline.indexOf("onPointerDown: (e: React.PointerEvent<HTMLDivElement>)"),
    );
    expect(pointerDown.slice(0, pointerDown.indexOf("onPointerMove"))).not.toContain(
      "setToqueVazio",
    );
    const confirmar = timeline.slice(
      timeline.indexOf("aoConfirmar"),
      timeline.indexOf("aoCancelar"),
    );
    expect(confirmar).toContain("setToqueVazio(minuto)");
  });

  it("mantém a timeline completa sem controle ou recorte de horários anteriores", () => {
    expect(timeline).not.toContain("Mostrar horários anteriores");
    expect(timeline).not.toContain("mostrarAnteriores");
    expect(timeline).not.toContain("corteAnteriores");
    expect(timeline).not.toContain('clipPath: "inset(0 -100vw -100vh -100vw)"');
  });

  it("mantém horários passados visíveis, apenas com tratamento visual discreto", () => {
    expect(timeline).toContain('"agenda-timeline-passado"');
    expect(css).toContain(".agenda-timeline-passado:not(.agenda-timeline-na_cadeira)");
  });
});

describe("troca de dia sem piscar nem puxar a página", () => {
  const operacional = readFileSync("src/components/barbeiro/AgendaOperacional.tsx", "utf8");

  it("a Agenda não é desmontada a cada dia", () => {
    expect(operacional).not.toContain("key={dia}");
  });

  it("nenhuma animação de troca de dia começa invisível", () => {
    expect(css).not.toMatch(/@keyframes agenda-troca/);
    expect(operacional).not.toMatch(/opacity:\s*0[,\s}]/);
  });

  it("cartões do dia anterior nunca aparecem debaixo da data nova", () => {
    expect(operacional).toContain("agenda.isPlaceholderData ? [] :");
  });

  it("os pontinhos só animam quando o dia ainda não chegou", () => {
    expect(operacional).not.toContain("carregando={agenda.isFetching}");
  });

  it("a timeline só se posiciona sozinha na primeira abertura", () => {
    expect(timeline).not.toContain("posicionouRef.current === dia");
    expect(timeline.match(/posicionouRef\.current !== null/g)?.length).toBe(3);
  });
});

describe("prévia do dia vizinho não fica presa na tela", () => {
  const gesto = readFileSync("src/components/barbeiro/agenda/useGestoDia.ts", "utf8");

  it("fora do gesto a prévia fica escondida", () => {
    expect(css).toMatch(
      /html:not\(\.agenda-gesto-ativo\) \.agenda-previa-vizinho \{\s*visibility: hidden;/,
    );
  });

  it("ao terminar o gesto as duas prévias voltam para fora da tela", () => {
    const limpar = gesto.slice(gesto.indexOf("const limpar"), gesto.indexOf("const assentar"));
    expect(limpar).toContain("previaAnterior.current.style.transform");
    expect(limpar).toContain("previaProxima.current.style.transform");
  });
});

describe("bolinha da semana ao terminar o gesto", () => {
  const gesto = readFileSync("src/components/barbeiro/agenda/useGestoDia.ts", "utf8");

  it("o deslocamento do dedo sai antes da troca do dia (sem voltar animando)", () => {
    const fim = gesto.slice(gesto.indexOf("assentar(s.dx, alvo"));
    const tira = fim.indexOf('removeProperty("--dia-progresso")');
    const troca = fim.indexOf("flushSync(");
    expect(tira).toBeGreaterThan(-1);
    expect(tira).toBeLessThan(troca);
  });
});

describe("troca de dia em carrossel no celular", () => {
  const gesto = readFileSync("src/components/barbeiro/agenda/useGestoDia.ts", "utf8");
  const previa = readFileSync("src/components/barbeiro/agenda/PreviaDiaVizinho.tsx", "utf8");
  const operacional = readFileSync("src/components/barbeiro/AgendaOperacional.tsx", "utf8");

  it("só os cartões e o expediente deslizam; horas e linhas ficam paradas", () => {
    expect(timeline).toContain('{ "data-trilho-dia": "" }');
    expect(timeline.match(/className="agenda-dia-camada"/g)?.length).toBe(2);
    expect(css).toMatch(/\.agenda-dia-janela \{[^}]*overflow-x: clip;/);
  });

  it("os dias vizinhos entram dentro da mesma grade", () => {
    expect(operacional).toMatch(/vizinhos=\{\s*celular \? \(?\s*<CamadasVizinhas/);
    expect(previa).toContain("export function CamadasVizinhas");
    expect(css).toContain('.agenda-dia-vizinha[data-lado="anterior"]');
    expect(css).toContain('.agenda-dia-vizinha[data-lado="proximo"]');
  });

  it("o gesto move os trilhos pela largura da grade", () => {
    expect(gesto).toContain('querySelectorAll<HTMLElement>("[data-trilho-dia]")');
    expect(gesto).toContain("carrossel.current?.largura ?? window.innerWidth");
  });
});
