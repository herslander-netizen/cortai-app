import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { getSessao } from "@/lib/sessao.functions";
import { secaoDoCaminho } from "@/lib/navegacao-barbeiro";

/** Abas de uma área consolidada (Financeiro, Equipe, WhatsApp…). Some com uma aba só. */
export function AbasDaSecao() {
  const caminho = useRouterState({ select: (s) => s.location.pathname });
  // Só a área do negócio tem abas: nas outras telas (cliente, admin) nada é buscado.
  const naAreaDoNegocio = caminho.startsWith("/barbeiro");
  const { data: sessao } = useQuery({
    queryKey: ["sessao"],
    queryFn: () => getSessao(),
    staleTime: 300_000,
    enabled: naAreaDoNegocio,
  });
  const secao = naAreaDoNegocio ? secaoDoCaminho(caminho) : undefined;
  const abas =
    secao?.abas.filter((a) => !a.permissao || sessao?.permissoes.includes(a.permissao)) ?? [];
  if (abas.length < 2) return null;
  return (
    <nav aria-label={secao?.titulo} className="mx-auto mb-4 w-full max-w-[1180px] px-4 md:px-8">
      <ul className="flex gap-1 overflow-x-auto border-b border-line [scrollbar-width:none]">
        {abas.map((aba) => {
          const on = caminho === aba.to || caminho.startsWith(`${aba.to}/`);
          return (
            <li key={aba.to} className="shrink-0">
              <Link
                to={aba.to as never}
                preload="intent"
                activeOptions={{ exact: true }}
                aria-current={on ? "page" : undefined}
                className={`-mb-px flex min-h-12 items-center border-b-2 px-3 text-sm font-semibold transition-colors ${
                  on ? "border-primary text-paper" : "border-transparent text-mute hover:text-paper"
                }`}
              >
                {aba.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
