import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronRight, ShieldCheck, Store } from "lucide-react";
import { useState } from "react";

import { definirBarbeariaAtiva, getMinhasBarbearias } from "@/lib/barbearias.functions";
import { esquecerSessao } from "@/lib/guarda";
import { escolherContexto, getSessao } from "@/lib/sessao.functions";

/**
 * "Trocar de painel": lista o painel do ADM (só para admin da plataforma) e todos os negócios em
 * que a conta tem acesso ativo, marcando o que está em uso. Aparece igual no ADM e no painel do
 * negócio. O servidor confere papel e vínculo em cada troca.
 */
export function TrocarPainel() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [abrindo, setAbrindo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const { data: sessao } = useQuery({
    queryKey: ["sessao"],
    queryFn: () => getSessao(),
    staleTime: 300000,
  });
  const { data: negocios } = useQuery({
    queryKey: ["minhas-barbearias"],
    queryFn: () => getMinhasBarbearias(),
    staleTime: 60000,
  });

  const ehAdmin = Boolean(sessao?.adminDaPlataforma || sessao?.papel === "admin");
  const ativos = (negocios ?? []).filter((n) => n.acessoAtivo && n.ativa);
  const atual = sessao?.papel === "admin" ? "admin" : (sessao?.tenantId ?? null);
  if (!sessao || (ehAdmin ? 1 : 0) + ativos.length < 2) return null;

  async function abrir(destino: string) {
    setAbrindo(destino);
    setErro(null);
    try {
      if (destino === "admin") {
        await escolherContexto({ data: { contexto: "admin" } });
      } else {
        await definirBarbeariaAtiva({ data: { tenantId: destino } });
        await escolherContexto({ data: { contexto: "negocio" } });
      }
      esquecerSessao();
      qc.clear();
      await navigate({ to: destino === "admin" ? "/admin" : "/barbeiro", replace: true });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível trocar de painel agora.");
      setAbrindo(null);
    }
  }

  const opcoes = [
    ...(ehAdmin
      ? [
          {
            id: "admin",
            nome: "Painel do ADM",
            detalhe: "Administração da plataforma Cortaí",
            admin: true,
          },
        ]
      : []),
    ...ativos.map((n) => ({ id: n.id, nome: n.nome, detalhe: "Painel do negócio", admin: false })),
  ];

  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold uppercase text-mute2">Trocar de painel</h2>
      <ul className="divide-y divide-line border-y border-line">
        {opcoes.map((o) => {
          const emUso = o.id === atual;
          const Icone = o.admin ? ShieldCheck : Store;
          return (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => void abrir(o.id)}
                disabled={emUso || abrindo !== null}
                aria-current={emUso ? "page" : undefined}
                className="nav-list-item w-full text-left disabled:cursor-default"
              >
                <span className="nav-list-icon">
                  <Icone size={18} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-paper">{o.nome}</span>
                  <span className="mt-1 block text-xs text-mute">
                    {abrindo === o.id ? "Abrindo…" : emUso ? "Em uso agora" : o.detalhe}
                  </span>
                </span>
                {emUso ? (
                  <Check size={17} className="shrink-0 text-paper" />
                ) : (
                  <ChevronRight size={17} className="shrink-0 text-mute2" />
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {erro ? (
        <p className="mt-2 text-sm text-brick" role="alert">
          {erro}
        </p>
      ) : null}
    </section>
  );
}
