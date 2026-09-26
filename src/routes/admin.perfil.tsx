import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronRight, LogOut, Palette, ShieldCheck, UserRound } from "lucide-react";

import { AdminScreen } from "@/components/layout/AdminScreen";
import { PreferenciasDicas } from "@/components/guia/PreferenciasDicas";
import { InstalarCortai } from "@/components/pwa/InstalarCortai";
import { PreferenciasDePrivacidade } from "@/components/privacidade/PreferenciasDePrivacidade";
import { getSessao } from "@/lib/sessao.functions";
import { sair } from "@/lib/guarda";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export const Route = createFileRoute("/admin/perfil")({
  head: () => ({
    meta: [
      { title: "Perfil do administrador — Cortaí" },
      { name: "description", content: "Sua conta de dono da plataforma Cortaí e saída segura." },
      { property: "og:title", content: "Perfil do administrador — Cortaí" },
      { property: "og:description", content: "Conta de administração da plataforma Cortaí." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPerfilPage,
});

function AdminPerfilPage() {
  const { data } = useQuery({ queryKey: ["sessao"], queryFn: () => getSessao() });
  const [saindo, setSaindo] = useState(false);

  return (
    <AdminScreen title="Perfil" subtitle="Sua conta na administração do Cortaí.">
      <div className="flex items-center gap-4 border-b border-line pb-6">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ink2 text-gold">
          <UserRound size={22} />
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold text-paper">{data?.nome ?? "Administrador"}</p>
          <p className="mt-1 truncate text-xs text-mute">{data?.email ?? "Conta conectada"}</p>
        </div>
      </div>
      <ul className="mt-3">
        <li className="border-b border-line">
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 py-5">
            <ShieldCheck size={18} className="text-mute" />
            <span className="text-sm text-paper">Nível de acesso</span>
            <span className="text-xs text-mute">Dono da plataforma</span>
          </div>
        </li>
        <li><ThemeToggle /></li>
        <li><InstalarCortai /></li>
        <li className="border-b border-line">
          <Link to="/admin/ajustes" className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 py-5">
            <Palette size={18} className="text-mute" />
            <span className="text-sm text-paper">Configurações da plataforma</span>
            <ChevronRight size={16} className="text-mute2" />
          </Link>
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
            <span className="text-xs text-mute2">Encerrar sessão</span>
          </button>
        </li>
      </ul>
      <PreferenciasDicas />
      <PreferenciasDePrivacidade />
    </AdminScreen>
  );
}
