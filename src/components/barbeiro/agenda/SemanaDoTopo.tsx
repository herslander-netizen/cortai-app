import {
  useEffect,
  useLayoutEffect,
  useRef,
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
  /** Grade do mês: célula de 48px com o pontinho por dentro. */
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
      className={`relative flex-col rounded-full px-0 hover:bg-transparent active:bg-transparent ${compacto ? "h-12 gap-0 py-0" : "h-auto min-h-12 gap-1 py-1"}`}
      onClick={() => onDia(dia)}
    >
      <span
        className={`grid place-items-center rounded-full transition-colors duration-[200ms] motion-reduce:transition-none ${compacto ? "size-11 text-xl" : "size-11 text-xl"} ${escolhido ? `${deslizante ? "" : "bg-[var(--agenda-escolhido)] text-[var(--agenda-escolhido-texto)]"} font-semibold` : hoje ? "font-normal text-[var(--agenda-destaque)] ring-[1.5px] ring-inset ring-[var(--agenda-destaque)]" : "font-normal text-paper"} ${deslizante && vizinho === "atual" ? "text-paper" : ""}`}
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
        className={`size-1 rounded-full ${compacto ? "absolute bottom-1" : ""} ${comAtendimento ? "bg-rosa" : "bg-transparent"}`}
      />
    </Button>
  );
}

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

  const indiceDoDia = semana.indexOf(dia);
  const mesDoDiaEscolhido = mesDoDia(dia);
  const mesesComContagem = [
    ...new Set([
      ...semana.map(mesDoDia),
      ...(expandido
        ? [somarMeses(mesDoDiaEscolhido, -1), mesDoDiaEscolhido, somarMeses(mesDoDiaEscolhido, 1)]
        : []),
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

  // A semana acompanha o dedo e, ao trocar (pelo gesto aqui ou pelo deslize do dia), entra pelo lado.
  const linha = useRef<HTMLDivElement>(null);
  const primeiraDaSemana = useRef(semana[0] ?? dia);
  useLayoutEffect(() => {
    const antes = primeiraDaSemana.current;
    const agora = semana[0] ?? dia;
    primeiraDaSemana.current = agora;
    const el = linha.current;
    if (!el || antes === agora || prefereMenosMovimento() || !el.animate) return;
    const lado = agora > antes ? 1 : -1;
    el.animate(
      [
        { transform: `translate3d(${lado * 36}%,0,0)`, opacity: 0 },
        { transform: "translate3d(0,0,0)", opacity: 1 },
      ],
      { duration: 280, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
    );
  }, [semana, dia]);

  const toque = useRef<{ x: number; y: number; horizontal: boolean | null } | null>(null);
  function comecar(e: TouchEvent) {
    const t = e.touches[0];
    toque.current = t ? { x: t.clientX, y: t.clientY, horizontal: null } : null;
  }
  function mover(e: TouchEvent) {
    const inicio = toque.current;
    const t = e.touches[0];
    const el = linha.current;
    if (!inicio || !t || !el) return;
    const dx = t.clientX - inicio.x;
    const dy = t.clientY - inicio.y;
    if (inicio.horizontal === null && Math.hypot(dx, dy) > 8)
      inicio.horizontal = Math.abs(dx) > Math.abs(dy);
    if (!inicio.horizontal || prefereMenosMovimento()) return;
    el.style.transform = `translate3d(${dx * 0.7}px,0,0)`;
    el.style.opacity = String(1 - Math.min(Math.abs(dx) / 400, 0.45));
  }
  function soltar(e: TouchEvent) {
    const inicio = toque.current;
    const t = e.changedTouches[0];
    const el = linha.current;
    toque.current = null;
    if (!el) return;
    const volta = () => {
      el.style.transform = "";
      el.style.opacity = "";
    };
    if (!inicio || !t) return volta();
    const dx = t.clientX - inicio.x;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(t.clientY - inicio.y)) {
      if (!prefereMenosMovimento() && el.animate && el.style.transform) {
        const de = el.style.transform;
        volta();
        el.animate([{ transform: de }, { transform: "translate3d(0,0,0)" }], {
          duration: 200,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        });
      } else volta();
      return;
    }
    volta();
    setSemanas((s) => s + (dx < 0 ? 1 : -1));
  }

  // Ao abrir, a lista de meses começa no mês do dia escolhido.
  const listaRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!expandido) return;
    listaRef.current
      ?.querySelector<HTMLElement>(`[data-mes="${mesDoDiaEscolhido}"]`)
      ?.scrollIntoView({ block: "start" });
  }, [expandido, mesDoDiaEscolhido]);
  const meses = Array.from({ length: MESES_EM_VOLTA * 2 + 1 }, (_, i) =>
    somarMeses(mesDoDiaEscolhido, i - MESES_EM_VOLTA),
  );

  return (
    <div data-sem-gesto-dia>
      <div className={`px-2 pb-3 ${expandido ? "rounded-b-xl bg-ink3" : ""}`}>
        <div className="grid grid-cols-7 text-center text-sm font-medium text-mute" aria-hidden>
          {LETRAS_SEMANA.map((letra, i) => (
            <span key={i} className="pb-4 pt-5">
              {letra}
            </span>
          ))}
        </div>
        {expandido ? (
          <div
            ref={listaRef}
            className="h-[344px] snap-y snap-mandatory overflow-y-auto overscroll-contain animate-in fade-in-0 duration-[200ms] motion-reduce:animate-none"
            aria-label="Calendário"
          >
            {meses.map((mes) => {
              const primeiro = `${mes}-01`;
              return (
                <section key={mes} data-mes={mes} className="min-h-full snap-start pb-2">
                  <h2 className="px-2 pb-1 pt-1 text-[26px] font-semibold text-paper">
                    {tituloDoMes(mes).split(" ")[0]}
                  </h2>
                  <div className="grid grid-cols-7">
                    {gradeDoMes(mes).map((d, i) =>
                      mesDoDia(d) === mes ? (
                        <DiaDoCalendario
                          key={d}
                          dia={d}
                          escolhido={d === dia}
                          hoje={d === hoje}
                          comAtendimento={temAtendimento(d)}
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
            })}
          </div>
        ) : (
          <div
            ref={linha}
            className="relative grid touch-pan-y grid-cols-7 overflow-x-clip animate-in fade-in-0 duration-[200ms] motion-reduce:animate-none"
            role="group"
            aria-label="Dias da semana"
            onTouchStart={comecar}
            onTouchMove={mover}
            onTouchEnd={soltar}
            onTouchCancel={soltar}
          >
            {indiceDoDia >= 0 ? (
              <span
                aria-hidden
                className="pointer-events-none absolute left-0 top-1 grid w-[calc(100%/7)] place-items-center transition-transform duration-[200ms] motion-reduce:transition-none [.agenda-gesto-ativo_&]:transition-none"
                style={{
                  transform: `translate3d(calc((${indiceDoDia} + var(--dia-progresso, 0)) * 100%),0,0)`,
                }}
              >
                <i className="size-11 rounded-full bg-[var(--agenda-escolhido)]" />
              </span>
            ) : null}
            {semana.map((d, i) => (
              <DiaDoCalendario
                key={d}
                dia={d}
                escolhido={d === dia}
                hoje={d === hoje}
                comAtendimento={temAtendimento(d)}
                vizinho={
                  indiceDoDia < 0
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
        )}
      </div>
    </div>
  );
}

/** Cinco pontinhos discretos que marcam o começo e o fim da grade do dia (só informam, não são botão). */
export function MarcaDoLimiteDoDia({
  className = "",
  carregando = false,
}: {
  className?: string;
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
      className={`agenda-pontos flex h-5 items-center justify-center gap-[6px] ${className}`}
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          data-ultimo={i === 0 ? "1" : undefined}
          style={{ animationDelay: `${(4 - i) * 140}ms` }}
          onAnimationIteration={aoVoltar}
          className="size-1 rounded-full bg-mute2 opacity-60"
        />
      ))}
    </div>
  );
}
