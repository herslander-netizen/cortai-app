import { useQueries } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { useRef, type TouchEvent } from "react";

import { getContagemDoMes } from "@/lib/barbeiro.functions";
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

/** Faixa da semana (D a S) com mês expansível e pontinho nos dias com atendimento — só celular. */
export function FaixaCalendario({
  dia,
  hoje,
  onDia,
  profissionalId,
  expandido,
  onExpandido,
  mesVisivel,
  onMesVisivel,
}: {
  dia: string;
  hoje: string;
  onDia: (dia: string) => void;
  profissionalId: string | null;
  expandido: boolean;
  onExpandido: (v: boolean) => void;
  mesVisivel: string;
  onMesVisivel: (mes: string) => void;
}) {
  const reduzir = useReducedMotion();
  const mesConsulta = expandido ? mesVisivel : mesDoDia(dia);
  const semana = semanaDoDia(dia);
  const meses = new Set([mesConsulta, mesDoDia(semana[0]!), mesDoDia(semana[6]!)]);
  const consultas = useQueries({
    queries: [...meses].map((mes) => ({
      queryKey: ["agenda-dia", "mes", mes, profissionalId],
      queryFn: () => getContagemDoMes({ data: { mes, profissionalId } }),
      staleTime: 60_000,
    })),
  });
  const contagem: Record<string, number> = Object.assign({}, ...consultas.map((c) => c.data ?? {}));

  const inicio = useRef<{ x: number; y: number } | null>(null);
  function tocar(e: TouchEvent) {
    e.stopPropagation();
    const t = e.touches[0];
    if (t) inicio.current = { x: t.clientX, y: t.clientY };
  }
  function mover(e: TouchEvent) {
    e.stopPropagation();
  }
  function soltar(e: TouchEvent) {
    e.stopPropagation();
    const t = e.changedTouches[0];
    const i = inicio.current;
    inicio.current = null;
    if (!t || !i) return;
    const dx = t.clientX - i.x;
    const dy = t.clientY - i.y;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) {
      const passo = dx < 0 ? 1 : -1;
      if (expandido) onMesVisivel(somarMeses(mesVisivel, passo));
      else onDia(somarDias(dia, passo * 7));
    }
  }
  function soltarAlca(e: TouchEvent) {
    e.stopPropagation();
    const t = e.changedTouches[0];
    const i = inicio.current;
    inicio.current = null;
    if (t && i && Math.abs(t.clientY - i.y) > 24) onExpandido(t.clientY > i.y);
  }

  const celula = (d: string, foraDoMes = false) => {
    const selecionado = d === dia;
    const ehHoje = d === hoje;
    const qtd = contagem[d] ?? 0;
    return (
      <button
        key={d}
        type="button"
        className="agenda-cal-dia"
        data-selecionado={selecionado || undefined}
        data-hoje={ehHoje || undefined}
        data-fora={foraDoMes || undefined}
        aria-pressed={selecionado}
        aria-current={ehHoje ? "date" : undefined}
        aria-label={`${rotuloDoDia(d)}${qtd ? `, ${qtd} atendimento${qtd > 1 ? "s" : ""}` : ""}`}
        onClick={() => {
          onDia(d);
          if (expandido) onExpandido(false);
        }}
      >
        <span className="agenda-cal-numero">{numeroDoDia(d)}</span>
        <span
          className="agenda-cal-ponto"
          data-visivel={qtd > 0 || undefined}
          data-passado={d < hoje || undefined}
          aria-hidden
        />
      </button>
    );
  };

  return (
    <div
      className="agenda-cal"
      onTouchStart={tocar}
      onTouchMove={mover}
      onTouchEnd={soltar}
      onTouchCancel={soltar}
    >
      <div className="agenda-cal-letras" aria-hidden>
        {LETRAS_SEMANA.map((l, i) => (
          <span key={i}>{l}</span>
        ))}
      </div>
      <motion.div
        initial={false}
        animate={{ height: "auto" }}
        transition={{ duration: reduzir ? 0 : 0.25 }}
        className="overflow-hidden"
      >
        {expandido ? (
          <div role="group" aria-label={tituloDoMes(mesVisivel)}>
            <p className="agenda-cal-mes">{tituloDoMes(mesVisivel)}</p>
            <div className="agenda-cal-grade">
              {gradeDoMes(mesVisivel).map((d) => celula(d, mesDoDia(d) !== mesVisivel))}
            </div>
          </div>
        ) : (
          <div className="agenda-cal-grade" role="group" aria-label="Semana">
            {semana.map((d) => celula(d))}
          </div>
        )}
      </motion.div>
      <button
        type="button"
        className="agenda-cal-alca"
        aria-label={expandido ? "Recolher mês" : "Expandir mês"}
        aria-expanded={expandido}
        onClick={() => {
          if (!expandido) onMesVisivel(mesDoDia(dia));
          onExpandido(!expandido);
        }}
        onTouchStart={tocar}
        onTouchEnd={soltarAlca}
      >
        {Array.from({ length: 5 }, (_, i) => (
          <i key={i} aria-hidden />
        ))}
      </button>
    </div>
  );
}
