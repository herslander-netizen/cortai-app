import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Building2, ChevronRight, LogOut, Palette, Share2, UserRound } from "lucide-react";

import { Screen } from "@/components/layout/Screen";
import { AlterarSenha } from "@/components/acesso/AlterarSenha";
import { PreferenciasDicas } from "@/components/guia/PreferenciasDicas";
import { getSessao } from "@/lib/sessao.functions";
import { sair } from "@/lib/guarda";

export const Route = createFileRoute("/barbeiro/conta")({
  head: () => ({
    meta: [
      { title: "Conta e barbearia — Cortaí Gestão" },
      { name: "description", content: "Dados da sua conta, da barbearia e saída segura do Cortaí." },
      { property: "og:title", content: "Conta e barbearia — Cortaí Gestão" },
      { property: "og:description", content: "Sua conta e sua barbearia no Cortaí." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ContaPage,
});

function ContaPage() {
  const { data } = useQuery({ queryKey: ["sessao"], queryFn: () => getSessao() });
  const [saindo, setSaindo] = useState(false);

  return (
    <Screen voltarPara="/barbeiro/mais" title="Conta" subtitle="Seus dados e os da sua barbearia.">
      <div className="flex items-center gap-4 border-b border-line pb-6">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ink2 text-gold">
          <UserRound size={22} />
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold text-paper">{data?.nome ?? "Minha conta"}</p>
          <p className="mt-1 truncate text-xs text-mute">{data?.email ?? "Conta conectada"}</p>
        </div>
      </div>

      <ul className="mt-3">
        {data?.permissoes.includes("alterar_dados_barbearia") ? <li className="border-b border-line">
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 py-5">
            <Building2 size={18} className="text-mute" />
            <span className="min-w-0">
              <span className="block text-sm text-paper">Barbearia</span>
              <span className="mt-0.5 block truncate text-xs text-mute">
                {data?.tenantNome ?? "Sem barbearia vinculada"}
              </span>
            </span>
          </div>
        </li> : null}
        {data?.tenantSlug ? (
          <li className="border-b border-line">
            <a
              href={`/b/${data.tenantSlug}`}
              target="_blank"
              rel="noreferrer"
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 py-5"
            >
              <Share2 size={18} className="text-mute" />
              <span className="text-sm text-paper">Ver página pública</span>
              <ChevronRight size={16} className="text-mute2" />
            </a>
          </li>
        ) : null}
        <li className="border-b border-line">
          <Link
            to="/barbeiro/marca"
            className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 py-5"
          >
            <Palette size={18} className="text-mute" />
            <span className="text-sm text-paper">Página e marca</span>
            <ChevronRight size={16} className="text-mute2" />
          </Link>
        </li>
        <li>
          <AlterarSenha />
        </li>
        <li className="border-b border-line">
          <button
            type="button"
            disabled={saindo}
            onClick={() => {
              setSaindo(true);
              void sair();
            }}
            className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 py-5 text-left disabled:opacity-50"
          >
            <LogOut size={18} className="text-mute" />
            <span className="text-sm text-paper">{saindo ? "Saindo…" : "Sair da conta"}</span>
            <ChevronRight size={16} className="text-mute2" />
          </button>
        </li>
      </ul>

      <PreferenciasDicas />
    </Screen>
  );
}
