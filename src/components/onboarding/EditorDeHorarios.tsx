import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles } from "lucide-react";

import { DIAS_DA_SEMANA, type HorarioSugerido } from "@/lib/ia/assistente";
import { interpretarHorarios } from "@/lib/assistente.functions";
import { SEGMENTOS_CONFIG, segmentoValido, type Segmento } from "@/lib/segmentos";

export function EditorDeHorarios({
  horarios,
  onChange,
  semIA = false,
  segmento = "barbearia",
}: {
  horarios: HorarioSugerido[];
  onChange: (h: HorarioSugerido[]) => void;
  semIA?: boolean;
  segmento?: Segmento;
}) {
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
      <button
        type="button"
        className="btn-secondary w-full py-2.5 text-sm"
        onClick={() => onChange(padrao.map((horario) => ({ ...horario })))}
      >
        {rotuloPadrao}
      </button>

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
                  onChange={(e) => atualizar(h.diaSemana, { fechado: !e.target.checked })}
                />
                Aberto
              </label>
              {h.fechado ? (
                <span className="text-xs text-mute2">Fechado</span>
              ) : (
                <span className="flex items-center gap-2">
                  <input
                    type="time"
                    value={h.abre}
                    onChange={(e) => atualizar(h.diaSemana, { abre: e.target.value })}
                    className="h-10 rounded-lg border border-line2 bg-ink2 px-2 text-sm text-paper"
                  />
                  <span className="text-xs text-mute2">às</span>
                  <input
                    type="time"
                    value={h.fecha}
                    onChange={(e) => atualizar(h.diaSemana, { fecha: e.target.value })}
                    className="h-10 rounded-lg border border-line2 bg-ink2 px-2 text-sm text-paper"
                  />
                </span>
              )}
              {!h.fechado ? (
                h.intervaloInicio && h.intervaloFim ? (
                  <span className="flex w-full items-center gap-2 pl-20 text-xs text-mute">
                    Intervalo
                    <input
                      type="time"
                      value={h.intervaloInicio}
                      onChange={(e) => atualizar(h.diaSemana, { intervaloInicio: e.target.value })}
                      className="h-10 rounded-lg border border-line2 bg-ink2 px-2 text-sm text-paper"
                      aria-label="Início do intervalo"
                    />
                    <span className="text-mute2">às</span>
                    <input
                      type="time"
                      value={h.intervaloFim}
                      onChange={(e) => atualizar(h.diaSemana, { intervaloFim: e.target.value })}
                      className="h-10 rounded-lg border border-line2 bg-ink2 px-2 text-sm text-paper"
                      aria-label="Fim do intervalo"
                    />
                    <button
                      type="button"
                      className="min-h-10 px-2 text-mute underline"
                      onClick={() =>
                        atualizar(h.diaSemana, { intervaloInicio: null, intervaloFim: null })
                      }
                    >
                      Tirar
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    className="ml-20 min-h-10 text-xs text-mute underline"
                    onClick={() =>
                      atualizar(h.diaSemana, { intervaloInicio: "12:00", intervaloFim: "13:00" })
                    }
                  >
                    + Intervalo
                  </button>
                )
              ) : null}
            </li>
          ))}
      </ul>

      {semIA ? null : (
        <div className="mt-5 rounded-xl border border-gold/40 bg-ink2 px-4 py-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-paper">
            <Sparkles size={16} className="text-gold" aria-hidden /> Quer que o CortAI configure
            isso para você?
          </p>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={2}
            placeholder="segunda a sábado das 9 às 19 e domingo fechado"
            className="mt-3 w-full resize-none rounded-lg border border-line2 bg-ink px-3.5 py-2.5 text-sm text-paper outline-none"
          />
          <button
            type="button"
            className="btn-secondary mt-3 w-full py-2.5 text-sm"
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
          </button>

          {previa ? (
            <div className="mt-4 rounded-lg border border-line2 bg-ink px-4 py-3">
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
                <button
                  type="button"
                  className="btn-primary flex-1 py-2 text-sm"
                  onClick={() => {
                    const mapa = new Map(previa.map((h) => [h.diaSemana, h]));
                    onChange(padrao.map((h) => mapa.get(h.diaSemana) ?? { ...h }));
                    setPrevia(null);
                    setTexto("");
                  }}
                >
                  Aplicar
                </button>
                <button
                  type="button"
                  className="btn-tertiary text-sm"
                  onClick={() => setPrevia(null)}
                >
                  Descartar
                </button>
              </div>
            </div>
          ) : null}

          {aviso ? <p className="mt-3 text-xs text-mute">{aviso}</p> : null}
          {erro ? <p className="mt-3 text-xs text-brick">{erro}</p> : null}
        </div>
      )}
    </div>
  );
}
