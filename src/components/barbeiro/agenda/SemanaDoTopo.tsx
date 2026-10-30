import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type RefObject,
  useState,
  type AnimationEvent,
  type TouchEvent,
} from "react";
import { useQueries } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { Button } from "@/components/ui/button";
import { getContagemDoMes } from "@/lib/barbeiro.functions";
import { prefereMenosMovimento } from "@/lib/motion";

import {
  gradeDoMes,
  LETRAS_SEMANA,
  mesDoDia,
  numeroDoDia,
  rotuloDoDia,
  semanaDoDia,
  somarMeses,
  tituloDoMes,
} from "./calendario";
import { somarDias } from "./tempo";

/** Meses mostrados antes e depois do mês do dia quando o calendário está aberto. */
const MESES_EM_VOLTA = 12;
/** Meses montados em cada fase depois que o calendário assenta: perto do dia primeiro, o resto logo depois. */
const FASES_DOS_MESES = [3, 6, 9, MESES_EM_VOLTA] as const;
/** Altura do calendário do mês aberto (a lista rola por dentro). */
const ALTURA_DO_MES = 286;
/**
 * Mola do Figaro (`expandSizeSpringDp`: amortecimento 1,0 e rigidez 400). No Figaro o painel do calendário cresce
 * com essa mola e o espaço da Agenda é uma SEGUNDA mola igual, que persegue a altura já medida do painel
 * (`animateDpAsState` sobre o `onSizeChanged` do seletor): por isso o calendário desce primeiro e a timeline vem atrás.
 */
/** Raiz do conteúdo da Agenda (tudo abaixo do topo), movida junto com o calendário. */
const SELETOR_DO_PALCO = ".agenda-operacional";
const MOLA_DO_FIGARO = {
  stiffness: 400,
  damping: 40,
  mass: 1,
  restDelta: 0.4,
  restSpeed: 4,
} as const;
/** A faixa tem três semanas; a do meio é a visível. `dx` acompanha o dedo ou a troca. */
const posicaoDaFaixa = (dx: number) => `translate3d(calc(-100% / 3 + ${dx}px),0,0)`;

function DiaDoCalendario({
  dia,
  escolhido,
  hoje,
  comAtendimento,
  compacto = false,
  vizinho,
  onDia,
}: {
  dia: string;
  escolhido: boolean;
  hoje: boolean;
  comAtendimento: boolean;
  /** Grade do mês: célula de 40px com círculo de 38px e pontinho por dentro. */
  compacto?: boolean;
  /** Na semana: a data escolhida e seus vizinhos mudam de cor junto com o círculo que desliza. */
  vizinho?: "atual" | "proximo" | "anterior" | undefined;
  onDia: (dia: string) => void;
}) {
  const p = "var(--dia-progresso, 0)";
  const tinta: Record<"atual" | "proximo" | "anterior", string> = {
    atual: `calc((1 - max(${p}, ${p} * -1)) * 100%)`,
    proximo: `calc(max(${p}, 0) * 100%)`,
    anterior: `calc(max(${p} * -1, 0) * 100%)`,
  };
  const deslizante = vizinho !== undefined;
  return (
    <Button
      variant="ghost"
      aria-pressed={escolhido}
      aria-label={`${rotuloDoDia(dia)}${hoje ? ", hoje" : ""}${comAtendimento ? ", com atendimentos" : ""}`}
      className={`relative flex-col rounded-full px-0 hover:bg-transparent active:bg-transparent ${compacto ? "h-10 gap-0 py-0" : "h-12 gap-0 py-0"}`}
      onClick={() => onDia(dia)}
    >
      <span
        className={`grid place-items-center rounded-full transition-colors duration-[200ms] motion-reduce:transition-none ${compacto ? "size-[38px] text-[15px]" : "size-[38px] text-base"} ${escolhido ? `${deslizante ? "" : "bg-[var(--agenda-escolhido)] text-[var(--agenda-escolhido-texto)]"} font-semibold` : hoje ? "font-normal text-[var(--agenda-destaque)] ring-[1.5px] ring-inset ring-[var(--agenda-destaque)]" : "font-normal text-paper"} ${deslizante && vizinho === "atual" ? "text-paper" : ""}`}
        style={
          deslizante && vizinho
            ? {
                color: `color-mix(in oklab, var(--agenda-escolhido-texto) ${tinta[vizinho]}, ${
                  !escolhido && hoje ? "var(--agenda-destaque)" : "var(--paper)"
                })`,
              }
            : undefined
        }
      >
        {numeroDoDia(dia)}
      </span>
      <span
        aria-hidden
        // Captura do Figaro (29/10): 26,6 px abaixo do centro do dia na semana e 12 px no mês. Cor: o magenta
        // terciário do tema claro (#B61055) nos dois modos, como na captura do dono de 30/10.
        className={`${compacto ? "size-1" : "size-[5px]"} rounded-full ${compacto ? "absolute bottom-[6px]" : "absolute -bottom-[6px]"} ${comAtendimento ? "bg-[var(--agenda-ponto-do-dia)]" : "bg-transparent"}`}
      />
    </Button>
  );
}

