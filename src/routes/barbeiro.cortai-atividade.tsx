import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { Screen, EmptyState } from "@/components/layout/Screen";
import { EsqueletoPainel } from "@/components/layout/Esqueleto";
import { Button } from "@/components/ui/button";
import { PainelDeLembretes } from "@/components/notificacoes/PainelDeLembretes";
import {
  getAtividadeDoCortai,
  getMetricasDoCortai,
  getTermosNaoEntendidos,
  type AtividadeDoCortai,
  type MetricasDoCortai,
  type TermoNaoEntendido,
} from "@/lib/whatsapp.functions";
import { Chip } from "@/components/ui/chip";

export const Route = createFileRoute("/barbeiro/cortai-atividade")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Atividade da Flow IA — Flow" },
      {
        name: "description",
        content:
          "Acompanhe o que a Flow IA entendeu, o que consultou no seu negócio e o que não deu certo.",
      },
      { property: "og:title", content: "Atividade da Flow IA — Flow" },
      {
        property: "og:description",
        content: "Conversas, assuntos, consultas e falhas do atendimento inteligente.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AtividadePage,
});

/** Nomes técnicos das ferramentas traduzidos para a linguagem da barbearia. */
const NOME_DA_ACAO: Record<string, string> = {
  consultar_barbearia: "Dados do negócio",
  listar_servicos: "Lista de serviços",
  listar_profissionais: "Lista de profissionais",
  consultar_disponibilidade: "Horários livres",
  consultar_servico: "Detalhe de um serviço",
  consultar_horarios: "Horário de funcionamento",
  consultar_informacoes: "Perguntas frequentes",
  historico_do_cliente: "Histórico do cliente",
  salvar_preferencia_do_cliente: "Preferência do cliente",
  confirmar_agendamento: "Confirmação de agendamento",
  consultar_cliente: "Busca de cliente",
  registrar_cliente: "Cadastro de cliente",
  listar_agendamentos_do_cliente: "Agendamentos do cliente",
  criar_agendamento: "Novo agendamento",
  remarcar_agendamento: "Remarcação",
  cancelar_agendamento: "Cancelamento",
  encaminhar_para_humano: "Encaminhado para a equipe",
};

const NOME_DA_INTENCAO: Record<string, string> = {
  agendar: "Quer agendar",
  cancelar: "Quer cancelar",
  remarcar: "Quer remarcar",
  preco: "Pergunta de preço",
  horario: "Pergunta de horário",
  duvida: "Dúvida geral",
  humano: "Pediu atendimento humano",
  saudacao: "Saudação",
};

function rotuloDaAcao(acao: string) {
  return NOME_DA_ACAO[acao] ?? acao.replace(/_/g, " ");
}

function rotuloDaIntencao(intencao: string) {
  return NOME_DA_INTENCAO[intencao] ?? intencao.replace(/_/g, " ");
}

