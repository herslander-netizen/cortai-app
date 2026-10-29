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
import { AvatarDeIniciais } from "@/components/ui/avatar-iniciais";
import { ChevronDown } from "lucide-react";

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
  // Lista do Figaro (Equipe): uma linha por pessoa; tocar abre o perfil público dela logo abaixo.
  const [aberto, setAberto] = useState<string | null>(null);

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

      <ul className="flex flex-col gap-0.5 [&>li]:overflow-hidden [&>li]:rounded-[4px] [&>li]:bg-[var(--figaro-surface-container-high,var(--ink2))] [&>li:first-child]:rounded-t-[28px] [&>li:last-child]:rounded-b-[28px]">
        {(data ?? []).map((p) => {
          const atual = form[p.id] ?? { descricao: "", fotos: [] };
          const estaAberto = aberto === p.id;
          const resumo = [
            atual.descricao.trim() || "Sem descrição",
            atual.fotos.length
              ? `${atual.fotos.length} ${atual.fotos.length === 1 ? "foto" : "fotos"}`
              : null,
          ]
            .filter(Boolean)
            .join(" · ");
          return (
            <li key={p.id} className="px-4 py-3">
              <Button
                variant="ghost"
                size="bloco"
                type="button"
                aria-expanded={estaAberto}
                onClick={() => setAberto(estaAberto ? null : p.id)}
                className="grid min-h-14 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-none bg-transparent p-0 text-left hover:bg-transparent active:bg-transparent"
              >
                <AvatarDeIniciais nome={p.nome} />
                <span className="min-w-0">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-[15px] font-semibold leading-5 text-paper">
                      {p.nome}
                    </span>
                    {p.ativo === false ? (
                      <span className="inline-flex min-h-5 shrink-0 items-center rounded-full bg-[var(--figaro-surface-container-highest)] px-2 text-[11px] font-semibold leading-4 text-[var(--figaro-on-surface-variant)]">
                        Inativo
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block truncate text-sm leading-5 text-mute">
                    {resumo}
                  </span>
                </span>
                <ChevronDown
                  aria-hidden
                  className={`!size-5 text-mute2 transition-transform duration-200 ${estaAberto ? "rotate-180" : ""}`}
                />
              </Button>
              {estaAberto ? (
                <div className="pb-1 pt-2">
                  <label className="mt-2 block">
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
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Screen>
  );
}