/** Um mês da lista. Memoizado: ao montar mais meses em fases, os que já estão na tela não renderizam de novo. */
const MesDoCalendario = memo(function MesDoCalendario({
  mes,
  escolhido,
  hoje,
  marcados,
  onDia,
}: {
  mes: string;
  escolhido: string;
  hoje: string;
  marcados: ReadonlySet<string>;
  onDia: (dia: string) => void;
}) {
  const primeiro = `${mes}-01`;
  return (
    <section data-mes={mes} className="min-h-full snap-start pb-2">
      <h2 className="pb-[5px] pl-[6px] pr-2 pt-[13px] text-[22px] leading-7 font-bold text-paper">
        {tituloDoMes(mes).split(" ")[0]}
      </h2>
      <div className="grid grid-cols-7">
        {gradeDoMes(mes).map((d, i) =>
          mesDoDia(d) === mes ? (
            <DiaDoCalendario
              key={d}
              dia={d}
              escolhido={d === escolhido}
              hoje={d === hoje}
              comAtendimento={marcados.has(d)}
              compacto
              onDia={onDia}
            />
          ) : (
            <span key={`${primeiro}-${i}`} aria-hidden />
          ),
        )}
      </div>
    </section>
  );
});

/**
 * Lista de meses do calendário aberto. Memoizada: sem isso cada passo das molas (abrir/fechar) re-renderizava os
 * ~25 meses (centenas de botões) no mesmo quadro e a animação engasgava.
 */
const ListaDeMeses = memo(function ListaDeMeses({
  meses,
  escolhido,
  hoje,
  marcados,
  onDia,
  listaRef,
}: {
  meses: string[];
  escolhido: string;
  hoje: string;
  marcados: ReadonlySet<string>;
  onDia: (dia: string) => void;
  listaRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={listaRef}
      className="relative h-[286px] snap-y snap-mandatory overflow-y-auto overscroll-contain"
      aria-label="Calendário"
    >
      {meses.map((mes) => (
        <MesDoCalendario
          key={mes}
          mes={mes}
          escolhido={escolhido}
          hoje={hoje}
          marcados={marcados}
          onDia={onDia}
        />
      ))}
    </div>
  );
});

/**
 * Topo da Agenda no celular, como no modelo: letras da semana, a semana com o dia escolhido,
 * pontinho nos dias com atendimento e deslizar para trocar de semana. Com `expandido`, a mesma
 * superfície vira a lista de meses (rolagem vertical) e a alça "• • • • •" recolhe.
 */
