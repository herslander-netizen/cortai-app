import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { AdminNotice, AdminScreen } from "@/components/layout/AdminScreen";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAcao } from "@/hooks/useAcao";
import { EsqueletoLista } from "@/components/layout/Esqueleto";
import { definirRecursoDePlano, getMatrizDeRecursos } from "@/lib/admin.functions";
import { PLANOS, ROTULO_DO_PLANO } from "@/lib/planos";

export const Route = createFileRoute("/admin/recursos")({
  head: () => ({
    meta: [
      { title: "Recursos e planos — Flow" },
      {
        name: "description",
        content: "Defina quais recursos do Flow cada plano libera para os negócios.",
      },
      { property: "og:title", content: "Recursos e planos — Flow" },
      { property: "og:description", content: "Matriz de recursos por plano da plataforma Flow." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: RecursosPage,
});

function RecursosPage() {
  const query = useQuery({
    queryKey: ["matriz-recursos"],
    queryFn: () => getMatrizDeRecursos(),
    retry: false,
  });
  const definir = useServerFn(definirRecursoDePlano);
  const acao = useAcao();

  const alternar = (
    chave: string,
    rotulo: string,
    plano: (typeof PLANOS)[number],
    valor: boolean,
  ) =>
    acao.executar(`${chave}-${plano}`, () => definir({ data: { chave, plano, liberado: valor } }), {
      sucesso: `${rotulo} — ${ROTULO_DO_PLANO[plano]}: ${valor ? "ativo" : "bloqueado"}.`,
      aoConcluir: async () => {
        await query.refetch();
      },
    });

  if (query.isError) {
    return (
      <AdminScreen title="Recursos e planos" subtitle="O que cada plano libera.">
        <AdminNotice error={query.error} />
      </AdminScreen>
    );
  }

  const linhas = query.data ?? [];
  const recursos = Array.from(new Map(linhas.map((l) => [l.chave, l])).values());

  return (
    <AdminScreen
      title="Recursos dos planos"
      subtitle="Disponibilidade por plano; bloquear não apaga dados."
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link to="/admin/monetizacao">Voltar à monetização</Link>
        </Button>
      }
    >
      {!query.data ? (
        <EsqueletoLista linhas={6} onTentarDeNovo={() => void query.refetch()} />
      ) : (
        <>
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[540px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line">
                  <th className="py-3 text-xs font-semibold uppercase text-mute">Recurso</th>
                  {PLANOS.map((plano) => (
                    <th
                      key={plano}
                      className="w-28 py-3 text-center text-xs font-semibold uppercase text-mute"
                    >
                      {ROTULO_DO_PLANO[plano]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recursos.map((recurso) => (
                  <tr key={recurso.chave} className="border-b border-line align-top">
                    <td className="py-4 pr-4">
                      <p className="text-sm font-semibold text-paper">{recurso.rotulo}</p>
                      {recurso.descricao ? (
                        <p className="mt-1 max-w-md text-xs leading-relaxed text-mute">
                          {recurso.descricao}
                        </p>
                      ) : null}
                    </td>
                    {PLANOS.map((plano) => {
                      const linha = linhas.find(
                        (l) => l.chave === recurso.chave && l.plano === plano,
                      );
                      return (
                        <td key={plano} className="py-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <Switch
                              checked={Boolean(linha?.liberado)}
                              disabled={acao.ocupado}
                              aria-label={`${recurso.rotulo} no plano ${ROTULO_DO_PLANO[plano]}`}
                              onCheckedChange={(valor) =>
                                alternar(recurso.chave, recurso.rotulo, plano, valor)
                              }
                            />

                            <span
                              className={`text-xs uppercase ${linha?.liberado ? "text-sage" : "text-mute2"}`}
                            >
                              {linha?.liberado ? "Ativo" : "Bloqueado"}
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 sm:hidden">
            {recursos.map((recurso) => (
              <section key={recurso.chave} className="rounded-[12px] bg-[var(--figaro-surface-container,var(--ink2))] p-4">
                <p className="text-sm font-semibold text-paper">{recurso.rotulo}</p>
                {recurso.descricao ? (
                  <p className="mt-1 text-xs leading-relaxed text-mute">{recurso.descricao}</p>
                ) : null}
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {PLANOS.map((plano) => {
                    const linha = linhas.find(
                      (l) => l.chave === recurso.chave && l.plano === plano,
                    );
                    return (
                      <label
                        key={plano}
                        className="flex flex-col items-center gap-2 rounded-[12px] bg-[var(--figaro-surface-container-high,var(--ink3))] p-3 text-center"
                      >
                        <span className="text-xs font-semibold text-mute">
                          {ROTULO_DO_PLANO[plano]}
                        </span>
                        <Switch
                          checked={Boolean(linha?.liberado)}
                          disabled={acao.ocupado}
                          aria-label={`${recurso.rotulo} no plano ${ROTULO_DO_PLANO[plano]}`}
                          onCheckedChange={(valor) =>
                            alternar(recurso.chave, recurso.rotulo, plano, valor)
                          }
                        />
                      </label>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
          <p className="mt-6 text-xs leading-relaxed text-mute2">
            A liberação é conferida no servidor sempre que a barbearia abre ou salva o recurso.
            Bloquear aqui não apaga nenhum dado já cadastrado.
          </p>
        </>
      )}
    </AdminScreen>
  );
}
