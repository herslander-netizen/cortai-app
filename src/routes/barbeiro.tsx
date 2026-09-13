import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { exigirPapel } from "@/lib/guarda";
import { BarbershopTabBar } from "@/components/layout/BarbershopTabBar";
import { ConviteDeInstalacao } from "@/components/pwa/ConviteDeInstalacao";
import { RecursoIndisponivel } from "@/components/barbeiro/RecursoIndisponivel";
import { useContextoBarbearia } from "@/hooks/useContextoBarbearia";
import type { ChaveRecursoTenant } from "@/lib/recursos";

export const Route = createFileRoute("/barbeiro")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Cortaí Gestão" },
    { name: "description", content: "Agenda, clientes, equipe e operação da sua barbearia." },
    { property: "og:title", content: "Cortaí Gestão" },
    { property: "og:description", content: "Gestão diária da sua barbearia." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  beforeLoad: () => exigirPapel("barbeiro"),
  component: BarberLayout,
});

/** Rotas que só existem quando o recurso está ativo na barbearia. */
const ROTAS_POR_RECURSO: { prefixo: string; chave: ChaveRecursoTenant; titulo: string }[] = [
  { prefixo: "/barbeiro/produtos", chave: "produtos_estoque", titulo: "Produtos e estoque" },
  { prefixo: "/barbeiro/fidelidade", chave: "fidelidade", titulo: "Fidelidade" },
  { prefixo: "/barbeiro/fila", chave: "fila_espera", titulo: "Lista de espera" },
  { prefixo: "/barbeiro/indicacoes", chave: "indicacoes", titulo: "Indicações" },
  { prefixo: "/barbeiro/avaliacoes", chave: "avaliacoes", titulo: "Avaliações" },
  { prefixo: "/barbeiro/crescimento", chave: "crescimento", titulo: "Crescimento" },
];

function BarberLayout() {
  const caminho = useRouterState({ select: (s) => s.location.pathname });
  const { dados, ativo, pode } = useContextoBarbearia();
  const bloqueio = ROTAS_POR_RECURSO.find((r) => caminho.startsWith(r.prefixo));
  const desligado = Boolean(dados) && bloqueio && !ativo(bloqueio.chave);

  return (
    <div className="management-shell">
      {desligado && bloqueio ? (
        <div className="mx-auto w-full max-w-[520px] px-5 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-14">
          <RecursoIndisponivel titulo={bloqueio.titulo} podeGerenciar={pode("alterar_dados_barbearia")} />
        </div>
      ) : (
        <Outlet />
      )}
      <BarbershopTabBar />
      <ConviteDeInstalacao />
    </div>
  );
}
