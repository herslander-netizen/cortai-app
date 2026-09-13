import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { Screen, EmptyState } from "@/components/layout/Screen";
import { Carregando } from "@/components/layout/Carregando";
import { getAuditoriaBarbearia } from "@/lib/equipe.functions";

export const Route = createFileRoute("/barbeiro/auditoria")({
  head: () => ({ meta: [
    { title: "Auditoria — Cortaí Gestão" },
    { name: "description", content: "Histórico das ações críticas feitas na sua barbearia." },
    { property: "og:title", content: "Auditoria — Cortaí Gestão" },
    { property: "og:description", content: "Quem fez o quê e quando na sua barbearia." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: AuditoriaPage,
});

const ROTULOS: Record<string, string> = {
  ativou_recurso: "Ativou um recurso",
  desativou_recurso: "Desligou um recurso",
  alterou_membro_equipe: "Alterou acesso de alguém",
  removeu_membro_equipe: "Removeu acesso de alguém",
  confirmou_pagamento: "Confirmou pagamento",
};

function AuditoriaPage() {
  const query = useQuery({ queryKey: ["auditoria-barbearia"], queryFn: () => getAuditoriaBarbearia(), retry: false });

  if (query.isLoading) return <Screen title="Auditoria"><Carregando texto="Carregando histórico…" /></Screen>;
  if (query.isError) {
    return <Screen title="Auditoria" subtitle="Histórico de ações críticas." voltarPara="/barbeiro/mais">
      <p className="rounded-xl border border-line bg-ink2 p-5 text-sm text-mute">{query.error instanceof Error ? query.error.message : "Acesso não disponível."}</p>
    </Screen>;
  }

  const itens = query.data ?? [];
  return (
    <Screen title="Auditoria" subtitle="As últimas ações importantes da sua barbearia." voltarPara="/barbeiro/mais">
      {itens.length === 0 ? <EmptyState text="Nada registrado por enquanto." /> : (
        <ul className="divide-y divide-line">
          {itens.map((item: any) => (
            <li key={item.id} className="py-3.5">
              <p className="text-sm font-semibold text-paper">{ROTULOS[item.acao] ?? item.acao}</p>
              <p className="mt-0.5 truncate text-xs text-mute">{item.alvo}</p>
              <p className="mt-0.5 text-[11px] text-mute2">{new Date(item.criado_em).toLocaleString("pt-BR")}</p>
            </li>
          ))}
        </ul>
      )}
    </Screen>
  );
}
