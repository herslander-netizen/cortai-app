import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { Screen, EmptyState } from "@/components/layout/Screen";
import { Carregando } from "@/components/layout/Carregando";
import { brl, dataHoraLonga, hora } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  listarAgendamentosConfirmados,
  type AgendamentoConfirmado,
} from "@/lib/agendamentos.functions";

export const Route = createFileRoute("/barbeiro/agendamentos")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Agendamentos confirmados — Painel do barbeiro | Cortaí" },
      { name: "description", content: "Todos os agendamentos confirmados com nome, WhatsApp e horário." },
      { property: "og:title", content: "Agendamentos confirmados — Cortaí" },
      { property: "og:description", content: "Nome, WhatsApp e horário de cada cliente confirmado." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AgendamentosPage,
});

const PERIODOS = [
  { chave: "proximos", rotulo: "Próximos" },
  { chave: "hoje", rotulo: "Hoje" },
  { chave: "passados", rotulo: "Anteriores" },
] as const;

type Periodo = (typeof PERIODOS)[number]["chave"];

function apenasDigitos(telefone: string) {
  const limpo = telefone.replace(/\D/g, "");
  return limpo.startsWith("55") ? limpo : `55${limpo}`;
}

function Cartao({ item }: { item: AgendamentoConfirmado }) {
  return (
    <li className="border-b border-line border-l-2 border-l-gold bg-ink2 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-paper">{item.clienteNome}</p>
          <p className="mt-0.5 text-xs text-mute">
            {[item.servico, item.profissional].filter(Boolean).join(" · ") || "Serviço não informado"}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm text-gold">{hora(item.inicio)}</p>
          <p className="text-[11px] text-mute2">{dataHoraLonga(item.inicio).split(" às")[0]}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        {item.telefone ? (
          <a
            href={`https://wa.me/${apenasDigitos(item.telefone)}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-paper underline decoration-line underline-offset-4"
          >
            {item.telefone}
          </a>
        ) : (
          <span className="text-xs text-mute2">Sem WhatsApp cadastrado</span>
        )}
        <span className="text-[11px] text-mute2">
          {item.valorCentavos ? brl(item.valorCentavos) : ""}
        </span>
      </div>
    </li>
  );
}

function AgendamentosPage() {
  const [periodo, setPeriodo] = useState<Periodo>("proximos");
  const { data, isLoading, isFetching, refetch } = useQuery<AgendamentoConfirmado[]>({
    queryKey: ["agendamentos-confirmados", periodo],
    queryFn: () => listarAgendamentosConfirmados({ data: { periodo } }),
    // A agenda de horários livres se mantém sozinha: recarrega a cada minuto.
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  return (
    <Screen
      voltarPara="/barbeiro/agenda"
      voltarRotulo="Agenda"
      title="Agendamentos confirmados"
      subtitle="Nome, WhatsApp e horário de cada cliente. Atualiza sozinho a cada minuto."
    >
      <div className="mb-4 grid grid-cols-3 gap-2" role="group" aria-label="Período">
        {PERIODOS.map((p) => (
          <Button variant="ghost"
            key={p.chave}
            type="button"
            onClick={() => setPeriodo(p.chave)}
            className={`rounded-lg border px-3 py-2 text-xs ${
              periodo === p.chave ? "border-gold/45 bg-gold-soft text-paper" : "border-line bg-ink2 text-mute"
            }`}
          >
            {p.rotulo}
          </Button>
        ))}
      </div>

      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs text-mute2">
          {isFetching ? "Atualizando…" : `${data?.length ?? 0} agendamento(s)`}
        </p>
        <Button variant="ghost" type="button" className="btn-tertiary text-xs" onClick={() => void refetch()}>
          Atualizar
        </Button>
      </div>

      {isLoading ? <Carregando /> : null}
      {!isLoading && (data?.length ?? 0) === 0 ? (
        <EmptyState text="Nenhum agendamento confirmado neste período." />
      ) : null}

      <ul className="space-y-3">
        {(data ?? []).map((item) => (
          <Cartao key={item.id} item={item} />
        ))}
      </ul>
    </Screen>
  );
}
