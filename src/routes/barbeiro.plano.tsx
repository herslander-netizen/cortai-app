import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { Screen } from "@/components/layout/Screen";
import { EsqueletoLista } from "@/components/layout/Esqueleto";
import { TabelaDePlanos } from "@/components/planos/TabelaDePlanos";
import { aviso } from "@/lib/avisos";
import { escolherPlanoDaBarbearia, getPlanosDaBarbearia } from "@/lib/planos.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/barbeiro/plano")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Plano do negócio — Cortaí Gestão" },
      {
        name: "description",
        content: "Escolha o plano e veja exatamente o que está liberado para o seu negócio.",
      },
      { property: "og:title", content: "Plano do negócio — Cortaí" },
      {
        property: "og:description",
        content: "O plano decide o que aparece no painel do seu negócio.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PlanoPage,
});

function PlanoPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const escolher = useServerFn(escolherPlanoDaBarbearia);
  const [salvando, setSalvando] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["planos-da-barbearia"],
    queryFn: () => getPlanosDaBarbearia(),
    staleTime: 300_000,
  });

  async function selecionar(chave: string) {
    if (!data?.podeTrocar || chave === data.atual) return;
    setSalvando(chave);
    try {
      const r = await escolher({ data: { chave } });
      aviso.ok(`Plano ${r.plano} aplicado. Seus dados continuam como estavam.`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["planos-da-barbearia"] }),
        queryClient.invalidateQueries({ queryKey: ["capacidades"] }),
        queryClient.invalidateQueries({ queryKey: ["implantacao"] }),
      ]);
    } catch (e) {
      aviso.erro(e instanceof Error ? e.message : "Não consegui trocar o plano agora.");
    } finally {
      setSalvando(null);
    }
  }

  return (
    <Screen
      title="Plano do negócio"
      subtitle="WhatsApp, Secretária e agendamento pelo cliente fazem parte do Conecta e do Equipe."
    >
      {isLoading || !data ? (
        <EsqueletoLista linhas={3} />
      ) : (
        <div className="space-y-3">
          <TabelaDePlanos
            atual={data.atual}
            precos={Object.fromEntries(data.planos.map((p) => [p.chave, p.precoMensalCentavos]))}
            acao={(plano) =>
              plano.chave === data.atual ? (
                <Button
                  variant="ghost"
                  type="button"
                  className="btn-secondary w-full py-3"
                  onClick={() => void navigate({ to: "/barbeiro/configurar" })}
                >
                  Continuar a configuração
                </Button>
              ) : data.planos.some((p) => p.chave === plano.chave) ? (
                <Button
                  variant="ghost"
                  type="button"
                  className="btn-primary w-full py-3"
                  disabled={!data.podeTrocar || salvando !== null}
                  onClick={() => void selecionar(plano.chave)}
                >
                  {salvando === plano.chave ? "Aplicando…" : `Escolher ${plano.nome}`}
                </Button>
              ) : null
            }
          />
          {!data.podeTrocar ? (
            <p className="text-xs text-mute2">
              Só quem pode alterar os dados do negócio troca o plano. Fale com o responsável.
            </p>
          ) : null}
          <p className="text-xs text-mute2">
            Trocar de plano não apaga nada: clientes, agendamentos e serviços continuam salvos.
          </p>
        </div>
      )}
    </Screen>
  );
}
