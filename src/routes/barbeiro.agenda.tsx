import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { Screen } from "@/components/layout/Screen";
import { Aviso, type TomDeAviso } from "@/components/ui/aviso";
import { AgendamentoManual } from "@/components/barbeiro/AgendamentoManual";
import { brl } from "@/lib/format";
import { getAgendaDia, oferecerHorarioAFila, type AgendaDia } from "@/lib/barbeiro.functions";
import { repetirAgendamento } from "@/lib/crescimento.functions";
import { Carregando } from "@/components/layout/Carregando";

export const Route = createFileRoute("/barbeiro/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda do dia — Painel do barbeiro | Cortaí" },
      { name: "description", content: "Todos os horários do dia, com fiado, bloqueios e fila de espera." },
      { property: "og:title", content: "Agenda do dia — Cortaí" },
      { property: "og:description", content: "Horários, bloqueios e quem está na fila." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AgendaPage,
});

const HORA_INICIO = 9;
const HORA_FIM = 19;
const ALMOCO_INICIO = 12;
const ALMOCO_FIM = 13;

function slots(dia: string) {
  const out: { iso: string; label: string; hora: number }[] = [];
  for (let h = HORA_INICIO; h < HORA_FIM; h++) {
    for (const m of [0, 30]) {
      const d = new Date(`${dia}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`);
      out.push({ iso: d.toISOString(), label: `${String(h).padStart(2, "0")}:${m === 0 ? "00" : "30"}`, hora: h });
    }
  }
  return out;
}

function corDaBorda(forma: string | null) {
  if (forma === "fiado") return "border-l-brick";
  return "border-l-gold";
}

function AgendaPage() {
  const oferecer = useServerFn(oferecerHorarioAFila);
  const repetir = useServerFn(repetirAgendamento);
  const [dia, setDia] = useState(() => new Date().toISOString().slice(0, 10));
  const [aviso, setAviso] = useState<{ tom: TomDeAviso; texto: string } | null>(null);

  const { data, isLoading, refetch } = useQuery<AgendaDia>({
    queryKey: ["agenda-dia", dia],
    queryFn: () => getAgendaDia({ data: { dia } }),
  });

  const lista = slots(dia);

  return (
    <Screen title="Agenda do dia" subtitle="Hora a hora, do primeiro ao último.">
      <div className="mb-5">
        <AgendamentoManual
          dia={dia}
          onCriado={() => {
            setAviso({ tom: "sucesso", texto: "Agendamento criado e já aparece na agenda." });
            void refetch();
          }}
        />
      </div>

      <label className="mb-6 block">
        <span className="text-xs text-mute2">Dia</span>
        <input
          type="date"
          value={dia}
          onChange={(e) => setDia(e.target.value)}
          className="mt-1 w-full rounded-lg border border-line2 bg-ink2 px-3 py-3 text-sm text-paper"
        />
      </label>

      {aviso ? (
        <Aviso tom={aviso.tom} className="mb-4">
          {aviso.texto}
        </Aviso>
      ) : null}
      {isLoading ? <Carregando /> : null}


      <ul data-guia="agenda-lista">
        {lista.map((s) => {
          const item = data?.itens.find((i) => {
            const ini = new Date(i.inicio).getTime();
            const fim = new Date(i.fim).getTime();
            const t = new Date(s.iso).getTime();
            return t >= ini && t < fim;
          });
          const bloqueio = s.hora >= ALMOCO_INICIO && s.hora < ALMOCO_FIM;
          const naFila = (data?.fila ?? []).filter(
            (f) =>
              f.janelaInicio === null ||
              f.janelaFim === null ||
              (s.hora >= f.janelaInicio && s.hora < f.janelaFim),
          ).length;

          return (
            <li key={s.iso} className="flex items-stretch gap-3 py-1.5">
              <span className="w-12 shrink-0 pt-3 text-xs text-mute">{s.label}</span>

              {item ? (
                <div className={`flex-1 border-l-2 bg-ink2 px-4 py-3 ${corDaBorda(item.forma_pagamento)}`}>
                  {item.clienteId ? (
                    <Link
                      to="/barbeiro/clientes/$id"
                      params={{ id: item.clienteId }}
                      className="text-sm font-medium text-gold underline underline-offset-2"
                    >
                      {item.cliente}
                    </Link>
                  ) : (
                    <p className="text-sm text-paper">{item.cliente}</p>
                  )}
                  <p className="mt-0.5 text-xs text-mute">
                    {item.servico} · {item.profissional}
                  </p>
                  <p
                    className={`mt-0.5 text-xs ${item.forma_pagamento === "fiado" ? "text-brick" : "text-mute2"}`}
                  >
                    {item.forma_pagamento === "credito"
                      ? "1 crédito"
                      : item.forma_pagamento === "fiado"
                        ? `Fiado · ${brl(item.valor_centavos)}`
                        : brl(item.valor_centavos)}
                  </p>
                  <div data-guia="agenda-repetir" className="mt-2 flex flex-wrap gap-3">
                    <span className="text-[11px] text-mute2">Repetir:</span>
                    {(["semanal", "quinzenal", "mensal"] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        className="btn-tertiary text-[11px]"
                        onClick={async () => {
                          try {
                            const r = await repetir({ data: { agendamentoId: item.id, periodicidade: p } });
                            setAviso({ tom: "info", texto: `Repetido para ${new Date(r.inicio).toLocaleDateString("pt-BR")}.` });
                            void refetch();
                          } catch (e) {
                            setAviso({ tom: "acao", texto: e instanceof Error ? e.message : "Não foi possível repetir." });
                          }
                        }}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              ) : bloqueio ? (
                <div className="flex-1 border-l-2 border-l-mute2 bg-ink2 px-4 py-3">
                  <p className="text-sm text-mute">Almoço</p>
                  <p className="mt-0.5 text-xs text-mute2">Horário bloqueado.</p>
                </div>
              ) : (
                <div data-guia="agenda-vazio" className="flex-1 border border-dashed border-line2 border-l-2 px-4 py-3">
                  <p className="text-sm text-mute">Horário livre</p>
                  <p className="mt-0.5 text-xs text-mute2">
                    {naFila > 0
                      ? `${naFila} ${naFila === 1 ? "pessoa" : "pessoas"} na fila para esta janela`
                      : "Ninguém na fila para esta janela"}
                  </p>
                  {naFila > 0 ? (
                    <button
                      type="button"
                      className="btn-tertiary mt-2 text-xs"
                      onClick={async () => {
                        const r = await oferecer({ data: { inicioIso: s.iso } });
                        setAviso(
                          r.avisado
                            ? { tom: "atencao", texto: `${r.avisado} foi avisado do horário das ${s.label}. Quem responder primeiro fica com a vaga.` }
                            : { tom: "info", texto: "Ninguém na fila para esta janela." },
                        );
                      }}
                    >
                      Oferecer à fila
                    </button>
                  ) : null}
                  <div className="mt-2">
                    <AgendamentoManual
                      dia={dia}
                      horaInicial={s.label}
                      gatilho="discreto"
                      onCriado={() => {
                        setAviso({ tom: "sucesso", texto: `Cliente marcado às ${s.label}.` });
                        void refetch();
                      }}
                    />
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <p className="mt-6 text-xs text-mute2">
        Borda dourada: horário normal. Vermelha: fiado. Cinza: bloqueio. Tracejado: horário livre.
      </p>
    </Screen>
  );
}
