import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { AdminNotice, AdminScreen } from "@/components/layout/AdminScreen";
import { Switch } from "@/components/ui/switch";
import { Carregando } from "@/components/layout/Carregando";
import { definirRecursoDePlano, getMatrizDeRecursos } from "@/lib/admin.functions";
import { PLANOS, ROTULO_DO_PLANO } from "@/lib/planos";

export const Route = createFileRoute("/admin/recursos")({
  head: () => ({ meta: [
    { title: "Recursos e planos — CortAI" },
    { name: "description", content: "Defina quais recursos do CortAI cada plano libera para as barbearias." },
    { property: "og:title", content: "Recursos e planos — CortAI" },
    { property: "og:description", content: "Matriz de recursos por plano da plataforma CortAI." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: RecursosPage,
});

function RecursosPage() {
  const query = useQuery({ queryKey: ["matriz-recursos"], queryFn: () => getMatrizDeRecursos(), retry: false });
  const definir = useServerFn(definirRecursoDePlano);
  const [status, setStatus] = useState("");

  if (query.isError) {
    return <AdminScreen title="Recursos e planos" subtitle="O que cada plano libera."><AdminNotice error={query.error} /></AdminScreen>;
  }

  const linhas = query.data ?? [];
  const recursos = Array.from(new Map(linhas.map((l) => [l.chave, l])).values());

  return (
    <AdminScreen title="Recursos dos planos" subtitle="Disponibilidade por plano; bloquear não apaga dados." actions={<Link to="/admin/monetizacao" className="btn-secondary text-xs">Voltar à monetização</Link>}>
      {!query.data ? <Carregando texto="Carregando matriz…" /> : (
        <>
          {status ? <p className="mb-4 text-sm text-sage" role="status">{status}</p> : null}
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[540px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line">
                  <th className="py-3 text-xs font-semibold uppercase text-mute">Recurso</th>
                  {PLANOS.map((plano) => (
                    <th key={plano} className="w-28 py-3 text-center text-xs font-semibold uppercase text-mute">{ROTULO_DO_PLANO[plano]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recursos.map((recurso) => (
                  <tr key={recurso.chave} className="border-b border-line align-top">
                    <td className="py-4 pr-4">
                      <p className="text-sm font-semibold text-paper">{recurso.rotulo}</p>
                      {recurso.descricao ? <p className="mt-1 max-w-md text-xs leading-relaxed text-mute">{recurso.descricao}</p> : null}
                    </td>
                    {PLANOS.map((plano) => {
                      const linha = linhas.find((l) => l.chave === recurso.chave && l.plano === plano);
                      return (
                        <td key={plano} className="py-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <Switch
                              checked={Boolean(linha?.liberado)}
                              aria-label={`${recurso.rotulo} no plano ${ROTULO_DO_PLANO[plano]}`}
                              onCheckedChange={async (valor) => {
                                setStatus("");
                                await definir({ data: { chave: recurso.chave, plano, liberado: valor } });
                                await query.refetch();
                                setStatus(`${recurso.rotulo} — ${ROTULO_DO_PLANO[plano]}: ${valor ? "ativo" : "bloqueado"}.`);
                              }}
                            />
                            <span className={`text-[10px] uppercase ${linha?.liberado ? "text-sage" : "text-mute2"}`}>{linha?.liberado ? "Ativo" : "Bloqueado"}</span>
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
            {recursos.map((recurso) => <section key={recurso.chave} className="surface-card p-4"><p className="text-sm font-semibold text-paper">{recurso.rotulo}</p>{recurso.descricao ? <p className="mt-1 text-xs leading-relaxed text-mute">{recurso.descricao}</p> : null}<div className="mt-4 grid grid-cols-3 gap-2">{PLANOS.map((plano) => { const linha = linhas.find((l) => l.chave === recurso.chave && l.plano === plano); return <label key={plano} className="flex flex-col items-center gap-2 rounded-md bg-ink3 p-2 text-center"><span className="text-[10px] font-semibold text-mute">{ROTULO_DO_PLANO[plano]}</span><Switch checked={Boolean(linha?.liberado)} aria-label={`${recurso.rotulo} no plano ${ROTULO_DO_PLANO[plano]}`} onCheckedChange={async (valor) => { setStatus(""); await definir({ data: { chave: recurso.chave, plano, liberado: valor } }); await query.refetch(); setStatus(`${recurso.rotulo} — ${ROTULO_DO_PLANO[plano]}: ${valor ? "ativo" : "bloqueado"}.`); }} /></label>; })}</div></section>)}
          </div>
          <p className="mt-6 text-xs leading-relaxed text-mute2">
            A liberação é conferida no servidor sempre que a barbearia abre ou salva o recurso. Bloquear aqui não apaga nenhum dado já cadastrado.
          </p>
        </>
      )}
    </AdminScreen>
  );
}