function quando(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Cartao({ rotulo, valor, alerta }: { rotulo: string; valor: number; alerta?: boolean }) {
  return (
    <div className="surface px-3 py-3">
      <p className="text-xs text-mute2">{rotulo}</p>
      <p className={`mt-1 text-lg ${alerta && valor > 0 ? "text-brick" : "text-paper"}`}>{valor}</p>
    </div>
  );
}

function AtividadePage() {
  const [apenasFalhas, setApenasFalhas] = useState(false);

  const metricas = useQuery({
    queryKey: ["cortai-metricas"],
    queryFn: () => getMetricasDoCortai() as Promise<MetricasDoCortai>,
  });
  const atividade = useQuery({
    queryKey: ["cortai-atividade", apenasFalhas],
    queryFn: () => getAtividadeDoCortai({ data: { apenasFalhas } }) as Promise<AtividadeDoCortai>,
  });
  const termos = useQuery({
    queryKey: ["cortai-termos"],
    queryFn: () => getTermosNaoEntendidos() as Promise<TermoNaoEntendido[]>,
  });

  return (
    <Screen
      voltarPara="/barbeiro/cortai"
      title="Atividade da Flow IA"
      subtitle="O que ele entendeu, o que consultou no seu negócio e o que não deu certo — nos últimos 30 dias."
    >
      {metricas.isLoading || atividade.isLoading ? <EsqueletoPainel /> : null}
      {metricas.isError || atividade.isError ? (
        <p className="rounded-[28px] bg-[var(--figaro-surface-container,var(--ink2))] px-5 py-8 text-center text-sm text-brick">
          Não conseguimos carregar a atividade agora. Tente de novo em instantes.
        </p>
      ) : null}

      {metricas.data ? (
        <section className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Resumo do período">
          <Cartao rotulo="Conversas" valor={metricas.data.conversas} />
          <Cartao rotulo="Agendamentos" valor={metricas.data.agendamentosPelaIa} />
          <Cartao rotulo="Para a equipe" valor={metricas.data.encaminhamentos} />
          <Cartao rotulo="Falhas" valor={metricas.data.falhas} alerta />
        </section>
      ) : null}

      {metricas.data && metricas.data.assuntos.length > 0 ? (
        <section className="mt-5" aria-label="Assuntos mais comuns">
          <h2 className="text-sm text-paper">Assuntos mais comuns</h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {metricas.data.assuntos.map((a) => (
              <li
                key={a.intencao}
                className="rounded-full bg-[var(--figaro-surface-container,var(--ink2))] px-3 py-1.5 text-xs text-mute"
              >
                {rotuloDaIntencao(a.intencao)} · {a.total}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {atividade.data && atividade.data.ferramentas.length > 0 ? (
        <section className="mt-5" aria-label="Consultas feitas pela Flow IA">
          <h2 className="text-sm text-paper">O que a Flow IA consultou</h2>
          <ul className="mt-2 space-y-2">
            {atividade.data.ferramentas.map((f) => (
              <li key={f.acao} className="flex items-center justify-between gap-3 rounded-[12px] bg-[var(--figaro-surface-container,var(--ink2))] px-4 py-3">
                <span className="text-xs text-paper">{rotuloDaAcao(f.acao)}</span>
                <span className="shrink-0 text-xs text-mute">
                  {f.total}
                  {f.falhas > 0 ? (
                    <span className="text-brick"> · {f.falhas} com falha</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {termos.data && termos.data.length > 0 ? (
        <section className="mt-5" aria-label="Palavras que a Flow IA não entendeu">
          <h2 className="text-sm text-paper">
            Palavras que os clientes usam e a Flow IA não entendeu
          </h2>
          <p className="mt-1 text-xs text-mute2">
            Cadastre estes pedidos como serviço ou pergunta frequente para a Flow IA passar a
            responder sozinho.
          </p>
          <ul className="mt-2 space-y-2">
            {termos.data.map((t) => (
              <li key={t.texto} className="flex items-center justify-between gap-3 rounded-[12px] bg-[var(--figaro-surface-container,var(--ink2))] px-4 py-3">
                <span className="min-w-0 truncate text-xs text-paper">“{t.texto}”</span>
                <span className="shrink-0 text-xs text-mute">{t.total}x</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-5" aria-label="Registro das ações">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm text-paper">Registro das ações</h2>
          <Chip selecionado={apenasFalhas} onClick={() => setApenasFalhas((v) => !v)}>
            Só o que falhou
          </Chip>
        </div>

        {atividade.data && atividade.data.registros.length === 0 ? (
        <EmptyState text="Quando a Flow IA atender, o registro aparece nesta lista." />
        ) : null}

        <ul className="mt-3 space-y-2">
          {(atividade.data?.registros ?? []).map((r) => (
            <li key={r.id} className="rounded-[12px] bg-[var(--figaro-surface-container,var(--ink2))] px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-xs text-paper">
                    {r.sucesso ? (
                      <CheckCircle2 aria-hidden className="h-3.5 w-3.5 text-sage" />
                    ) : (
                      <AlertTriangle aria-hidden className="h-3.5 w-3.5 text-brick" />
                    )}
                    {rotuloDaAcao(r.acao)}
                  </p>
                  <p className="mt-1 truncate text-xs text-mute">
                    {r.nomeDoCliente ?? r.telefone ?? "Cliente sem cadastro"}
                    {r.intencao ? ` · ${rotuloDaIntencao(r.intencao)}` : ""}
                  </p>
                  {r.erro ? <p className="mt-1 text-xs text-brick">{r.erro}</p> : null}
                </div>
                <span className="shrink-0 text-xs text-mute2">{quando(r.criadoEm)}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <PainelDeLembretes />
    </Screen>
  );
}
