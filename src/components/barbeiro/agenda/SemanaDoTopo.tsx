import { useEffect, useLayoutEffect, useRef, useState, type TouchEvent } from "react";
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
  onDia,
}: {
  dia: string;
  escolhido: boolean;
  hoje: boolean;
  comAtendimento: boolean;
  /** Grade do mês: célula de 48px com o pontinho por dentro. */
  compacto?: boolean;
  onDia: (dia: string) => void;
}) {
  return (
    <Button
      variant="ghost"
      aria-pressed={escolhido}
      aria-label={`${rotuloDoDia(dia)}${hoje ? ", hoje" : ""}${comAtendimento ? ", com atendimentos" : ""}`}
      className={`relative flex-col rounded-full px-0 hover:bg-transparent active:bg-transparent ${compacto ? "h-12 gap-0 py-0" : "h-auto min-h-12 gap-1 py-1"}`}
      onClick={() => onDia(dia)}
    >
      <span
        className={`grid place-items-center rounded-full transition-colors duration-[200ms] motion-reduce:transition-none ${compacto ? "size-11 text-xl" : "size-11 text-xl"} ${escolhido ? "bg-menu-icone font-semibold text-ink" : hoje ? "font-normal text-menu-icone ring-[1.5px] ring-inset ring-menu-icone" : "font-normal text-paper"}`}
      >
        {numeroDoDia(dia)}
      </span>
      <span
        aria-hidden
        className={`size-1.5 rounded-full ${compacto ? "absolute bottom-0.5" : ""} ${comAtendimento ? "bg-rosa" : "bg-transparent"}`}
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
      <div className="px-2 pb-3">
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
            className="grid touch-pan-y grid-cols-7 animate-in fade-in-0 duration-[200ms] motion-reduce:animate-none"
            role="group"
            aria-label="Dias da semana"
            onTouchStart={comecar}
            onTouchMove={mover}
            onTouchEnd={soltar}
            onTouchCancel={soltar}
          >
            {semana.map((d) => (
              <DiaDoCalendario
                key={d}
                dia={d}
                escolhido={d === dia}
                hoje={d === hoje}
                comAtendimento={temAtendimento(d)}
                onDia={onDia}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Alça "• • • • •" no começo da grade (rola junto com ela): abre e recolhe o calendário. */
export function AlcaDoCalendario({
  expandido,
  onExpandido,
}: {
  expandido: boolean;
  onExpandido: (aberto: boolean) => void;
}) {
  return (
    <Button
      variant="ghost"
      data-sem-gesto-dia
      aria-label={expandido ? "Recolher o calendário" : "Abrir o calendário"}
      aria-expanded={expandido}
      className="mx-auto -mb-2 flex min-h-12 w-full items-center justify-center gap-1.5 hover:bg-transparent"
      onClick={() => onExpandido(!expandido)}
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} aria-hidden className="size-1 rounded-full bg-mute2" />
      ))}
    </Button>
  );
}
