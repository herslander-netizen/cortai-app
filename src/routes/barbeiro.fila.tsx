import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";

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
  type FilaItem,
} from "@/lib/barbeiro.functions";
import { EsqueletoFormulario, EsqueletoLista } from "@/components/layout/Esqueleto";
import { aviso, comDesfazer } from "@/lib/avisos";
import { ItemCascata } from "@/components/layout/ItemCascata";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InterruptorListaDeEspera } from "@/components/barbeiro/InterruptorListaDeEspera";
import { StatusBadge } from "@/components/ui/badge";
import { exigirCapacidade } from "@/lib/guarda-capacidade";
import { isoNoFusoDaBarbearia } from "@/lib/horarios";

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

const PERIODOS = [
  { rotulo: "Qualquer horário", inicio: null, fim: null },
  { rotulo: "Manhã", inicio: 9, fim: 12 },
  { rotulo: "Tarde", inicio: 13, fim: 18 },
  { rotulo: "Fim de tarde", inicio: 18, fim: 20 },
] as const;

const STATUS_OFERTA: Record<string, string> = {
  enviada: "Aguardando resposta",
  aceita: "Confirmou",
  recusada: "Recusou",
  expirada: "Expirou",
  cancelada: "Vaga preenchida",
};

function periodoTexto(f: Pick<FilaItem, "janelaInicio" | "janelaFim" | "dia">) {
  const dia = f.dia ? f.dia.split("-").reverse().slice(0, 2).join("/") : null;
  const p = PERIODOS.find((x) => x.inicio === f.janelaInicio && x.fim === f.janelaFim);
  const faixa =
    f.janelaInicio === null || f.janelaFim === null
      ? "qualquer horário"
      : (p?.rotulo.toLowerCase() ?? `${f.janelaInicio}h–${f.janelaFim}h`);
  return dia ? `${dia} · ${faixa}` : `Qualquer dia · ${faixa}`;
}

