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

  it("os pontinhos indicam consultas em andamento, inclusive atualizações periódicas", () => {
    expect(operacional.match(/carregando=\{agenda\.isFetching\}/g)?.length).toBe(2);
    expect(operacional).not.toContain("carregando={agenda.isFetching && agenda.isPlaceholderData}");
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

describe("troca de dia em páginas no celular (como no vídeo de referência)", () => {
  const gesto = readFileSync("src/components/barbeiro/agenda/useGestoDia.ts", "utf8");
  const previa = readFileSync("src/components/barbeiro/agenda/PreviaDiaVizinho.tsx", "utf8");
  const operacional = readFileSync("src/components/barbeiro/AgendaOperacional.tsx", "utf8");
  const semana = readFileSync("src/components/barbeiro/agenda/SemanaDoTopo.tsx", "utf8");

  it("a página inteira do dia (grade com as horas) é o que desliza", () => {
    expect(timeline).toContain('{ "data-trilho-dia": "" }');
    expect(timeline).not.toContain("agenda-dia-camada");
    expect(gesto).toContain('".agenda-timeline[data-trilho-dia]"');
    expect(gesto).toContain('querySelectorAll<HTMLElement>("[data-trilho-dia]")');
  });

  it("a distância de um dia é a largura da página mais o vão", () => {
    expect(gesto).toContain("grade?.parentElement?.getBoundingClientRect().width");
    expect(gesto).toContain("carrossel.current?.largura ?? window.innerWidth");
  });

  it("o dia vizinho entra ao lado com as próprias horas e pontinhos", () => {
    expect(operacional).toMatch(/vizinhos=\{\s*celular \? \(\s*<CamadasVizinhas/);
    expect(previa).toContain("<MarcaDoLimiteDoDia");
    expect(css).not.toMatch(/\.agenda-dia-vizinha \.agenda-timeline-marca/);
    expect(css).toContain("left: calc(-100% - 2 * var(--calha-das-horas) - var(--trilho-vao));");
    expect(css).toContain("width: calc(100% + var(--calha-das-horas));");
    expect(css).toMatch(/\.agenda-dia-vizinha \.agenda-timeline-scroll \{\s*padding-block: 0;/);
  });

  it("os pontinhos do topo deslizam com a página", () => {
    expect(semana).toContain('data-trilho-dia={naPagina ? "" : undefined}');
    expect(operacional.match(/<MarcaDoLimiteDoDia[^>]*naPagina/g)?.length).toBe(2);
  });

  it("a faixa da semana tem três semanas e troca deslizando a semana inteira", () => {
    expect(semana).toContain("const tresSemanas = [");
    expect(semana).toContain("translate3d(calc(-100% / 3 + ${dx}px),0,0)");
    expect(semana).not.toContain("translate3d(${lado * 36}%,0,0)");
  });

  it("o calendário do mês cresce por cima da Agenda, sem empurrar a página", () => {
    expect(semana).not.toContain('mode="wait"');
    expect(semana).toContain("animate={{ height: ALTURA_DO_MES + 12 }}");
    expect(semana).not.toContain('height: expandido ? ALTURA_DO_MES : "auto"');
  });

  it("o dia vizinho mostra o fora do expediente durante o gesto", () => {
    expect(css).not.toMatch(
      /\.agenda-dia-vizinha \.agenda-timeline-fora-expediente \{\s*background: transparent/,
    );
  });

  it('o espaço do "Agora · Livre" fica reservado em todo dia (a grade não pula)', () => {
    expect(operacional).toContain('${ehHoje && ativos.length === 0 ? "" : "invisible"}');
  });
});
