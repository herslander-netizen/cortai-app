import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, LogOut, UserRound, Wallet } from "lucide-react";

import { Screen } from "@/components/layout/Screen";
import { PreferenciasDicas } from "@/components/guia/PreferenciasDicas";
import { AtalhoInstalar } from "@/components/pwa/AtalhoInstalar";
import { getSessao } from "@/lib/sessao.functions";
import { useSair } from "@/hooks/useSair";

export const Route = createFileRoute("/app/perfil")({
  head: () => ({
    meta: [
      { title: "Perfil — Cortaí" },
      { name: "description", content: "Seus dados, carteira e preferências no Cortaí." },
      { property: "og:title", content: "Perfil — Cortaí" },
      { property: "og:description", content: "Seus dados e preferências." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PerfilPage,
});

function PerfilPage() {
  const sairDaConta = useSair();
  const { data } = useQuery({ queryKey: ["sessao"], queryFn: () => getSessao() });

  return (
    <Screen title="Perfil" subtitle="Sua conta no Cortaí.">
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
        <AtalhoInstalar />
        <li className="border-b border-line">
          <Link
            to="/app/carteira"
            className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 py-5"
          >
            <Wallet size={18} className="text-mute" />
            <span className="text-sm text-paper">Carteira e fidelidade</span>
            <ChevronRight size={16} className="text-mute2" />
          </Link>
        </li>
        <li className="border-b border-line">
          <button
            type="button"
            onClick={() => void sairDaConta()}
            className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 py-5 text-left"
          >
            <LogOut size={18} className="text-mute" />
            <span className="text-sm text-paper">Sair da conta</span>
            <ChevronRight size={16} className="text-mute2" />
          </button>
        </li>
      </ul>
      <PreferenciasDicas />
    </Screen>
  );
}
