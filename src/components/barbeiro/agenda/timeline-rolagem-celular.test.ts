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

  it("como no Figaro: só a hora cheia é linha fixa; as de 5 min surgem com o zoom (dono, 26/10)", () => {
    expect(timeline).toContain("minuto += 60");
    expect(timeline).not.toContain("minuto += 15");
    expect(timeline).not.toContain("data-sub-oculta");
    expect(css).toContain("color: var(--figaro-on-surface-variant, var(--mute2));");
    expect(css).toMatch(
      /\.agenda-operacional \.agenda-timeline-ajuste-5 \{[^}]*height: 0\.67px;[^}]*0 4px,[^}]*transparent 4px 6px/,
    );
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
    // O vizinho é memorizado (vizinhosMemo) e passado à linha do tempo.
    expect(operacional).toMatch(/vizinhos=\{vizinhosMemo\}/);
    expect(operacional).toMatch(/vizinhosMemo = useMemo\([\s\S]*?celular \? \([\s\S]*?<CamadasVizinhas/);
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

  it("o calendário desce primeiro e a timeline vem atrás: duas molas do Figaro em série (1,0 / 400)", () => {
    expect(semana).not.toContain('mode="wait"');
    // `expandSizeSpringDp` do APK: amortecimento 1 (damping 40 com massa 1) e rigidez 400.
    expect(semana).toMatch(/const MOLA_DO_FIGARO = \{\s*stiffness: 400,\s*damping: 40,\s*mass: 1,/);
    // Mola 1 leva o painel ao alvo; mola 2 persegue a altura já animada do painel (o espaço da Agenda).
    expect(semana).toContain("const alturaDoPainel = useSpring(alvoDoPainel, MOLA_DO_FIGARO)");
    expect(semana).toContain("const espacoDaAgenda = useSpring(alturaDoPainel, MOLA_DO_FIGARO)");
    // Desempenho: a Agenda desce por transform (sem refazer o layout a cada quadro) e os meses são memoizados e
    // montados em fases depois que as molas assentam.
    expect(semana).toContain("palco.style.transform = `translate3d(0,${dy}px,0)`");
    expect(semana).not.toContain("{ height: espacoDaAgenda }");
    expect(semana).toContain("const MesDoCalendario = memo(");
    expect(semana).toContain("const FASES_DOS_MESES = [3, 6, 9, MESES_EM_VOLTA]");
    expect(semana).toContain("height: alturaDoPainelMais12");
    expect(semana).toContain("data-calendario-aberto={expandido || painelVisivel || undefined}");
    // Uma sombra só durante todo o movimento (a do painel); a do cabeçalho idêntica volta quando o painel sai.
    expect(css).toMatch(
      /html:has\(\[data-calendario-aberto\]\) \.management-header \{\s*box-shadow: none !important/,
    );
    expect(css).toMatch(/html:has\(\[data-calendario-aberto\]\) \{\s*overflow-anchor: none/);
  });

  it("os cinco pontos são discretos (3 px, vão de 8 px, alfa 0,45) e ficam a 12 px da grade", () => {
    expect(semana).toContain('className="size-[3px] rounded-full bg-mute2 opacity-[0.45]"');
    expect(semana).toContain("gap-2");
    expect(css).not.toMatch(/agenda-pontos-correr[\s\S]{0,400}opacity: 0\.6/);
    expect(operacional).toContain('className="mb-[-2.5px] mt-[6.5px]"');
    expect(operacional).toContain('className="mt-[-2.5px] mb-0.5"');
    expect(css).toMatch(/\.agenda-dia-vizinha-pontos \{[^}]*top: -19\.5px/);
    // Os pontos do fim também vêm na página vizinha (antes só os do topo: os de baixo apareciam do nada).
    expect(readFileSync("src/components/barbeiro/agenda/PreviaDiaVizinho.tsx", "utf8")).toContain(
      "agenda-dia-vizinha-pontos-fim",
    );
    expect(css).toMatch(/\.agenda-dia-vizinha-pontos-fim \{[^}]*top: calc\(100% \+ 7\.5px\)/);
  });

  it("o dia vizinho mostra o fora do expediente durante o gesto", () => {
    expect(css).not.toMatch(
      /\.agenda-dia-vizinha \.agenda-timeline-fora-expediente \{\s*background: transparent/,
    );
  });

  it('remove o rótulo "Agora · Livre" e preserva o espaçamento do calendário compacto', () => {
    expect(operacional).not.toContain("Agora · Livre");
    const topo = readFileSync("src/components/barbeiro/agenda/SemanaDoTopo.tsx", "utf8");
    expect(topo).toContain("px-2 pb-9 rounded-b-xl");
  });
});

describe("cartões da timeline num padrão só, barra na cor da categoria (decisões do dono, 18/10)", () => {
  it("o fundo é o mesmo para todos; o estado muda só a barra", () => {
    expect(css).not.toContain("Premium Glass");
    expect(css).not.toContain("--fundo-estado");
    expect(css).toContain("background: var(--agenda-cartao);");
    expect(css.match(/\.agenda-timeline-bloco::before \{/g)?.length).toBe(1);
    expect(css).not.toMatch(
      /\.agenda-timeline-(agendado|chegou|na_cadeira|finalizado|cancelado|nao_compareceu) \{\s*border-left-color/,
    );
  });

  it("o cartão mostra nome, serviço e horário com relógio, como nos modelos", () => {
    expect(timeline).toContain('className="agenda-timeline-horario"');
    expect(timeline).toContain("<Clock3 aria-hidden");
  });
});
