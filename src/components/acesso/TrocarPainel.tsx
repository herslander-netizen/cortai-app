import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ShieldCheck, Store } from "lucide-react";
import { useState } from "react";

import { definirBarbeariaAtiva, getMinhasBarbearias } from "@/lib/barbearias.functions";
import { esquecerSessao } from "@/lib/guarda";
import { escolherContexto, getSessao } from "@/lib/sessao.functions";
import { GrupoDeLinhas, LinhaDeConfiguracao } from "@/components/ui/formulario/LinhasDeConfiguracao";

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
            detalhe: "Administração da plataforma Flow",
            admin: true,
          },
        ]
      : []),
    ...ativos.map((n) => ({ id: n.id, nome: n.nome, detalhe: "Painel do negócio", admin: false })),
  ];

  return (
    <section>
      <h2 className="rotulo-secao mb-2">Trocar de painel</h2>
      <GrupoDeLinhas>
        {opcoes.map((o) => {
          const emUso = o.id === atual;
          return (
            <LinhaDeConfiguracao
              key={o.id}
              icone={o.admin ? ShieldCheck : Store}
              titulo={o.nome}
              suporte={abrindo === o.id ? "Abrindo…" : emUso ? "Em uso agora" : o.detalhe}
              fim={emUso ? <Check size={18} aria-hidden /> : undefined}
              {...(emUso || abrindo !== null ? {} : { aoTocar: () => void abrir(o.id) })}
            />
          );
        })}
      </GrupoDeLinhas>
      {erro ? (
        <p className="mt-2 text-sm text-brick" role="alert">
          {erro}
        </p>
      ) : null}
    </section>
  );
}