function horaCurta(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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

  const total = data?.itens.length ?? 0;

  return (
    <Screen
      voltarPara="/barbeiro/mais"
      title="Lista de espera"
      subtitle="Vaga liberada é oferecida automaticamente a quem combina."
    >
      <InterruptorListaDeEspera />

      {isLoading ? <EsqueletoLista linhas={4} onTentarDeNovo={() => void refetch()} /> : null}

      {data ? (
        <Card>
          <p className="text-2xl font-bold text-paper">
            {total === 0
              ? "Ninguém na lista de espera"
              : `${total} ${total === 1 ? "cliente na lista de espera" : "clientes na lista de espera"}`}
          </p>
          <p className="mt-2 text-xs text-mute">
            Recuperado neste mês pela lista:{" "}
            <span className="money-value text-paper">{brl(data.recuperadoCentavos)}</span> ·{" "}
            {data.recuperadosMes} {data.recuperadosMes === 1 ? "atendimento" : "atendimentos"}
          </p>
        </Card>
      ) : null}

      {data && total === 0 ? (
        <EmptyState text="Quando a agenda lotar, seus clientes podem entrar na lista de espera pelo link de agendamento." />
      ) : null}
      <ul className="mt-4 space-y-2">
        {(data?.itens ?? []).map((f, i) => (
          <ItemCascata key={f.id} indice={i} className="rounded-[12px] bg-[var(--figaro-surface-container,var(--ink2))] p-4">
            <div className="flex items-start gap-3">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground"
                aria-label={`Posição ${f.posicao}`}
              >
                {f.posicao}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-paper">{f.cliente}</p>
                <p className="mt-0.5 text-xs text-mute">
                  {f.servico ?? "Serviço a combinar"}
                  {f.profissional ? ` · ${f.profissional}` : ""}
                </p>
                <p className="text-xs text-mute">{periodoTexto(f)}</p>
                <StatusBadge
                  className="mt-1"
                  status={f.ofertaAtiva ? "chegou" : "pendente"}
                  label={
                    f.ofertaAtiva
                      ? `Vaga oferecida: ${horaCurta(f.ofertaAtiva.inicio)}`
                      : "Aguardando vaga"
                  }
                />
              </div>
              <div className="flex flex-col">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Subir na lista"
                  disabled={acao.ocupado || i === 0}
                  onClick={() =>
                    acao.executar(
                      `sobe-${f.id}`,
                      () => mover({ data: { filaId: f.id, direcao: "subir" } }),
                      {
                        aoConcluir: async () => {
                          await refetch();
                        },
                      },
                    )
                  }
                >
                  <ArrowUp size={16} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Descer na lista"
                  disabled={acao.ocupado || i === total - 1}
                  onClick={() =>
                    acao.executar(
                      `desce-${f.id}`,
                      () => mover({ data: { filaId: f.id, direcao: "descer" } }),
                      {
                        aoConcluir: async () => {
                          await refetch();
                        },
                      },
                    )
                  }
                >
                  <ArrowDown size={16} />
                </Button>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 pl-12">
              <Button
                type="button"
                size="sm"
                onClick={() => setAberto({ id: f.id, modo: "agendar" })}
              >
                Agendar
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setAberto({ id: f.id, modo: "editar" })}
              >
                Editar
              </Button>
              <Button
                type="button"
                size="sm"
                variant="text"
                className="text-brick"
                disabled={acao.ocupado}
                onClick={() => removerComDesfazer(f.id, f.cliente)}
              >
                Remover
              </Button>
            </div>
            {aberto?.id === f.id ? (
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
            ) : null}
          </ItemCascata>
        ))}
      </ul>

      {data && data.historico.length > 0 ? (
        <>
          <h2 className="mb-1 mt-8 text-sm font-semibold text-paper">Histórico de ofertas</h2>
          <ul className="space-y-2">
            {data.historico.map((o) => (
              <li
                key={o.id}
                className="flex items-center justify-between gap-3 rounded-[12px] bg-[var(--figaro-surface-container,var(--ink2))] px-4 py-3 text-xs"
              >
                <span className="min-w-0">
                  <span className="block text-sm text-paper">{o.cliente}</span>
                  <span className="text-mute">
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
        </>
      ) : null}

      <p className="mt-6 text-xs text-mute2">
        Quando um horário é cancelado, o primeiro cliente compatível recebe a vaga e tem 30 minutos
        para confirmar. Sem resposta, ela segue para o próximo.
      </p>
    </Screen>
  );
}

type Valores = {
  servicoId: string | null;
  profissionalId: string | null;
  dia: string | null;
  hora: string | null;
  janelaInicio: number | null;
  janelaFim: number | null;
};

function FormularioFila({
  item,
  modo,
  opcoes,
  ocupado,
  onCancelar,
  onSalvar,
}: {
  item: FilaItem;
  modo: "editar" | "agendar";
  opcoes: Awaited<ReturnType<typeof getOpcoesDaFila>> | undefined;
  ocupado: boolean;
  onCancelar: () => void;
  onSalvar: (v: Valores) => void;
}) {
  const [v, setV] = useState<Valores>({
    servicoId: item.servicoId,
    profissionalId: item.profissionalId,
    dia: item.dia,
    hora: null,
    janelaInicio: item.janelaInicio,
    janelaFim: item.janelaFim,
  });
  const agendar = modo === "agendar";
  const valido = !agendar || Boolean(v.servicoId && v.profissionalId && v.dia && v.hora);
  if (!opcoes) return <EsqueletoFormulario campos={3} />;
  return (
    <div className="mt-3 space-y-3 rounded-lg border border-line p-3 sm:ml-12">
      <label className="block text-xs text-mute2">
        Serviço
        <select
          className="field-control mt-1 w-full"
          value={v.servicoId ?? ""}
          onChange={(e) => setV({ ...v, servicoId: e.target.value || null })}
        >
          <option value="">{agendar ? "Escolha" : "A combinar"}</option>
          {opcoes.servicos.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nome} · {s.duracao_min} min
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs text-mute2">
        Profissional
        <select
          className="field-control mt-1 w-full"
          value={v.profissionalId ?? ""}
          onChange={(e) => setV({ ...v, profissionalId: e.target.value || null })}
        >
          <option value="">{agendar ? "Escolha" : "Qualquer"}</option>
          {opcoes.profissionais.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs text-mute2">
          Data
          <input
            type="date"
            className="field-control mt-1 w-full"
            value={v.dia ?? ""}
            onChange={(e) => setV({ ...v, dia: e.target.value || null })}
          />
        </label>
        {agendar ? (
          <label className="block text-xs text-mute2">
            Horário
            <input
              type="time"
              className="field-control mt-1 w-full"
              value={v.hora ?? ""}
              onChange={(e) => setV({ ...v, hora: e.target.value || null })}
            />
          </label>
        ) : (
          <label className="block text-xs text-mute2">
            Período
            <select
              className="field-control mt-1 w-full"
              value={PERIODOS.findIndex(
                (p) => p.inicio === v.janelaInicio && p.fim === v.janelaFim,
              )}
              onChange={(e) => {
                const p = PERIODOS[Number(e.target.value)] ?? PERIODOS[0];
                setV({ ...v, janelaInicio: p.inicio, janelaFim: p.fim });
              }}
            >
              {PERIODOS.map((p, i) => (
                <option key={p.rotulo} value={i}>
                  {p.rotulo}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="flex gap-2">
        <Button type="button" size="sm" disabled={ocupado || !valido} onClick={() => onSalvar(v)}>
          {agendar ? "Confirmar agendamento" : "Salvar"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
