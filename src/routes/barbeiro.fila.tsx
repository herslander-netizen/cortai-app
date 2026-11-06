import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { EmptyState, Screen } from "@/components/layout/Screen";
import { brl } from "@/lib/format";
import { useAcao } from "@/hooks/useAcao";
import {
  converterFilaEmAgendamento,
  editarFila,
  getFila,
  getOpcoesDaFila,
  moverNaFila,
  removerDaFila,
} from "@/lib/barbeiro.functions";
import { EsqueletoLista } from "@/components/layout/Esqueleto";
import { aviso, comDesfazer } from "@/lib/avisos";
import { InterruptorListaDeEspera } from "@/components/barbeiro/InterruptorListaDeEspera";
import { StatusBadge } from "@/components/ui/badge";
import { exigirCapacidade } from "@/lib/guarda-capacidade";
import { isoNoFusoDaBarbearia } from "@/lib/horarios";
import { agruparPorDiaDesejado } from "@/lib/lista-espera-agenda";
import { FormularioFila } from "@/components/barbeiro/espera/FormularioDaEspera";
import { PessoaDaEspera } from "@/components/barbeiro/espera/PessoaDaEspera";
import { tituloDoDia } from "@/components/barbeiro/agenda/lista-periodo-regras";

export const Route = createFileRoute("/barbeiro/fila")({
  beforeLoad: ({ context }) => exigirCapacidade(context.queryClient, "fila_espera"),
  head: () => ({
    meta: [
      { title: "Lista de espera — Painel | Flow" },
      {
        name: "description",
        content: "Quem espera vaga, ofertas enviadas e horários recuperados pela lista.",
      },
      { property: "og:title", content: "Lista de espera — Flow" },
      {
        property: "og:description",
        content: "Vaga liberada vira atendimento com a lista de espera.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: FilaPage,
});

const STATUS_OFERTA: Record<string, string> = {
  enviada: "Aguardando resposta",
  aceita: "Confirmou",
  recusada: "Recusou",
  expirada: "Expirou",
  cancelada: "Vaga preenchida",
};

function horaCurta(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Lista de espera da equipe (dono, 06/11/2026: "mais leve… organize as funções como UX/UI sênior"): resumo no topo,
 * pessoas agrupadas pelo dia que pediram, oferta com prazo e um único "⋯" por pessoa. Regras e funções do servidor
 * iguais (oferta automática só em `ofertarVaga`).
 */
function FilaPage() {
  const remover = useServerFn(removerDaFila);
  const mover = useServerFn(moverNaFila);
  const editar = useServerFn(editarFila);
  const converter = useServerFn(converterFilaEmAgendamento);
  const acao = useAcao();
  const queryClient = useQueryClient();
  const [aberto, setAberto] = useState<{ id: string; modo: "editar" | "agendar" } | null>(null);

  const { data, isLoading, refetch } = useQuery({ queryKey: ["fila"], queryFn: () => getFila() });
  const opcoes = useQuery({
    queryKey: ["fila-opcoes"],
    queryFn: () => getOpcoesDaFila(),
    enabled: aberto !== null,
  });

  function removerComDesfazer(filaId: string, cliente: string) {
    const anterior = queryClient.getQueryData<typeof data>(["fila"]);
    if (anterior) {
      queryClient.setQueryData(["fila"], {
        ...anterior,
        itens: anterior.itens.filter((i) => i.id !== filaId),
      });
    }
    let cancelado = false;
    const prazo = setTimeout(async () => {
      if (cancelado) return;
      try {
        await remover({ data: { filaId } });
        await refetch();
      } catch {
        if (anterior) queryClient.setQueryData(["fila"], anterior);
        aviso.erro(`Não consegui tirar ${cliente} da lista.`);
      }
    }, 5000);
    comDesfazer(`${cliente} saiu da lista.`, () => {
      cancelado = true;
      clearTimeout(prazo);
      if (anterior) queryClient.setQueryData(["fila"], anterior);
    });
  }

  const itens = data?.itens ?? [];
  const total = itens.length;

  return (
    <Screen
      voltarPara="/barbeiro/mais"
      title="Lista de espera"
      subtitle="Vaga liberada é oferecida automaticamente a quem combina."
    >
      <InterruptorListaDeEspera />

      {isLoading ? <EsqueletoLista linhas={4} onTentarDeNovo={() => void refetch()} /> : null}

      {data ? (
        <section className="mt-3 rounded-[20px] bg-[var(--figaro-surface-container,var(--ink2))] p-4">
          <p className="text-paper">
            <b className="text-[26px] leading-none">{total}</b>
            <span className="ml-2 text-sm text-mute">
              {total === 1 ? "pessoa na lista" : "pessoas na lista"}
            </span>
          </p>
          <p className="mt-1.5 text-[13px] text-mute">
            Recuperado no mês:{" "}
            <span className="money-value text-paper">{brl(data.recuperadoCentavos)}</span> ·{" "}
            {data.recuperadosMes} {data.recuperadosMes === 1 ? "atendimento" : "atendimentos"}
          </p>
        </section>
      ) : null}

      {data && total === 0 ? (
        <EmptyState text="Quando a agenda lotar, seus clientes podem entrar na lista de espera pelo link de agendamento." />
      ) : null}

      {agruparPorDiaDesejado(itens).map((grupo) => (
        <section key={grupo.dia ?? "qualquer"} className="mt-5">
          <h2 className="mb-2 px-1 text-[13px] font-semibold text-mute">
            {grupo.dia
              ? `${tituloDoDia(grupo.dia).semana}, ${tituloDoDia(grupo.dia).abreviado}`
              : "Qualquer dia"}
          </h2>
          <ul className="divide-y divide-line overflow-hidden rounded-[20px] bg-[var(--figaro-surface-container,var(--ink2))]">
            {grupo.itens.map((f) => (
              <li key={f.id}>
                <PessoaDaEspera
                  pessoa={f}
                  primeira={f.posicao === 1}
                  ultima={f.posicao === total}
                  ocupado={acao.ocupado}
                  onAgendar={() => setAberto({ id: f.id, modo: "agendar" })}
                  onEditar={() => setAberto({ id: f.id, modo: "editar" })}
                  onMover={(direcao) =>
                    acao.executar(
                      `${direcao}-${f.id}`,
                      () => mover({ data: { filaId: f.id, direcao } }),
                      {
                        aoConcluir: async () => {
                          await refetch();
                        },
                      },
                    )
                  }
                  onRemover={() => removerComDesfazer(f.id, f.cliente)}
                />
                {aberto?.id === f.id ? (
                  <div className="px-4 pb-4">
                    <FormularioFila
                      item={f}
                      modo={aberto.modo}
                      opcoes={opcoes.data}
                      ocupado={acao.ocupado}
                      onCancelar={() => setAberto(null)}
                      onSalvar={(v) =>
                        acao.executar(
                          `form-${f.id}`,
                          async () => {
                            if (aberto.modo === "editar") {
                              await editar({
                                data: {
                                  filaId: f.id,
                                  servicoId: v.servicoId,
                                  profissionalId: v.profissionalId,
                                  dia: v.dia,
                                  janelaInicio: v.janelaInicio,
                                  janelaFim: v.janelaFim,
                                },
                              });
                              return;
                            }
                            await converter({
                              data: {
                                filaId: f.id,
                                servicoId: v.servicoId!,
                                profissionalId: v.profissionalId!,
                                inicioIso: isoNoFusoDaBarbearia(v.dia!, v.hora!, opcoes.data!.fuso),
                              },
                            });
                          },
                          {
                            sucesso:
                              aberto.modo === "editar"
                                ? "Preferência atualizada."
                                : `${f.cliente} agendado pela lista de espera.`,
                            aoConcluir: async () => {
                              setAberto(null);
                              await refetch();
                            },
                          },
                        )
                      }
                    />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ))}

      {data && data.historico.length > 0 ? (
        <section className="mt-8">
          <h2 className="mb-2 px-1 text-[13px] font-semibold text-mute">Últimas ofertas</h2>
          <ul className="divide-y divide-line overflow-hidden rounded-[20px] bg-[var(--figaro-surface-container,var(--ink2))]">
            {data.historico.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="min-w-0">
                  <span className="block truncate text-sm text-paper">{o.cliente}</span>
                  <span className="block truncate text-[12.5px] text-mute">
                    {o.servico} · {horaCurta(o.inicio)} ·{" "}
                    {o.enviadaWhatsapp ? "WhatsApp" : "aviso interno"}
                  </span>
                </span>
                <StatusBadge
                  status={
                    o.status === "aceita"
                      ? "chegou"
                      : o.status === "enviada"
                        ? "pendente"
                        : "cancelado"
                  }
                  label={STATUS_OFERTA[o.status] ?? o.status}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="mt-6 px-1 text-xs text-mute2">
        Quando um horário vaga, a primeira pessoa compatível recebe a oferta e tem 30 minutos para
        confirmar. Sem resposta, ela segue para a próxima.
      </p>
    </Screen>
  );
}
