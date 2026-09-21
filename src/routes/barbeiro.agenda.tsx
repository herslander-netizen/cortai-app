import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";

import { Screen } from "@/components/layout/Screen";
import { Aviso, type TomDeAviso } from "@/components/ui/aviso";
import { AgendamentoManual } from "@/components/barbeiro/AgendamentoManual";
import { FechamentoComanda } from "@/components/financeiro/FechamentoComanda";
import { brl } from "@/lib/format";
import { slotsDoDia } from "@/lib/horarios";
import { getAgendaDia, oferecerHorarioAFila, type AgendaDia } from "@/lib/barbeiro.functions";
import { repetirAgendamento } from "@/lib/crescimento.functions";
import { Carregando } from "@/components/layout/Carregando";

export const Route = createFileRoute("/barbeiro/agenda")({
  validateSearch: (search: Record<string, unknown>) => ({
    acao:
      search["acao"] === "agendamento" || search["acao"] === "atendimento" || search["acao"] === "cliente"
        ? search["acao"]
        : undefined,
  }),
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

function hojeIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Soma dias ao "AAAA-MM-DD" sem passar pelo fuso do navegador. */
function somarDias(dia: string, passo: number) {
  const [a, m, d] = dia.split("-").map(Number);
  const base = new Date(Date.UTC(a ?? 1970, (m ?? 1) - 1, d ?? 1));
  base.setUTCDate(base.getUTCDate() + passo);
  return base.toISOString().slice(0, 10);
}

function corDaBorda(forma: string | null) {
  if (forma === "fiado") return "border-l-brick";
  return "border-l-gold";
}

function AgendaPage() {
  const { acao } = Route.useSearch();
  const oferecer = useServerFn(oferecerHorarioAFila);
  const repetir = useServerFn(repetirAgendamento);
  const [dia, setDia] = useState(() => new Date().toISOString().slice(0, 10));
  const [aviso, setAviso] = useState<{ tom: TomDeAviso; texto: string } | null>(null);
  const [fechando, setFechando] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery<AgendaDia>({
    queryKey: ["agenda-dia", dia],
    queryFn: () => getAgendaDia({ data: { dia } }),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const { slots: lista, fechado, abre, fecha } = useMemo(
    () => slotsDoDia(dia, data?.horarios ?? null),
    [dia, data?.horarios],
  );

  return (
    <Screen title="Agenda" subtitle="Horários, equipe, fila e bloqueios do dia.">
      <nav className="mb-5 grid grid-cols-2 gap-2" aria-label="Atalhos da agenda">
        <Link to="/barbeiro/profissionais" className="rounded-lg border border-line bg-ink2 px-3 py-3 text-xs text-paper">Profissionais</Link>
        <Link to="/barbeiro/fila" className="rounded-lg border border-line bg-ink2 px-3 py-3 text-xs text-paper">Fila de espera</Link>
      </nav>
      <div className="mb-5">
        <AgendamentoManual
          key={acao ?? "normal"}
          dia={dia}
          autoAbrir={Boolean(acao)}
          iniciarNovoCliente={acao === "cliente"}
          rotulo={acao === "atendimento" ? "Novo atendimento" : "Novo agendamento"}
          onCriado={() => {
            setAviso({ tom: "sucesso", texto: "Agendamento criado e já aparece na agenda." });
            void refetch();
          }}
        />
      </div>

      <label className="mb-2 block">
        <span className="text-xs text-mute2">Dia</span>
        <input
          type="date"
          value={dia}
          onChange={(e) => setDia(e.target.value)}
          className="mt-1 w-full rounded-lg border border-line2 bg-ink2 px-3 py-3 text-sm text-paper"
        />
      </label>
      <div className="mb-6 grid grid-cols-3 gap-2" role="group" aria-label="Navegar pelos dias">
        <button type="button" className="btn-tertiary text-xs" onClick={() => setDia(somarDias(dia, -1))}>
          Anterior
        </button>
        <button type="button" className="btn-tertiary text-xs" onClick={() => setDia(hojeIso())}>
          Hoje
        </button>
        <button type="button" className="btn-tertiary text-xs" onClick={() => setDia(somarDias(dia, 1))}>
          Próximo
        </button>
      </div>

      {aviso ? (
        <Aviso tom={aviso.tom} className="mb-4">
          {aviso.texto}
        </Aviso>
      ) : null}
      {isLoading ? <Carregando /> : null}


      {fechado ? (
        <div className="rounded-lg border border-line bg-ink2 px-4 py-5">
          <p className="text-sm text-paper">Barbearia fechada neste dia</p>
          <p className="mt-1 text-xs text-mute2">
            Você pode mudar isso em Horários de funcionamento.
          </p>
        </div>
      ) : (
        <ul data-guia="agenda-lista">
          {lista.map((s) => {
            const t = new Date(s.iso).getTime();
            const itens = (data?.itens ?? []).filter((i) => {
              const ini = new Date(i.inicio).getTime();
              const fim = new Date(i.fim).getTime();
              return t >= ini && t < fim;
            });
            const naFila = (data?.fila ?? []).filter(
              (f) =>
                f.janelaInicio === null ||
                f.janelaFim === null ||
                (s.hora >= f.janelaInicio && s.hora < f.janelaFim),
            ).length;

            return (
              <li key={s.iso} className="flex items-stretch gap-3 py-1.5">
                <span className="w-12 shrink-0 pt-3 text-xs text-mute">{s.label}</span>

                {itens.length > 0 ? (
                  <div className="flex-1 space-y-2">
                    {itens.length > 1 ? (
                      <p className="text-[11px] text-mute2">
                        {itens.length} atendimentos neste horário
                      </p>
                    ) : null}
                    {itens.map((item) => (
                      <div
                        key={item.id}
                        className={`rounded-r-lg border-l-2 bg-ink2 px-4 py-3 ${corDaBorda(item.forma_pagamento)}`}
                      >
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
                        <button
                          type="button"
                          className="btn-primary mt-3 w-full text-xs"
                          onClick={() => setFechando(item.id)}
                        >
                          Finalizar e receber
                        </button>
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
                                  setAviso({
                                    tom: "info",
                                    texto: `Repetido para ${new Date(r.inicio).toLocaleDateString("pt-BR")}.`,
                                  });
                                  void refetch();
                                } catch (e) {
                                  setAviso({
                                    tom: "acao",
                                    texto: e instanceof Error ? e.message : "Não foi possível repetir.",
                                  });
                                }
                              }}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div data-guia="agenda-vazio" className="flex-1 rounded-r-lg border border-dashed border-line border-l-2 bg-ink px-4 py-3">
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
      )}

      <p className="mt-6 text-xs text-mute2">
        {fechado ? "Dia fechado no horário de funcionamento." : `Aberto das ${abre} às ${fecha}.`} Borda dourada:
        horário normal. Vermelha: fiado. Tracejado: horário livre.
      </p>

      {fechando ? (
        <FechamentoComanda
          agendamentoId={fechando}
          onFechar={() => setFechando(null)}
          onConcluido={() => {
            setFechando(null);
            setAviso({ tom: "sucesso", texto: "Atendimento fechado, pagamento registrado no caixa." });
            void refetch();
          }}
        />
      ) : null}
    </Screen>
  );
}
