import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { Screen, EmptyState } from "@/components/layout/Screen";
import { EsqueletoAgenda } from "@/components/layout/Esqueleto";
import { brl, dataHoraLonga, hora } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  listarAgendamentosConfirmados,
  type AgendamentoConfirmado,
} from "@/lib/agendamentos.functions";
import { OpcoesConectadas } from "@/components/ui/opcoes-conectadas";

export const Route = createFileRoute("/barbeiro/agendamentos")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Agendamentos confirmados — Painel do negócio | Flow" },
      {
        name: "description",
        content: "Todos os agendamentos confirmados com nome, WhatsApp e horário.",
      },
      { property: "og:title", content: "Agendamentos confirmados — Flow" },
      {
        property: "og:description",
        content: "Nome, WhatsApp e horário de cada cliente confirmado.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
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
            {[item.servico, item.profissional].filter(Boolean).join(" · ") ||
              "Serviço não informado"}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm text-gold">{hora(item.inicio)}</p>
          <p className="text-xs text-mute2">{dataHoraLonga(item.inicio).split(" às")[0]}</p>
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
        <span className="text-xs text-mute2">
          {item.valorCentavos ? brl(item.valorCentavos) : ""}
        </span>
      </div>
    </li>
  );
}

function AgendamentosPage() {
  const [periodo, setPeriodo] = useState<Periodo>("proximos");
  const { data, isLoading, isFetching, isError, refetch } = useQuery<AgendamentoConfirmado[]>({
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
      <OpcoesConectadas
        rotulo="Período"
        className="mb-4"
        valor={periodo}
        opcoes={PERIODOS.map((p) => ({ valor: p.chave, texto: p.rotulo }))}
        onChange={setPeriodo}
      />

      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs text-mute2">
          {isFetching ? "Atualizando…" : `${data?.length ?? 0} agendamento(s)`}
        </p>
        <Button
          variant="ghost"
          type="button"
          className="min-h-12 px-3 text-xs"
          onClick={() => void refetch()}
        >
          Atualizar
        </Button>
      </div>

      {isLoading ? <EsqueletoAgenda linhas={5} onTentarDeNovo={() => void refetch()} /> : null}
      {isError ? (
        <div className="surface p-5" role="alert">
          <p className="text-sm text-paper">Não conseguimos carregar os agendamentos agora.</p>
          <Button variant="outline" className="mt-4" onClick={() => void refetch()}>
            Tentar de novo
          </Button>
        </div>
      ) : null}
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
