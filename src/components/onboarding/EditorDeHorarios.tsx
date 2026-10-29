import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { ChevronDown, Sparkles } from "lucide-react";

import { Aviso } from "@/components/ui/aviso";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DIAS_DA_SEMANA, type HorarioSugerido } from "@/lib/ia/assistente";
import { interpretarHorarios } from "@/lib/assistente.functions";
import { SEGMENTOS_CONFIG, segmentoValido, type Segmento } from "@/lib/segmentos";
import { MOLA } from "@/lib/movimento-figaro";

export function EditorDeHorarios({
  horarios,
  onChange,
  semIA = false,
  segmento = "outro",
}: {
  horarios: HorarioSugerido[];
  onChange: (h: HorarioSugerido[]) => void;
  semIA?: boolean;
  segmento?: Segmento;
}) {
  const reduzirMovimento = useReducedMotion();
  const [horariosAbertos, setHorariosAbertos] = useState(true);
  const interpretar = useServerFn(interpretarHorarios);
  const [texto, setTexto] = useState("");
  const [pensando, setPensando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [previa, setPrevia] = useState<HorarioSugerido[] | null>(null);
  const padrao = SEGMENTOS_CONFIG[segmentoValido(segmento)].horariosPadrao;
  const rotuloPadrao =
    segmento === "barbearia" || segmento === "outro"
      ? "Usar Seg–Sáb, 09:00 às 19:00"
      : "Usar Ter–Sáb, 09:00 às 19:00";

  function atualizar(dia: number, campos: Partial<HorarioSugerido>) {
    onChange(horarios.map((h) => (h.diaSemana === dia ? { ...h, ...campos } : h)));
  }

  return (
    <div>
      <section className="overflow-hidden rounded-[28px] border border-line bg-ink2">
        <Button
          type="button"
          variant="ghost"
          aria-expanded={horariosAbertos}
          onClick={() => setHorariosAbertos((aberto) => !aberto)}
          className="h-auto min-h-14 w-full justify-between rounded-none px-4 py-3 text-left"
        >
          <span className="text-sm font-semibold text-paper">Disponibilidade semanal</span>
          <motion.span
            aria-hidden
            animate={{ rotate: horariosAbertos ? 180 : 0 }}
            transition={reduzirMovimento ? { duration: 0 } : MOLA.padraoEspacial}
            className="shrink-0 text-mute"
          >
            <ChevronDown size={22} />
          </motion.span>
        </Button>
        <motion.div
          initial={false}
          animate={{ height: horariosAbertos ? "auto" : 0, opacity: horariosAbertos ? 1 : 0 }}
          transition={
            reduzirMovimento
              ? { duration: 0 }
              : { height: MOLA.tamanho, opacity: MOLA.padraoEfeito }
          }
          style={{ overflow: "hidden" }}
          aria-hidden={!horariosAbertos}
          inert={!horariosAbertos}
        >
          <div className="p-4">
            <Button
              type="button"
              variant="outline"
              className="w-full text-sm"
              onClick={() => onChange(padrao.map((horario) => ({ ...horario })))}
            >
              {rotuloPadrao}
            </Button>

            <ul className="mt-4 divide-y divide-line border-y border-line">
              {horarios
                .slice()
                .sort((a, b) => a.diaSemana - b.diaSemana)
                .map((h) => (
                  <li key={h.diaSemana} className="flex flex-wrap items-center gap-3 py-3">
                    <span className="w-20 shrink-0 text-sm text-paper">
                      {DIAS_DA_SEMANA[h.diaSemana]}
                    </span>
                    <label className="flex items-center gap-2 text-xs text-mute">
                      <input
                        type="checkbox"
                        checked={!h.fechado}
                        aria-label={`${DIAS_DA_SEMANA[h.diaSemana]} aberto`}
                        onChange={(e) => atualizar(h.diaSemana, { fechado: !e.target.checked })}
                      />
                      Aberto
                    </label>
                    <AnimatePresence initial={false} mode="wait">
                      {h.fechado ? (
                        <motion.div
                          key="fechado"
                          initial={reduzirMovimento ? false : { opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={
                            reduzirMovimento
                              ? { duration: 0 }
                              : { height: MOLA.tamanho, opacity: MOLA.padraoEfeito }
                          }
                          className="overflow-hidden text-xs text-mute2"
                        >
                          Fechado
                        </motion.div>
                      ) : (
                        <motion.div
                          key="aberto"
                          initial={reduzirMovimento ? false : { opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={
                            reduzirMovimento
                              ? { duration: 0 }
                              : { height: MOLA.tamanho, opacity: MOLA.padraoEfeito }
                          }
                          className="flex items-center gap-2 overflow-hidden"
                        >
                          <input
                            type="time"
                            aria-label={`${DIAS_DA_SEMANA[h.diaSemana]} abre`}
                            value={h.abre}
                            onChange={(e) => atualizar(h.diaSemana, { abre: e.target.value })}
                            className="field-control w-auto px-2 text-sm"
                          />
                          <span className="text-xs text-mute2">às</span>
                          <input
                            type="time"
                            aria-label={`${DIAS_DA_SEMANA[h.diaSemana]} fecha`}
                            value={h.fecha}
                            onChange={(e) => atualizar(h.diaSemana, { fecha: e.target.value })}
                            className="field-control w-auto px-2 text-sm"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {!h.fechado ? (
                      h.intervaloInicio && h.intervaloFim ? (
                        <span className="flex w-full flex-wrap items-center gap-2 pl-0 text-xs text-mute sm:flex-nowrap sm:pl-20">
                          Intervalo
                          <input
                            type="time"
                            aria-label={`${DIAS_DA_SEMANA[h.diaSemana]} início do intervalo`}
                            value={h.intervaloInicio}
                            onChange={(e) => atualizar(h.diaSemana, { intervaloInicio: e.target.value })}
                            className="field-control w-auto px-2 text-sm"
                          />
                          <span className="text-mute2">às</span>
                          <input
                            type="time"
                            aria-label={`${DIAS_DA_SEMANA[h.diaSemana]} fim do intervalo`}
                            value={h.intervaloFim}
                            onChange={(e) => atualizar(h.diaSemana, { intervaloFim: e.target.value })}
                            className="field-control w-auto px-2 text-sm"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-auto min-h-12 px-2 text-mute underline"
                            onClick={() =>
                              atualizar(h.diaSemana, { intervaloInicio: null, intervaloFim: null })
                            }
                          >
                            Tirar
                          </Button>
                        </span>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          className="ml-20 h-auto min-h-12 text-xs text-mute underline"
                          onClick={() =>
                            atualizar(h.diaSemana, { intervaloInicio: "12:00", intervaloFim: "13:00" })
                          }
                        >
                          + Intervalo
                        </Button>
                      )
                    ) : null}
                  </li>
                ))}
            </ul>
          </div>
        </motion.div>
      </section>

      {semIA ? null : (
        <div className="mt-5 rounded-xl border border-gold/40 bg-ink2 px-4 py-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-paper">
            <Sparkles size={16} className="text-gold" aria-hidden /> Quer que o Flow configure
            isso para você?
          </p>
          <Textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={2}
            placeholder="segunda a sábado das 9 às 19 e domingo fechado"
            className="mt-3 min-h-20 resize-none"
            aria-label="Descreva os horários de atendimento"
          />
          <Button
            type="button"
            variant="outline"
            className="mt-3 w-full text-sm"
            disabled={pensando || texto.trim().length < 3}
            onClick={async () => {
              setPensando(true);
              setErro(null);
              setAviso(null);
              try {
                const r = await interpretar({ data: { texto } });
                if (!r.disponivel) setAviso(r.resposta);
                else if (r.horarios?.length) setPrevia(r.horarios);
                else setAviso(r.resposta);
              } catch (e) {
                setErro(e instanceof Error ? e.message : "Não consegui entender agora.");
              } finally {
                setPensando(false);
              }
            }}
          >
            {pensando ? "Interpretando…" : "Configurar com IA"}
          </Button>

          {previa ? (
            <div className="mt-4 rounded-xl border-0 bg-[var(--agenda-cartao,var(--ink2))] px-4 py-3">
              <p className="text-xs text-mute">Prévia — confira antes de aplicar:</p>
              <ul className="mt-2 space-y-1">
                {previa.map((h) => (
                  <li key={h.diaSemana} className="flex justify-between text-sm">
                    <span className="text-paper">{DIAS_DA_SEMANA[h.diaSemana]}</span>
                    <span className="text-xs text-mute">
                      {h.fechado ? "Fechado" : `${h.abre} às ${h.fecha}`}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex gap-3">
                <Button
                  type="button"
                  variant="primary"
                  className="flex-1 text-sm"
                  onClick={() => {
                    const mapa = new Map(previa.map((h) => [h.diaSemana, h]));
                    onChange(padrao.map((h) => mapa.get(h.diaSemana) ?? { ...h }));
                    setPrevia(null);
                    setTexto("");
                  }}
                >
                  Aplicar
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-sm"
                  onClick={() => setPrevia(null)}
                >
                  Descartar
                </Button>
              </div>
            </div>
          ) : null}

          {aviso ? (
            <Aviso className="mt-3" tom="info">
              {aviso}
            </Aviso>
          ) : null}
          {erro ? (
            <Aviso className="mt-3" tom="atencao">
              {erro}
            </Aviso>
          ) : null}
        </div>
      )}
    </div>
  );
}
