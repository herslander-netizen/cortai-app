import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";

import { EmptyState, Screen } from "@/components/layout/Screen";
import { getProfissionaisPerfil, salvarPerfilProfissional } from "@/lib/crescimento.functions";
import { useAcao } from "@/hooks/useAcao";
import { EsqueletoFormulario } from "@/components/layout/Esqueleto";
import { Button } from "@/components/ui/button";

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

  const [form, setForm] = useState<Record<string, { descricao: string; fotos: string }>>({});
  const acao = useAcao();

  useEffect(() => {
    if (!data) return;
    setForm(
      Object.fromEntries(
        data.map((p) => [p.id, { descricao: p.descricao ?? "", fotos: p.portfolio.join("\n") }]),
      ),
    );
  }, [data]);

  return (
    <Screen
      voltarPara="/barbeiro/mais"
      title="Profissionais"
      subtitle="O que aparece na sua página pública."
    >
      {isLoading ? (
        <EsqueletoFormulario campos={3} onTentarDeNovo={() => void refetch()} />
      ) : null}
      {data && data.length === 0 ? <EmptyState text="Nenhum profissional cadastrado." /> : null}

      <ul className="space-y-6">
        {(data ?? []).map((p) => {
          const atual = form[p.id] ?? { descricao: "", fotos: "" };
          return (
            <li key={p.id} className="border-b border-line bg-ink2 px-1 py-5">
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
                  className="input-premium mt-1 w-full resize-none"
                  placeholder="Especialista nos serviços que oferece."
                />
              </label>
              <label className="mt-4 block">
                <span className="text-xs text-mute2">
                  Portfólio — um link de foto por linha (até 6)
                </span>
                <textarea
                  rows={3}
                  value={atual.fotos}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, [p.id]: { ...atual, fotos: e.target.value } }))
                  }
                  className="input-premium mt-1 w-full resize-none"
                  placeholder="https://"
                />
              </label>
              <Button
                variant="ghost"
                type="button"
                className="btn-tertiary mt-4 text-xs"
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
                            .split("\n")
                            .map((f) => f.trim())
                            .filter(Boolean)
                            .slice(0, 6),
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
                {acao.estaEm(p.id) ? "Salvando…" : "Salvar perfil"}
              </Button>
            </li>
          );
        })}
      </ul>
    </Screen>
  );
}
