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
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/perfil")({
  head: () => ({
    meta: [
      { title: "Perfil do administrador — Flow" },
      { name: "description", content: "Sua conta de dono da plataforma Flow e saída segura." },
      { property: "og:title", content: "Perfil do administrador — Flow" },
      { property: "og:description", content: "Conta de administração da plataforma Flow." },
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
    <AdminScreen title="Perfil" subtitle="Sua conta na administração do Flow.">
      <div className="flex items-center gap-4 rounded-[28px] bg-[var(--figaro-surface-container,var(--ink2))] p-4">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--figaro-primary-container,var(--ink2))] text-[var(--figaro-primary,var(--primary))]">
          <UserRound size={22} />
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold text-paper">{data?.nome ?? "Administrador"}</p>
          <p className="mt-1 truncate text-xs text-mute">{data?.email ?? "Conta conectada"}</p>
        </div>
      </div>
      <ul className="mt-3 space-y-2">
        <li className="rounded-[12px] bg-[var(--figaro-surface-container,var(--ink2))] px-4">
          <div className="grid min-h-12 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 py-3">
            <ShieldCheck size={18} className="text-mute" />
            <span className="text-sm text-paper">Nível de acesso</span>
            <span className="text-xs text-mute">Dono da plataforma</span>
          </div>
        </li>
        <li>
          <ThemeToggle emGrupo />
        </li>
        <li>
          <InstalarCortai emGrupo />
        </li>
        <li className="rounded-[12px] bg-[var(--figaro-surface-container,var(--ink2))] px-4">
          <Link
            to="/admin/ajustes"
            className="grid min-h-12 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 py-3"
          >
            <Palette size={18} className="text-mute" />
            <span className="text-sm text-paper">Configurações da plataforma</span>
            <ChevronRight size={16} className="text-mute2" />
          </Link>
        </li>
        <li className="rounded-[12px] bg-[var(--figaro-surface-container,var(--ink2))] px-4">
          <Button
            type="button"
            variant="ghost"
            disabled={saindo}
            onClick={() => {
              setSaindo(true);
              void sair();
            }}
            className="grid min-h-12 w-full grid-cols-[auto_minmax(0,1fr)_auto] justify-start gap-4 rounded-[12px] px-0 py-3 text-left font-medium"
          >
            <LogOut size={18} className="text-mute" />
            <span className="text-sm text-paper">{saindo ? "Saindo…" : "Sair da conta"}</span>
            <span className="text-xs text-mute2">Encerrar sessão</span>
          </Button>
        </li>
      </ul>
      <PreferenciasDicas />
      <PreferenciasDePrivacidade />
    </AdminScreen>
  );
}
