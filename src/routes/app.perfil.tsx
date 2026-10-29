import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, LogOut, Repeat, UserRound, Wallet } from "lucide-react";

import { Screen } from "@/components/layout/Screen";
import { Card } from "@/components/ui/card";
import { AlterarSenha } from "@/components/acesso/AlterarSenha";
import { PreferenciasDicas } from "@/components/guia/PreferenciasDicas";
import { InstalarCortai } from "@/components/pwa/InstalarCortai";
import { PreferenciasDePrivacidade } from "@/components/privacidade/PreferenciasDePrivacidade";
import { SegurancaDaConta } from "@/components/seguranca/SegurancaDaConta";
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
      { title: "Perfil — Flow" },
      { name: "description", content: "Seus dados, carteira e preferências no Flow." },
      { property: "og:title", content: "Perfil — Flow" },
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
    <Screen title="Perfil" subtitle="Sua conta no Flow.">
      {sessao.isLoading ? <EsqueletoFicha onTentarDeNovo={() => void sessao.refetch()} /> : null}
      {sessao.isError ? (
        <div className="surface p-5" role="alert">
          <p className="text-sm text-paper">Não conseguimos carregar seu perfil agora.</p>
          <Button variant="outline" className="mt-4 w-full" onClick={() => void sessao.refetch()}>
            Tentar de novo
          </Button>
        </div>
      ) : null}
      {data ? (
        <>
          <Card density="default" className="flex items-center gap-4 rounded-[28px]">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--figaro-primary-container,var(--ink2))] text-[var(--figaro-primary,var(--primary))]">
              <UserRound size={22} />
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-paper">{data?.nome ?? "Meu perfil"}</p>
              <p className="mt-1 truncate text-xs text-mute">{data?.email ?? "Conta conectada"}</p>
            </div>
          </Card>
          <ul className="mt-3 space-y-2">
            <li>
              <Card asChild variant="touchable" density="none">
              <Link
                to="/app/carteira"
                search={slug ? { b: slug } : {}}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-4 py-3"
              >
                <Wallet size={18} className="text-mute" />
                <span className="text-sm text-paper">Carteira e fidelidade</span>
                <ChevronRight size={16} className="text-mute2" />
              </Link>
              </Card>
            </li>
            <li>
              <AlterarSenha emGrupo />
            </li>
            <li>
              <ThemeToggle emGrupo />
            </li>
            <li>
              <InstalarCortai emGrupo />
            </li>
            <li>
              <Card asChild variant="touchable" density="none">
              <Link
                to="/escolher"
                className="grid min-h-12 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-4 py-3"
              >
                <Repeat size={18} className="text-mute" />
                <span className="text-sm text-paper">Trocar de perfil</span>
                <ChevronRight size={16} className="text-mute2" />
              </Link>
              </Card>
            </li>
            <li>
              <Card density="none" className="overflow-hidden rounded-[12px] bg-[var(--figaro-surface-container,var(--ink2))]">
              <Button
                type="button"
                variant="ghost"
                onClick={() => void sair()}
                className="min-h-12 w-full grid-cols-[auto_minmax(0,1fr)_auto] justify-start gap-4 px-4 py-3 text-left"
              >
                <LogOut size={18} className="text-mute" />
                <span className="text-sm text-paper">Sair da conta</span>
                <ChevronRight size={16} className="text-mute2" />
              </Button>
              </Card>
            </li>
          </ul>
          <SegurancaDaConta />
          <PreferenciasDoCliente />
          <PreferenciasDicas />
          <PreferenciasDePrivacidade />
        </>
      ) : null}
    </Screen>
  );
}
