import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles } from "lucide-react";

import { Aviso } from "@/components/ui/aviso";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DIAS_DA_SEMANA, type HorarioSugerido } from "@/lib/ia/assistente";
import { interpretarHorarios } from "@/lib/assistente.functions";
import { SEGMENTOS_CONFIG, segmentoValido, type Segmento } from "@/lib/segmentos";
import { SeletorDeHorario } from "@/components/ui/seletor-de-horario";
import { DiaDoHorario, formaDaLinha, TITULO_DO_CAMPO, type CampoDoHorario } from "./DiaDoHorario";

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
  const [relogio, setRelogio] = useState<{ dia: number; campo: CampoDoHorario } | null>(null);
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
  const ordenados = horarios.slice().sort((a, b) => a.diaSemana - b.diaSemana);
  const doRelogio = relogio ? horarios.find((h) => h.diaSemana === relogio.dia) : undefined;
  const valorDoRelogio = (relogio && doRelogio?.[relogio.campo]) || "09:00";

  return (
    <div>
      <div className="flex items-center justify-between gap-3 px-1">
        <p className="text-sm font-semibold text-mute">Disponibilidade semanal</p>
        <Button
          type="button"
          variant="ghost"
          className="h-auto min-h-12 px-2 text-[13px] font-semibold text-primary"
          onClick={() => onChange(padrao.map((horario) => ({ ...horario })))}
        >
          {rotuloPadrao}
        </Button>
      </div>
      <ul className="mt-1 flex flex-col gap-[3px]">
        {ordenados.map((h, i) => (
          <DiaDoHorario
            key={h.diaSemana}
            horario={h}
            forma={formaDaLinha(i, ordenados.length)}
            onMudar={(campos) => atualizar(h.diaSemana, campos)}
            onEscolherHora={(campo) => setRelogio({ dia: h.diaSemana, campo })}
          />
        ))}
      </ul>
      <SeletorDeHorario
        aberto={relogio !== null}
        titulo={relogio ? `${DIAS_DA_SEMANA[relogio.dia]} · ${TITULO_DO_CAMPO[relogio.campo]}` : ""}
        valor={valorDoRelogio}
        onAberto={(v) => !v && setRelogio(null)}
        onEscolher={(v) => relogio && atualizar(relogio.dia, { [relogio.campo]: v })}
      />

      {semIA ? null : (
        <div className="mt-5 rounded-xl border border-gold/40 bg-ink2 px-4 py-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-paper">
            <Sparkles size={16} className="text-gold" aria-hidden /> Quer que o Flow configure isso
            para você?
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
