import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { AgendamentoManual } from "@/components/barbeiro/AgendamentoManual";
import { Screen } from "@/components/layout/Screen";
import { Aviso } from "@/components/ui/aviso";
import { EmptyState, SectionHeading } from "@/components/ui/section";
import { brl, dataHoraLonga, hora } from "@/lib/format";
import { cancelarAgendamentoPainel, remarcarAgendamentoPainel } from "@/lib/barbeiro.functions";
import { getPainelOperacional, type PainelOperacional } from "@/lib/ia.functions";
import { Button } from "@/components/ui/button";

function diaDeHoje() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function paraCampoLocal(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export const Route = createFileRoute("/barbeiro/painel-ia")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Painel do atendente — Cortaí" },
      { name: "description", content: "Resumo do dia, agenda, clientes e serviços que o atendente enxerga." },
      { property: "og:title", content: "Painel do atendente — Cortaí" },
      { property: "og:description", content: "Administre sua operação com os dados reais do Cortaí." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PainelIaPage,
});

const ABAS = ["Resumo", "Agenda", "Clientes", "Serviços"] as const;
type Aba = (typeof ABAS)[number];

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const ESTADOS: Record<PainelOperacional["estado"], { rotulo: string; cor: string }> = {
  conectado: { rotulo: "Conectado ao Cortaí", cor: "text-sage" },
  
  nao_configurado: { rotulo: "Ainda não configurado", cor: "text-gold" },
  sem_dados: { rotulo: "Sem dados cadastrados", cor: "text-gold" },
  erro: { rotulo: "Erro de autenticação", cor: "text-brick" },
};

function Cartao({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="surface p-4">
      <p className="text-xs uppercase tracking-wide text-mute2">{rotulo}</p>
      <p className="mt-1 text-lg font-semibold text-paper">{valor}</p>
    </div>
  );
}

function LinhaAgendamento({
  a,
  onMudou,
}: {
  a: PainelOperacional["hoje"][number];
  onMudou?: () => void;
}) {
  const remarcar = useServerFn(remarcarAgendamentoPainel);
  const cancelar = useServerFn(cancelarAgendamentoPainel);
  const [editando, setEditando] = useState(false);
  const [quando, setQuando] = useState(() => paraCampoLocal(a.inicio));
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const encerrado = a.status === "cancelado" || a.status === "finalizado" || a.status === "nao_compareceu" || a.status === "remarcado";

  return (
    <div className="border-b border-line py-3 last:border-b-0">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
        <span className="text-xs font-semibold text-paper">{hora(a.inicio)}</span>
        <span className="min-w-0">
          <span className="block truncate text-sm text-paper">{a.cliente?.nome ?? "Cliente"}</span>
          <span className="block truncate text-xs text-mute">
            {a.servico?.nome ?? "Serviço"}
            {a.profissional ? ` · ${a.profissional.nome}` : ""}
          </span>
        </span>
        <span className="text-right">
          <span className="block text-xs font-semibold text-paper">
            {brl(a.valorCentavos || (a.servico?.precoCentavos ?? 0))}
          </span>
          <span className="block text-xs text-mute2">{a.status}</span>
        </span>
      </div>

      {encerrado ? null : (
        <div className="mt-2 flex gap-2">
          <Button variant="ghost"
            type="button"
            className="btn-tertiary text-xs"
            onClick={() => {
              setErro(null);
              setEditando((v) => !v);
            }}
          >
            {editando ? "Fechar" : "Remarcar"}
          </Button>
          <Button variant="ghost"
            type="button"
            className="btn-tertiary text-xs text-brick"
            disabled={ocupado}
            onClick={async () => {
              if (!window.confirm("Cancelar este atendimento?")) return;
              setOcupado(true);
              setErro(null);
              try {
                await cancelar({ data: { agendamentoId: a.id } });
                onMudou?.();
              } catch (e) {
                setErro(e instanceof Error ? e.message : "Não foi possível cancelar.");
              }
              setOcupado(false);
            }}
          >
            Cancelar
          </Button>
        </div>
      )}

      {editando ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            type="datetime-local"
            value={quando}
            onChange={(e) => setQuando(e.target.value)}
            className="h-10 rounded-lg border border-line2 bg-ink2 px-3 text-xs text-paper outline-none"
          />
          <Button variant="ghost"
            type="button"
            className="btn-primary px-4 py-2 text-xs"
            disabled={ocupado}
            onClick={async () => {
              setOcupado(true);
              setErro(null);
              try {
                await remarcar({
                  data: { agendamentoId: a.id, novoInicio: new Date(quando).toISOString() },
                });
                setEditando(false);
                onMudou?.();
              } catch (e) {
                setErro(e instanceof Error ? e.message : "Não foi possível remarcar.");
              }
              setOcupado(false);
            }}
          >
            {ocupado ? "Salvando…" : "Confirmar novo horário"}
          </Button>
        </div>
      ) : null}

      {erro ? (
        <p className="mt-2 text-xs text-brick" role="alert">
          {erro}
        </p>
      ) : null}
    </div>
  );
}

