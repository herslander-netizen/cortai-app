import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";

import { ListaDeFotos, type FotoDaLista } from "@/components/fotos/SeletorDeFoto";
import { MAX_FOTOS_DO_PORTFOLIO } from "@/lib/fotos-do-negocio";
import { EmptyState, Screen } from "@/components/layout/Screen";
import { getProfissionaisPerfil, salvarPerfilProfissional } from "@/lib/crescimento.functions";
import { useAcao } from "@/hooks/useAcao";
import { EsqueletoFormulario } from "@/components/layout/Esqueleto";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/barbeiro/profissionais")({
  head: () => ({
    meta: [
      { title: "Profissionais — Cortaí Gestão" },
      {
        name: "description",
        content: "Descrição e portfólio de cada profissional na página pública.",
      },
      { property: "og:title", content: "Profissionais — Cortaí Gestão" },
      { property: "og:description", content: "Mostre o trabalho de cada profissional da equipe." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ProfissionaisPage,
});

function ProfissionaisPage() {
  const salvar = useServerFn(salvarPerfilProfissional);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["profissionais-perfil"],
    queryFn: () => getProfissionaisPerfil(),
  });

  const [form, setForm] = useState<Record<string, { descricao: string; fotos: FotoDaLista[] }>>({});
  const acao = useAcao();

  useEffect(() => {
    if (!data) return;
    setForm(
      Object.fromEntries(data.map((p) => [p.id, { descricao: p.descricao ?? "", fotos: p.fotos }])),
    );
  }, [data]);

  return (
    <Screen
      voltarPara="/barbeiro/mais"
      title="Profissionais"
      subtitle="O que aparece na sua página pública."
    >
      {isLoading ? <EsqueletoFormulario campos={3} onTentarDeNovo={() => void refetch()} /> : null}
      {data && data.length === 0 ? <EmptyState text="Nenhum profissional cadastrado." /> : null}

      <ul className="space-y-2">
        {(data ?? []).map((p) => {
          const atual = form[p.id] ?? { descricao: "", fotos: [] };
          return (
            <li key={p.id}>
              <Card density="default">
                <p className="text-sm font-semibold text-paper">{p.nome}</p>
                <label className="mt-4 block">
                  <span className="text-xs text-mute2">Descrição curta</span>
                  <textarea
                    rows={2}
                    maxLength={200}
                    value={atual.descricao}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, [p.id]: { ...atual, descricao: e.target.value } }))
                    }
                    className="field-control mt-1 w-full resize-none"
                    placeholder="Especialista nos serviços que oferece."
                  />
                </label>
                <div className="mt-4">
                  <span className="mb-2 block text-xs text-mute2">
                    Portfólio: até {MAX_FOTOS_DO_PORTFOLIO} fotos do seu trabalho
                  </span>
                  <ListaDeFotos
                    fotos={atual.fotos}
                    max={MAX_FOTOS_DO_PORTFOLIO}
                    prefixo="profissional"
                    titulo={`Portfólio de ${p.nome}`}
                    onChange={(fotos) => setForm((s) => ({ ...s, [p.id]: { ...atual, fotos } }))}
                  />
                </div>
                <Button
                  loading={acao.estaEm(p.id)}
                  success={acao.concluiu(p.id)}
                  variant="primary"
                  size="lg"
                  type="button"
                  className="mt-4 w-full sm:w-auto"
                  disabled={acao.ocupado}
                  onClick={() =>
                    acao.executar(
                      p.id,
                      () =>
                        salvar({
                          data: {
                            id: p.id,
                            descricao: atual.descricao,
                            portfolio: atual.fotos
                              .map((f) => f.valor)
                              .slice(0, MAX_FOTOS_DO_PORTFOLIO),
                          },
                        }),
                      {
                        sucesso: `Perfil de ${p.nome} salvo.`,
                        aoConcluir: async () => {
                          await refetch();
                        },
                      },
                    )
                  }
                >
                  Salvar perfil
                </Button>
              </Card>
            </li>
          );
        })}
      </ul>
    </Screen>
  );
}