export function SemanaDoTopo({
  dia,
  hoje,
  profissionalId,
  onDia,
  expandido,
  onExpandido,
}: {
  dia: string;
  hoje: string;
  profissionalId: string | null;
  onDia: (dia: string) => void;
  expandido: boolean;
  onExpandido: (aberto: boolean) => void;
}) {
  const [semanas, setSemanas] = useState(0);
  useEffect(() => setSemanas(0), [dia]);
  const semana = semanaDoDia(somarDias(dia, semanas * 7));
  const inicioDaSemana = semana[0] ?? dia;
  // Três semanas lado a lado: a faixa acompanha o dedo e a vizinha já está ali para entrar.
  const tresSemanas = [
    semanaDoDia(somarDias(inicioDaSemana, -7)),
    semana,
    semanaDoDia(somarDias(inicioDaSemana, 7)),
  ];

  const indiceDoDia = semana.indexOf(dia);
  const mesDoDiaEscolhido = mesDoDia(dia);
  // A lista mensal permite percorrer 12 meses para trás e para frente.
  // Consultar as mesmas 25 competências é necessário para os pontinhos continuarem
  // indicando agendamentos também nos meses distantes, não só nos três meses iniciais.
  const meses = useMemo(
    () =>
      Array.from({ length: MESES_EM_VOLTA * 2 + 1 }, (_, i) =>
        somarMeses(mesDoDiaEscolhido, i - MESES_EM_VOLTA),
      ),
    [mesDoDiaEscolhido],
  );
  // Abre só com o mês do dia (a animação de abrir fica leve) e monta os outros meses quando as molas
  // assentam (`layoutAberto`): montar 24 meses no meio da animação travava o quadro. A lista continua
  // parada no mês do dia escolhido.
  const [raioDosMeses, setRaioDosMeses] = useState(0);
  const mesesProntos = raioDosMeses > 0;
  const mesesMontados = useMemo(
    () => meses.filter((_, i) => Math.abs(i - MESES_EM_VOLTA) <= raioDosMeses),
    [meses, raioDosMeses],
  );
  const mesesDaLista = useMemo(
    () => (raioDosMeses > 0 ? mesesMontados : [mesDoDiaEscolhido]),
    [raioDosMeses, mesesMontados, mesDoDiaEscolhido],
  );
  const mesesComContagem = [
    ...new Set([
      ...tresSemanas.flat().map(mesDoDia),
      ...(mesesProntos ? mesesMontados : expandido ? [mesDoDiaEscolhido] : []),
    ]),
  ];
  const contar = useServerFn(getContagemDoMes);
  const contagens = useQueries({
    queries: mesesComContagem.map((mes) => ({
      queryKey: ["contagem-do-mes", mes, profissionalId],
      queryFn: () => contar({ data: { mes, profissionalId } }),
      staleTime: 60_000,
    })),
  });
  const temAtendimento = (d: string) => contagens.some((q) => Number(q.data?.[d] ?? 0) > 0);
  // Mesmo conteúdo = mesma referência: a lista de meses memoizada só refaz quando as contagens mudam de fato.
  const versaoDasContagens = contagens.map((q) => q.dataUpdatedAt).join(",");
  const diasAnteriores = useRef<ReadonlySet<string>>(new Set());
  const diasComAtendimento = useMemo(() => {
    const dias = new Set<string>();
    for (const q of contagens)
      for (const [d, n] of Object.entries(q.data ?? {})) if (Number(n) > 0) dias.add(d);
    // Conteúdo igual = mesma referência: contagem chegando sem novidade não refaz os ~25 meses.
    const antes = diasAnteriores.current;
    if (antes.size === dias.size && [...dias].every((d) => antes.has(d))) return antes;
    diasAnteriores.current = dias;
    return dias;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `versaoDasContagens` resume as contagens
  }, [versaoDasContagens]);
  const onDiaAtual = useRef(onDia);
  onDiaAtual.current = onDia;
  const onDiaEstavel = useCallback((d: string) => onDiaAtual.current(d), []);

  // A faixa desliza uma semana inteira, como no modelo: pelo dedo aqui (1:1, assenta na semana
  // mais próxima) ou quando o dia escolhido passa para outra semana (a antiga sai, a nova entra).
  const linha = useRef<HTMLDivElement>(null);
  const trilho = useRef<HTMLDivElement>(null);
  const primeiraDaSemana = useRef(inicioDaSemana);
  const assentouPeloDedo = useRef<Animation | null>(null);
  useLayoutEffect(() => {
    const antes = primeiraDaSemana.current;
    primeiraDaSemana.current = inicioDaSemana;
    const el = trilho.current;
    const pelaMao = assentouPeloDedo.current;
    assentouPeloDedo.current = null;
    if (!el || antes === inicioDaSemana) return;
    el.style.transform = posicaoDaFaixa(0);
    // Pelo dedo a faixa já chegou lá: só tira o deslocamento junto com a troca (nada pisca).
    pelaMao?.cancel();
    if (pelaMao || prefereMenosMovimento() || !el.animate) return;
    const largura = linha.current?.getBoundingClientRect().width ?? 0;
    const lado = inicioDaSemana > antes ? 1 : -1;
    el.animate([{ transform: posicaoDaFaixa(lado * largura) }, { transform: posicaoDaFaixa(0) }], {
      duration: 280,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    });
  }, [inicioDaSemana]);

  const toque = useRef<{
    x: number;
    y: number;
    t: number;
    horizontal: boolean | null;
    dx: number;
  } | null>(null);
  function comecar(e: TouchEvent) {
    const t = e.touches[0];
    toque.current = t
      ? { x: t.clientX, y: t.clientY, t: performance.now(), horizontal: null, dx: 0 }
      : null;
  }
  function mover(e: TouchEvent) {
    const inicio = toque.current;
    const t = e.touches[0];
    const el = trilho.current;
    if (!inicio || !t || !el) return;
    const dx = t.clientX - inicio.x;
    const dy = t.clientY - inicio.y;
    if (inicio.horizontal === null && Math.hypot(dx, dy) > 8)
      inicio.horizontal = Math.abs(dx) > Math.abs(dy);
    if (!inicio.horizontal || prefereMenosMovimento()) return;
    const largura = linha.current?.getBoundingClientRect().width ?? 0;
    inicio.dx = Math.max(-largura, Math.min(largura, dx));
    el.style.transform = posicaoDaFaixa(inicio.dx);
  }
  function soltar(e: TouchEvent) {
    const inicio = toque.current;
    toque.current = null;
    const el = trilho.current;
    const t = e.changedTouches[0];
    if (!el || !inicio) return;
    // Um deslize rápido pode chegar sem nenhum movimento intermediário.
    if (inicio.horizontal === null && t) {
      const dxFinal = t.clientX - inicio.x;
      if (Math.abs(dxFinal) > 8 && Math.abs(dxFinal) > Math.abs(t.clientY - inicio.y)) {
        inicio.horizontal = true;
        inicio.dx = dxFinal;
      }
    }
    if (!inicio.horizontal) return;
    const largura = linha.current?.getBoundingClientRect().width ?? 0;
    const { dx } = inicio;
    const rapido = Math.abs(dx) > 20 && performance.now() - inicio.t < 250;
    const passo = Math.abs(dx) > largura * 0.25 || rapido ? (dx < 0 ? 1 : -1) : 0;
    if (prefereMenosMovimento() || !el.animate) {
      el.style.transform = posicaoDaFaixa(0);
      if (passo) setSemanas((s) => s + passo);
      return;
    }
    const animacao = el.animate(
      [{ transform: posicaoDaFaixa(dx) }, { transform: posicaoDaFaixa(-passo * largura) }],
      { duration: 220, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" },
    );
    el.style.transform = posicaoDaFaixa(0);
    animacao.onfinish = () => {
      if (!passo) return animacao.cancel();
      assentouPeloDedo.current = animacao;
      setSemanas((s) => s + passo);
    };
  }

  const listaRef = useRef<HTMLDivElement>(null);
  // Altura da semana: o mês nasce dela e volta para ela ao fechar.
  const camadaSemana = useRef<HTMLDivElement>(null);
  const alturaDaSemana = useRef(60);
  // Duas molas iguais (1,0 / 400) em série, como no Figaro: o painel abre e a Agenda vem atrás, perseguindo a
  // borda dele (vídeo do Figaro do dono, 30/10, medido quadro a quadro: a Agenda começa ~90 ms depois e assenta
  // ~0,35 s depois do painel). Substitui a mola única de 29/10 a pedido do dono ("quero esse efeito de mola").
  const alvoDoPainel = useMotionValue(60);
  const alturaDoPainel = useSpring(alvoDoPainel, MOLA_DO_FIGARO);
  const espacoDaAgenda = useSpring(alturaDoPainel, MOLA_DO_FIGARO);
  // O painel vai até a borda de baixo do topo (o `pb-[13px]`): sem isso, ao fim da descida o topo crescia
  // mais 24 px de uma vez e cobria o começo da timeline (vídeo do dono, 29/10).
  const alturaDoPainelAteABorda = useTransform(alturaDoPainel, (v) => v + 13);
  const [painelVisivel, setPainelVisivel] = useState(false);
  // Só o painel (camada sobre a Agenda) muda de tamanho a cada quadro. A Agenda é movida por transform
  // (GPU, sem refazer o layout da grade inteira); a altura real do topo só muda no começo do fechar e no
  // fim do abrir, no mesmo quadro em que o transform sai: nada salta e nada engasga.
  const [layoutAberto, setLayoutAberto] = useState(false);
  const layoutAbertoRef = useRef(false);
  layoutAbertoRef.current = layoutAberto;
  const expandidoRef = useRef(expandido);
  expandidoRef.current = expandido;
  const aplicarDeslocamento = useCallback((espaco: number) => {
    const palco = document.querySelector<HTMLElement>(SELETOR_DO_PALCO);
    if (!palco) return;
    const base = layoutAbertoRef.current ? ALTURA_DO_MES : alturaDaSemana.current;
    const dy = espaco - base;
    if (Math.abs(dy) < 0.05) {
      palco.style.transform = "";
      palco.style.willChange = "";
    } else {
      palco.style.willChange = "transform";
      palco.style.transform = `translate3d(0,${dy}px,0)`;
    }
  }, []);
  useLayoutEffect(() => {
    const altura = camadaSemana.current?.offsetHeight;
    if (!altura) return;
    alturaDaSemana.current = altura;
    for (const v of [alvoDoPainel, alturaDoPainel, espacoDaAgenda]) v.jump(altura);
  }, [alvoDoPainel, alturaDoPainel, espacoDaAgenda]);
  useLayoutEffect(() => {
    if (!expandido && !painelVisivel) return;
    const alvo = expandido ? ALTURA_DO_MES : alturaDaSemana.current;
    if (expandido) setPainelVisivel(true);
    if (prefereMenosMovimento()) {
      for (const v of [alvoDoPainel, alturaDoPainel, espacoDaAgenda]) v.jump(alvo);
      layoutAbertoRef.current = expandido;
      setLayoutAberto(expandido);
      aplicarDeslocamento(alvo);
      if (!expandido) {
        setPainelVisivel(false);
        setRaioDosMeses(0);
      }
      return;
    }
    if (!expandido && layoutAbertoRef.current) {
      // Fechando: o topo encolhe já, e a Agenda continua onde estava (transform) até a mola trazê-la.
      layoutAbertoRef.current = false;
      setLayoutAberto(false);
      aplicarDeslocamento(espacoDaAgenda.get());
    }
    alvoDoPainel.set(alvo);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reage só à troca de aberto/fechado
  }, [expandido]);
  // Cada passo da mola só move a Agenda por transform.
  useEffect(
    () => espacoDaAgenda.on("change", aplicarDeslocamento),
    [espacoDaAgenda, aplicarDeslocamento],
  );
  useEffect(
    () =>
      alturaDoPainel.on("animationComplete", () => {
        if (expandidoRef.current) return;
        setPainelVisivel(false);
        setRaioDosMeses(0);
      }),
    [alturaDoPainel],
  );
  useEffect(
    () =>
      espacoDaAgenda.on("animationComplete", () => {
        // Abriu: a altura real passa a ser a do mês (o transform sai no mesmo quadro, em `layoutAberto`).
        if (expandidoRef.current) setLayoutAberto(true);
        else aplicarDeslocamento(alturaDaSemana.current);
      }),
    [espacoDaAgenda, aplicarDeslocamento],
  );
  useLayoutEffect(() => {
    if (!layoutAberto) return;
    layoutAbertoRef.current = true;
    aplicarDeslocamento(ALTURA_DO_MES);
  }, [layoutAberto, aplicarDeslocamento]);
  useEffect(() => {
    // Fechando, os meses só saem depois que o painel termina de recolher (desmontar no 1º quadro travava).
    if (!expandido || !layoutAberto) return;
    // Fases separadas por um respiro (uma cada ~140 ms): nunca os 25 meses de uma vez no mesmo quadro.
    let fase = 0;
    let espera = 0;
    const proxima = () => {
      setRaioDosMeses(FASES_DOS_MESES[fase] ?? MESES_EM_VOLTA);
      fase += 1;
      if (fase < FASES_DOS_MESES.length) espera = window.setTimeout(proxima, 140);
    };
    proxima();
    return () => window.clearTimeout(espera);
  }, [expandido, layoutAberto]);
  // Se a tela sair com o mês aberto, a Agenda não pode ficar deslocada.
  useEffect(
    () => () => {
      const palco = document.querySelector<HTMLElement>(SELETOR_DO_PALCO);
      if (palco) {
        palco.style.transform = "";
        palco.style.willChange = "";
      }
    },
    [],
  );
  useLayoutEffect(() => {
    if (!expandido) return;
    // Rola só a lista: scrollIntoView rolava também a página e a Agenda pulava embaixo.
    const lista = listaRef.current;
    const mes = lista?.querySelector<HTMLElement>(`[data-mes="${mesDoDiaEscolhido}"]`);
    if (lista && mes) lista.scrollTop = mes.offsetTop;
  }, [expandido, mesDoDiaEscolhido, raioDosMeses]);
  return (
    <div data-sem-gesto-dia data-calendario-aberto={expandido || painelVisivel || undefined} style={{ fontFamily: "var(--figaro-font-body)" }}>
      <div className="px-2 pb-[13px] rounded-b-xl">
        <div className="grid grid-cols-7 text-center text-[11.5px] leading-4 font-medium text-[var(--figaro-hint,var(--mute))]" aria-hidden>
          {LETRAS_SEMANA.map((letra, i) => (
            <span key={i} className="pb-2 pt-3">
              {letra}
            </span>
          ))}
        </div>
        {/* Como no Figaro: a superfície cresce até o mês e a semana dá lugar a ele ao mesmo tempo, e a
            Agenda abaixo desce junto (o espaço do mês anima na mesma curva do painel). A rolagem do mês
            é só por dentro e o navegador não reancora a página (`overflow-anchor` em styles.css). */}
        <motion.div className="relative" style={layoutAberto ? { height: ALTURA_DO_MES } : {}}>
          <motion.div
            ref={camadaSemana}
            // Fechando, a semana fica por cima do painel que recolhe (como no Figaro): por baixo dele, o fundo vazio
            // do mês cobria a fileira e os dias sumiam até o fim da animação (vídeo do dono, 29/10).
            className="relative pt-[11px]"
            style={{ zIndex: expandido ? 0 : 20 }}
            initial={false}
            animate={{ opacity: expandido ? 0 : 1 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            aria-hidden={expandido || undefined}
            inert={expandido || undefined}
          >
            <div
              ref={linha}
              className="relative touch-pan-y overflow-x-clip"
              role="group"
              aria-label="Dias da semana"
              onTouchStart={comecar}
              onTouchMove={mover}
              onTouchEnd={soltar}
              onTouchCancel={soltar}
            >
              <div ref={trilho} className="flex w-[300%]" style={{ transform: posicaoDaFaixa(0) }}>
                {tresSemanas.map((dias, s) => (
                  <div
                    key={dias[0]}
                    className="relative grid w-1/3 grid-cols-7"
                    aria-hidden={s !== 1 || undefined}
                    inert={s !== 1 || undefined}
                  >
                    {s === 1 && indiceDoDia >= 0 ? (
                      <span
                        aria-hidden
                        className="pointer-events-none absolute left-0 top-[5px] grid w-[calc(100%/7)] place-items-center transition-transform duration-[200ms] motion-reduce:transition-none [.agenda-gesto-ativo_&]:transition-none"
                        style={{
                          transform: `translate3d(calc((${indiceDoDia} + var(--dia-progresso, 0)) * 100%),0,0)`,
                        }}
                      >
                        <i className="size-[38px] rounded-full bg-[var(--agenda-escolhido)]" />
                      </span>
                    ) : null}
                    {dias.map((d, i) => (
                      <DiaDoCalendario
                        key={d}
                        dia={d}
                        escolhido={d === dia}
                        hoje={d === hoje}
                        comAtendimento={temAtendimento(d)}
                        vizinho={
                          s !== 1 || indiceDoDia < 0
                            ? undefined
                            : i === indiceDoDia
                              ? "atual"
                              : i === indiceDoDia + 1
                                ? "proximo"
                                : i === indiceDoDia - 1
                                  ? "anterior"
                                  : undefined
                        }
                        onDia={onDia}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
          {painelVisivel ? (
            <motion.div
              key="calendario-expandido"
              className="absolute -inset-x-2 top-0 z-10 overflow-hidden rounded-b-[16px] px-2 pb-3"
              // O recorte deixa a sombra só embaixo: no topo ela desenhava uma linha entre as letras da semana e o mês.
              style={{
                background: "var(--figaro-surface-container, var(--ink2))",
                boxShadow: "var(--elevacao-3)",
                clipPath: "inset(0 -16px -24px -16px)",
                height: alturaDoPainelAteABorda,
              }}
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: expandido ? 1 : 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <ListaDeMeses
                  meses={mesesDaLista}
                  escolhido={dia}
                  hoje={hoje}
                  marcados={diasComAtendimento}
                  onDia={onDiaEstavel}
                  listaRef={listaRef}
                />
              </motion.div>
            </motion.div>
          ) : null}
        </motion.div>
      </div>
    </div>
  );
}

/** Cinco pontinhos discretos que marcam o começo e o fim da grade do dia (só informam, não são botão). */
export function MarcaDoLimiteDoDia({
  className = "",
  carregando = false,
  naPagina = false,
}: {
  className?: string;
  /** Troca de dia em páginas: os pontinhos deslizam junto com a página do dia. */
  naPagina?: boolean;
  /** Enquanto a Agenda atualiza, os pontos correm pela direita e voltam pela esquerda. */
  carregando?: boolean;
}) {
  // Só começa se a atualização durar um instante (evita piscar a cada consulta rápida).
  const [correndo, setCorrendo] = useState(false);
  const carregandoRef = useRef(carregando);
  carregandoRef.current = carregando;
  const raiz = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!carregando) return;
    const espera = window.setTimeout(() => {
      raiz.current
        ?.querySelectorAll<HTMLElement>("span")
        .forEach((p) => (p.style.animationName = ""));
      setCorrendo(true);
    }, 350);
    return () => window.clearTimeout(espera);
  }, [carregando]);
  // Cada ponto termina a volta em que está e para no seu lugar: nada trava no meio do caminho.
  function aoVoltar(e: AnimationEvent<HTMLElement>) {
    const ponto = e.currentTarget;
    if (carregandoRef.current) return;
    ponto.style.animationName = "none";
    if (ponto.dataset["ultimo"]) setCorrendo(false);
  }
  return (
    <div
      ref={raiz}
      aria-hidden
      data-correndo={correndo || undefined}
      data-trilho-dia={naPagina ? "" : undefined}
      className={`agenda-pontos flex h-3 items-center justify-center gap-2 ${className}`}
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          data-ultimo={i === 0 ? "1" : undefined}
          style={{ animationDelay: `${(4 - i) * 140}ms` }}
          onAnimationIteration={aoVoltar}
          className="agenda-ponto-limite size-[3px] rounded-full"
        />
      ))}
    </div>
  );
}
