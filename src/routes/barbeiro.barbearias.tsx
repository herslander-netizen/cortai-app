import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { CheckCircle2, Store } from "lucide-react";

import { Screen } from "@/components/layout/Screen";
import { EsqueletoLista } from "@/components/layout/Esqueleto";
import { aviso } from "@/lib/avisos";
import { esquecerSessao } from "@/lib/guarda";
import { definirBarbeariaAtiva, getMinhasBarbearias } from "@/lib/barbearias.functions";

export const Route = createFileRoute("/barbeiro/barbearias")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Minhas barbearias — Cortaí Gestão" },
      { name: "description", content: "Todas as barbearias ligadas à sua conta, com plano e configuração pendente." },
      { property: "og:title", content: "Minhas barbearias — Cortaí" },
      { property: "og:description", content: "Troque de barbearia e retome a configuração de onde parou." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MinhasBarbeariasPage,
});

const ROTULO_DA_ETAPA: Record<string, string> = {
  boas_vindas: "Boas-vindas",
  dados: "Dados da barbearia",
  equipe: "Equipe",
  servicos: "Serviços",
  agenda: "Agenda e horários",
  canais: "Avisos e canais",
  recursos: "Recursos do plano",
  pronto: "Configuração concluída",
};

function MinhasBarbeariasPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const trocar = useServerFn(definirBarbeariaAtiva);
  const [indo, setIndo] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["minhas-barbearias"],
    queryFn: () => getMinhasBarbearias(),
    staleTime: 60_000,
  });

  async function abrirConfiguracao(id: string, jaAtiva: boolean) {
    setIndo(id);
    try {
      if (!jaAtiva) {
        await trocar({ data: { tenantId: id } });
        esquecerSessao();
        await queryClient.invalidateQueries();
      }
      await navigate({ to: "/barbeiro/configurar" });
    } catch (e) {
      aviso.erro(e instanceof Error ? e.message : "Não consegui abrir esta barbearia agora.");
      setIndo(null);
    }
  }

  return (
    <Screen title="Minhas barbearias" subtitle="Tudo que está ligado à sua conta, com o plano e o que falta configurar.">
      {isLoading || !data ? (
        <EsqueletoLista linhas={2} />
      ) : !data.length ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-mute">
          Sua conta ainda não está ligada a nenhuma barbearia.
        </p>
      ) : (
        <div className="space-y-3">
          {data.map((b) => (
            <article key={b.id} className={`card p-5 ${b.ehAtiva ? "border-gold" : ""}`}>
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-ink2">
                  {b.logoUrl ? (
                    <img src={b.logoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Store size={18} className="text-gold" aria-hidden />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-base font-bold text-paper">{b.nome}</h2>
                  <p className="mt-0.5 text-xs text-mute">
                    {b.planoNome} · {b.papel}
                    {b.ehAtiva ? " · em uso" : ""}
                  </p>
                  <p className="mt-2 flex items-center gap-1.5 text-xs">
                    {b.concluida ? (
                      <>
                        <CheckCircle2 size={13} className="text-sage" aria-hidden />
                        <span className="text-mute">Configuração concluída</span>
                      </>
                    ) : (
                      <span className="text-gold">Parou em: {ROTULO_DA_ETAPA[b.etapa] ?? b.etapa}</span>
                    )}
                  </p>
                  {!b.acessoAtivo ? (
                    <p className="mt-1 text-xs text-brick">Seu acesso a esta barbearia está desativado.</p>
                  ) : null}
                </div>
              </div>

              <button
                type="button"
                className={`${b.ehAtiva ? "btn-secondary" : "btn-primary"} mt-4 w-full py-3`}
                disabled={!b.acessoAtivo || indo !== null}
                onClick={() => void abrirConfiguracao(b.id, b.ehAtiva)}
              >
                {indo === b.id ? "Abrindo…" : b.concluida ? "Ver resumo da configuração" : "Voltar à configuração"}
              </button>
            </article>
          ))}
        </div>
      )}
    </Screen>
  );
}
