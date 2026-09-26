import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Bot, ShieldCheck } from "lucide-react";

import { Screen } from "@/components/layout/Screen";
import { Carregando } from "@/components/layout/Carregando";
import { PainelDeSincronizacao } from "@/components/ia/PainelDeSincronizacao";
import { STATUS_DA_INTEGRACAO, type StatusDaIntegracao } from "@/lib/ia/contrato";
import type { PainelDeIntegracao } from "@/lib/ia.functions";
import { conectarAlvoIA, desconectarAlvoIA, getIntegracaoDeIA, salvarAgenteDeIA } from "@/lib/ia.functions";
import { Button } from "@/components/ui/button";

// Integração ALVO IA em configuração (credenciais ausentes): quem abrir o
// endereço antigo volta ao menu em vez de cair numa tela que não conecta.
export const Route = createFileRoute("/barbeiro/integracoes")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/barbeiro/mais" });
  },
  head: () => ({
    meta: [
      { title: "Integrações — Cortaí Gestão" },
      {
        name: "description",
        content: "Conecte a sua barbearia ao atendimento inteligente da ALVO e escolha o nome do atendente.",
      },
      { property: "og:title", content: "Integrações — Cortaí Gestão" },
      { property: "og:description", content: "Atendimento inteligente ligado à sua barbearia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: IntegracoesPage,
});

const CORES: Record<StatusDaIntegracao, string> = {
  desconectado: "text-mute",
  pendente: "text-gold",
  conectado: "text-sage",
  erro: "text-brick",
  suspenso: "text-brick",
};

function IntegracoesPage() {
  const cliente = useQueryClient();
  const salvar = useServerFn(salvarAgenteDeIA);
  const conectar = useServerFn(conectarAlvoIA);
  const desconectar = useServerFn(desconectarAlvoIA);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["integracao-ia"],
    queryFn: () => getIntegracaoDeIA() as Promise<PainelDeIntegracao>,
  });

  const [nome, setNome] = useState("");
  const [tom, setTom] = useState("");
  const [saudacao, setSaudacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [chave, setChave] = useState<{ token: string; url: string } | null>(null);

  useEffect(() => {
    if (!data) return;
    setNome(data.integracao.agentName ?? "");
    setTom(data.integracao.agentPersona.tom ?? "");
    setSaudacao(data.integracao.agentPersona.saudacao ?? "");
  }, [data]);

  const salvarAgente = useMutation({
    mutationFn: () =>
      salvar({
        data: {
          agentName: nome.trim(),
          persona: { ...(tom.trim() ? { tom: tom.trim() } : {}), ...(saudacao.trim() ? { saudacao: saudacao.trim() } : {}) },
        },
      }),
    onSuccess: () => {
      setOk(true);
      setErro(null);
      void cliente.invalidateQueries({ queryKey: ["integracao-ia"] });
    },
    onError: (e: unknown) => setErro(e instanceof Error ? e.message : "Não foi possível salvar agora."),
  });

  const pedirConexao = useMutation({
    mutationFn: () => conectar({ data: undefined }),
    onSuccess: (r: { token: string; url: string; aviso: string | null }) => {
      setChave({ token: r.token, url: r.url });
      setErro(r.aviso);
      void refetch();
    },
    onError: (e: unknown) => setErro(e instanceof Error ? e.message : "Não foi possível conectar agora."),
  });

  const desligar = useMutation({
    mutationFn: () => desconectar({ data: undefined }),
    onSuccess: () => {
      setChave(null);
      setErro(null);
      void refetch();
    },
    onError: (e: unknown) => setErro(e instanceof Error ? e.message : "Não foi possível desligar agora."),
  });

  const status: StatusDaIntegracao = data?.integracao.status ?? "desconectado";

  return (
    <Screen
      voltarPara="/barbeiro/mais"
      title="Integrações"
      subtitle="Serviços que trabalham junto com a sua barbearia."
    >
      {isLoading ? <Carregando /> : null}
      {isError ? (
        <p className="border-y border-line py-8 text-center text-sm text-brick">
          Não conseguimos carregar as integrações agora. Tente de novo em instantes.
        </p>
      ) : null}

      {data ? <PainelDeSincronizacao /> : null}

      {data ? (
        <section className="mt-5 surface p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ink text-gold">
              <Bot size={18} />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-paper">ALVO IA</h2>
              <p className="mt-1 text-xs text-mute">
                A camada de atendimento inteligente da ALVO. Ela conversa com o cliente usando o nome que você
                escolher e agenda pelas regras da sua barbearia.
              </p>
            </div>
          </div>

          <dl className="mt-5 space-y-3 border-t border-line pt-4 text-xs">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-mute">Estado</dt>
              <dd className={`font-semibold ${CORES[status]}`}>{STATUS_DA_INTEGRACAO[status]}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-mute">Nome do atendente</dt>
              <dd className="truncate text-paper">{data.integracao.agentName ?? "Ainda não escolhido"}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-mute">Identificador externo</dt>
              <dd className="truncate text-paper">{data.integracao.externalTenantId ?? "—"}</dd>
            </div>
            {data.integracao.ultimoErro ? (
              <div className="flex items-start justify-between gap-4">
                <dt className="text-mute">Último aviso</dt>
                <dd className="text-right text-brick">{data.integracao.ultimoErro}</dd>
              </div>
            ) : null}
          </dl>

          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="text-xs text-mute">Nome do atendente</span>
              <input
                value={nome}
                onChange={(e) => {
                  setNome(e.target.value);
                  setOk(false);
                }}
                placeholder="Beto, Zeca, Ana…"
                className="mt-1 w-full rounded-md border border-line2 bg-ink px-3 py-2.5 text-sm text-paper"
              />
            </label>
            <label className="block">
              <span className="text-xs text-mute">Jeito de falar</span>
              <input
                value={tom}
                onChange={(e) => {
                  setTom(e.target.value);
                  setOk(false);
                }}
                placeholder="direto e simpático"
                className="mt-1 w-full rounded-md border border-line2 bg-ink px-3 py-2.5 text-sm text-paper"
              />
            </label>
            <label className="block">
              <span className="text-xs text-mute">Primeira mensagem</span>
              <textarea
                value={saudacao}
                onChange={(e) => {
                  setSaudacao(e.target.value);
                  setOk(false);
                }}
                rows={3}
                placeholder="Fala! Aqui é o Beto, da barbearia. Quer marcar um horário?"
                className="mt-1 w-full rounded-md border border-line2 bg-ink px-3 py-2.5 text-sm text-paper"
              />
            </label>

            <Button variant="ghost"
              type="button"
              className="btn-primary w-full"
              disabled={salvarAgente.isPending || nome.trim().length < 2}
              onClick={() => salvarAgente.mutate()}
            >
              {salvarAgente.isPending ? "Salvando…" : "Salvar atendente"}
            </Button>
            {ok ? <p className="text-center text-sm text-sage">Atendente salvo.</p> : null}

            {data.integracao.status === "conectado" ? (
              <Button variant="ghost"
                type="button"
                className="w-full rounded-md border border-line2 py-2.5 text-sm text-paper disabled:opacity-50"
                disabled={desligar.isPending}
                onClick={() => desligar.mutate()}
              >
                {desligar.isPending ? "Desligando…" : "Desligar atendimento inteligente"}
              </Button>
            ) : (
              <Button variant="ghost"
                type="button"
                className="w-full rounded-md border border-line2 py-2.5 text-sm text-paper disabled:opacity-50"
                disabled={pedirConexao.isPending}
                onClick={() => pedirConexao.mutate()}
              >
                {pedirConexao.isPending ? "Conectando…" : "Conectar o atendimento inteligente"}
              </Button>
            )}

            {chave ? (
              <div className="space-y-2 rounded-md border border-gold/40 bg-ink px-4 py-3">
                <p className="text-xs text-gold">
                  Guarde esta chave agora: ela aparece uma única vez. É com ela que o atendente consulta a sua
                  agenda.
                </p>
                <code className="block break-all rounded bg-ink2 px-3 py-2 text-xs text-paper">{chave.token}</code>
                <p className="text-xs text-mute">Endereço: {chave.url}</p>
              </div>
            ) : null}

            {data.ponte && !chave ? (
              <p className="rounded-md border border-line bg-ink px-4 py-3 text-xs text-mute">
                Chave ativa {data.ponte.prefixo}… · último uso{" "}
                {data.ponte.usadoEm ? new Date(data.ponte.usadoEm).toLocaleString("pt-BR") : "ainda não usada"}
              </p>
            ) : null}

            {erro ? <p className="text-center text-sm text-brick">{erro}</p> : null}
          </div>

          <p className="mt-6 flex items-start gap-2 border-t border-line pt-4 text-xs text-mute2">
            <ShieldCheck size={14} className="mt-0.5 shrink-0" />
            Nenhuma conversa é enviada sem conexão ativa, e só clientes que autorizaram WhatsApp entram no
            atendimento automático.
          </p>
        </section>
      ) : null}
    </Screen>
  );
}
