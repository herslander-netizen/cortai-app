import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, LogOut, UserRound, Wallet } from "lucide-react";

import { Screen } from "@/components/layout/Screen";
import { AlterarSenha } from "@/components/acesso/AlterarSenha";
import { PreferenciasDicas } from "@/components/guia/PreferenciasDicas";
import { InstalarCortai } from "@/components/pwa/InstalarCortai";
import { PreferenciasDePrivacidade } from "@/components/privacidade/PreferenciasDePrivacidade";
import { getSessao } from "@/lib/sessao.functions";
import { PreferenciasDoCliente } from "@/components/notificacoes/PreferenciasDoCliente";
import { sair } from "@/lib/guarda";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useContextoCliente } from "@/lib/contexto-cliente";
import { EsqueletoFicha } from "@/components/layout/Esqueleto";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/perfil")({
  validateSearch: (search: Record<string, unknown>): { b?: string } =>
    typeof search["b"] === "string" && search["b"] ? { b: search["b"] } : {},
  head: () => ({
    meta: [
      { title: "Perfil — Cortaí" },
      { name: "description", content: "Seus dados, carteira e preferências no Cortaí." },
      { property: "og:title", content: "Perfil — Cortaí" },
      { property: "og:description", content: "Seus dados e preferências." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PerfilPage,
});

function PerfilPage() {
  const { b } = Route.useSearch();
  const slug = useContextoCliente(b);
  const sessao = useQuery({ queryKey: ["sessao"], queryFn: () => getSessao() });
  const { data } = sessao;

  return (
    <Screen title="Perfil" subtitle="Sua conta no Cortaí.">
      {sessao.isLoading ? <EsqueletoFicha /> : null}
      {sessao.isError ? (
        <div className="surface p-5">
          <p className="text-sm text-paper">Não conseguimos carregar seu perfil agora.</p>
          <Button variant="outline" className="mt-4 w-full" onClick={() => void sessao.refetch()}>
            Tentar de novo
          </Button>
        </div>
      ) : null}
      {data ? (
        <>
          <div className="flex items-center gap-4 border-b border-line pb-6">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ink2 text-gold">
              <UserRound size={22} />
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-paper">{data?.nome ?? "Meu perfil"}</p>
              <p className="mt-1 truncate text-xs text-mute">{data?.email ?? "Conta conectada"}</p>
            </div>
          </div>
          <ul className="mt-3">
            <li className="border-b border-line">
              <Link
                to="/app/carteira"
                search={slug ? { b: slug } : {}}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 py-5"
              >
                <Wallet size={18} className="text-mute" />
                <span className="text-sm text-paper">Carteira e fidelidade</span>
                <ChevronRight size={16} className="text-mute2" />
              </Link>
            </li>
            <li>
              <AlterarSenha />
            </li>
            <li>
              <ThemeToggle />
            </li>
            <li>
              <InstalarCortai />
            </li>
            <li className="border-b border-line">
              <button
                type="button"
                onClick={() => void sair()}
                className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 py-5 text-left"
              >
                <LogOut size={18} className="text-mute" />
                <span className="text-sm text-paper">Sair da conta</span>
                <ChevronRight size={16} className="text-mute2" />
              </button>
            </li>
          </ul>
          <PreferenciasDoCliente />
          <PreferenciasDicas />
          <PreferenciasDePrivacidade />
        </>
      ) : null}
    </Screen>
  );
}
