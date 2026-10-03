import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { AgendaTimeline } from "@/components/barbeiro/AgendaTimeline";
import { Button } from "@/components/ui/button";
import type { AgendaItem } from "@/lib/barbeiro.functions";

export const Route = createFileRoute("/agenda-audit-temp")({
  head: () => ({
    meta: [
      { title: "Auditoria temporária da Agenda — Cortaí" },
      { name: "description", content: "Validação visual temporária da Agenda Cortaí." },
      { property: "og:title", content: "Auditoria temporária da Agenda — Cortaí" },
      { property: "og:description", content: "Validação visual temporária da Agenda Cortaí." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AgendaAuditTemp,
});

const DIA = "2026-10-03";
const FUSO = "America/Sao_Paulo";
const h = (hora: string) => new Date(`${DIA}T${hora}:00-03:00`).toISOString();

const DADOS: AgendaItem[] = [
  { id: "finalizado", inicio: h("08:00"), fim: h("08:45"), cliente: "Cliente concluído", clienteId: null, telefone: null, profissionalId: "a", profissional: "João Pedro", servico: "Atendimento concluído", duracaoMin: 45, valor_centavos: 5000, forma_pagamento: null, ficha: null, arrivedAt: h("07:55"), startedAt: h("08:00"), finishedAt: h("08:42"), status: "finalizado" },
  { id: "cancelado", inicio: h("10:00"), fim: h("10:45"), cliente: "Cliente cancelado", clienteId: null, telefone: null, profissionalId: "b", profissional: "Lucas Almeida", servico: "Atendimento cancelado", duracaoMin: 45, valor_centavos: 5000, forma_pagamento: null, ficha: null, arrivedAt: null, startedAt: null, finishedAt: null, status: "cancelado" },
  { id: "agora", inicio: h("21:45"), fim: h("22:45"), cliente: "Cliente atual", clienteId: null, telefone: null, profissionalId: "a", profissional: "João Pedro", servico: "Atendimento em andamento", duracaoMin: 60, valor_centavos: 7000, forma_pagamento: null, ficha: null, arrivedAt: h("21:40"), startedAt: h("21:45"), finishedAt: null, status: "na_cadeira" },
  { id: "futuro", inicio: h("23:00"), fim: h("23:45"), cliente: "Cliente futuro", clienteId: null, telefone: null, profissionalId: "b", profissional: "Lucas Almeida", servico: "Atendimento agendado", duracaoMin: 45, valor_centavos: 6000, forma_pagamento: null, ficha: null, arrivedAt: null, startedAt: null, finishedAt: null, status: "agendado" },
];

function AgendaAuditTemp() {
  const [profissional, setProfissional] = useState<string | null>(null);
  const itens = useMemo(
    () => DADOS.filter((item) => !profissional || item.profissionalId === profissional),
    [profissional],
  );
  return (
    <main className="mx-auto w-full max-w-3xl px-3 py-4">
      <div className="mb-3 flex gap-2" aria-label="Profissionais">
        <Button variant={profissional === null ? "default" : "outline"} onClick={() => setProfissional(null)}>Todos</Button>
        <Button variant={profissional === "a" ? "default" : "outline"} onClick={() => setProfissional("a")}>João Pedro</Button>
        <Button variant={profissional === "b" ? "default" : "outline"} onClick={() => setProfissional("b")}>Lucas Almeida</Button>
      </div>
      <AgendaTimeline
        dia={DIA}
        fuso={FUSO}
        agora={new Date(h("22:20")).getTime()}
        itens={itens}
        itensEscala={DADOS}
        horarios={[{ diaSemana: 6, fechado: false, abre: "08:00", fecha: "23:59" }]}
        selecionado={null}
        onSelecionar={() => undefined}
        mostrarProfissional={!profissional}
        diaCompleto
      />
    </main>
  );
}