function PainelIaPage() {
  const [aba, setAba] = useState<Aba>("Resumo");
  const [aviso, setAviso] = useState<string | null>(null);
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["painel-operacional-ia"],
    queryFn: () => getPainelOperacional() as Promise<PainelOperacional>,
    staleTime: 30_000,
  });
  const atualizar = (texto: string) => {
    setAviso(texto);
    void refetch();
  };

  return (
    <Screen
      title="Painel do atendente"
      subtitle="Sua operação com os dados reais do Cortaí, em um lugar só."
      voltarPara="/barbeiro/mais"
    >
      {isLoading ? <p className="text-sm text-mute">Carregando…</p> : null}
      {isError ? (
        <EmptyState
          title="Não foi possível carregar agora."
          description={error instanceof Error ? error.message : "Tente novamente em instantes."}
        />
      ) : null}

      {data ? (
        <div className="space-y-6">
          <section className="surface p-4">
            <p className={`text-sm font-semibold ${ESTADOS[data.estado].cor}`}>{ESTADOS[data.estado].rotulo}</p>
            <p className="mt-1 text-xs leading-relaxed text-mute">
              {data.motivo ??
                `${data.barbearia.nome} · última consulta do atendente: ${
                  data.ultimaSincronizacao ? dataHoraLonga(data.ultimaSincronizacao) : "ainda não houve"
                }`}
            </p>
            <p className="mt-2 text-xs text-mute2">
              WhatsApp: {data.whatsapp.status === "conectado" ? (data.whatsapp.numero ?? "conectado") : "não conectado"}
            </p>
            {data.estado === "nao_configurado" ? (
              <p className="mt-3 text-xs text-mute2">Atendimento inteligente externo em configuração.</p>
            ) : null}
          </section>

          <div className="flex gap-2 overflow-x-auto">
            {ABAS.map((item) => (
              <Button variant="ghost"
                key={item}
                type="button"
                onClick={() => setAba(item)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs ${
                  aba === item ? "border-gold text-gold" : "border-line2 text-mute"
                }`}
              >
                {item}
              </Button>
            ))}
          </div>

          {aba === "Resumo" ? (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <Cartao rotulo="Hoje" valor={String(data.resumo.agendamentosHoje)} />
                <Cartao rotulo="Concluídos" valor={String(data.resumo.concluidosHoje)} />
                <Cartao rotulo="Previsto hoje" valor={brl(data.resumo.previstoHojeCentavos)} />
                <Cartao rotulo="Próximos" valor={String(data.resumo.proximos)} />
                <Cartao rotulo="Clientes" valor={String(data.resumo.clientes)} />
                <Cartao rotulo="Serviços ativos" valor={String(data.resumo.servicos)} />
              </div>
              <section>
                <SectionHeading title="Horários de atendimento" description="Base usada para oferecer vagas." />
                <div className="mt-3 surface px-4">
                  {data.horarios.length === 0 ? (
                    <p className="py-4 text-xs text-mute">Nenhum horário cadastrado.</p>
                  ) : (
                    data.horarios.map((h) => (
                      <div
                        key={h.diaSemana}
                        className="flex items-center justify-between border-b border-line py-2.5 text-xs last:border-b-0"
                      >
                        <span className="text-mute">{DIAS[h.diaSemana]}</span>
                        <span className="text-paper">{h.fechado ? "Fechado" : `${h.abre} às ${h.fecha}`}</span>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          ) : null}

          {aba === "Agenda" ? (
            <div className="space-y-6">
              {aviso ? <Aviso tom="sucesso">{aviso}</Aviso> : null}
              <AgendamentoManual
                dia={diaDeHoje()}
                rotulo="Novo agendamento"
                onCriado={() => atualizar("Agendamento criado e já aparece na agenda.")}
              />
              <section>
                <SectionHeading title="Atendimentos de hoje" />
                <div className="mt-3 surface px-4">
                  {data.hoje.length === 0 ? (
                    <p className="py-4 text-xs text-mute">Nenhum atendimento hoje.</p>
                  ) : (
                    data.hoje.map((a) => (
                      <LinhaAgendamento
                        key={a.id}
                        a={a}
                        onMudou={() => atualizar("Agenda atualizada.")}
                      />
                    ))
                  )}
                </div>
              </section>
              <section>
                <SectionHeading title="Próximos atendimentos" />
                <div className="mt-3 surface px-4">
                  {data.proximos.length === 0 ? (
                    <p className="py-4 text-xs text-mute">Nada marcado para os próximos dias.</p>
                  ) : (
                    data.proximos.map((a) => (
                      <div key={a.id} className="border-b border-line py-3 last:border-b-0">
                        <p className="text-xs text-mute2">{dataHoraLonga(a.inicio)}</p>
                        <LinhaAgendamento a={a} onMudou={() => atualizar("Agenda atualizada.")} />
                      </div>
                    ))
                  )}
                </div>
              </section>
              <section>
                <SectionHeading title="Profissionais" />
                <div className="mt-3 surface px-4">
                  {data.profissionais.length === 0 ? (
                    <p className="py-4 text-xs text-mute">Nenhum profissional cadastrado.</p>
                  ) : (
                    data.profissionais.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between border-b border-line py-2.5 text-xs last:border-b-0"
                      >
                        <span className="text-paper">{p.nome}</span>
                        <span className={p.ativo ? "text-sage" : "text-mute2"}>{p.ativo ? "Ativo" : "Inativo"}</span>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          ) : null}

          {aba === "Clientes" ? (
            <section>
              <SectionHeading title="Clientes" description="Toque para abrir a ficha completa." />
              <div className="mt-3 surface px-4">
                {data.clientes.length === 0 ? (
                  <p className="py-4 text-xs text-mute">Nenhum cliente cadastrado ainda.</p>
                ) : (
                  data.clientes.map((c) => (
                    <Link
                      key={c.id}
                      to="/barbeiro/clientes/$id"
                      params={{ id: c.id }}
                      className="flex items-center justify-between gap-3 border-b border-line py-3 last:border-b-0"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm text-paper">{c.nome}</span>
                        <span className="block truncate text-xs text-mute">{c.telefone ?? "sem telefone"}</span>
                      </span>
                      <span className="shrink-0 text-right text-xs text-mute2">
                        {c.visitas} visita{c.visitas === 1 ? "" : "s"}
                        {c.ultimaVisita ? ` · ${dataHoraLonga(c.ultimaVisita)}` : ""}
                      </span>
                    </Link>
                  ))
                )}
              </div>
            </section>
          ) : null}

          {aba === "Serviços" ? (
            <section>
              <SectionHeading title="Serviços" description="Preços e durações usados pelo atendente." />
              <div className="mt-3 surface px-4">
                {data.servicos.length === 0 ? (
                  <p className="py-4 text-xs text-mute">Nenhum serviço cadastrado.</p>
                ) : (
                  data.servicos.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between gap-3 border-b border-line py-3 last:border-b-0"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm text-paper">{s.nome}</span>
                        <span className="block text-xs text-mute">
                          {s.duracaoMin} min{s.ativo ? "" : " · inativo"}
                        </span>
                      </span>
                      <span className="text-sm font-semibold text-paper">{brl(s.precoCentavos)}</span>
                    </div>
                  ))
                )}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}
    </Screen>
  );
}
