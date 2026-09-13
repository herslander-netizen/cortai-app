import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, ClipboardList, Handshake, Palette, UserRound } from "lucide-react";

import { AdminScreen } from "@/components/layout/AdminScreen";

export const Route = createFileRoute("/admin/mais")({
  head: () => ({ meta: [
    { title: "Mais — Painel Cortaí" },
    { name: "description", content: "Parceiros, pedidos, design system e perfil do painel da plataforma." },
    { property: "og:title", content: "Mais — Painel Cortaí" },
    { property: "og:description", content: "Ferramentas da plataforma Cortaí." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: AdminMais,
});

const itens = [
  { to: "/admin/pedidos", label: "Pedidos de projeto", detail: "Solicitações recebidas", icon: ClipboardList },
  { to: "/admin/parceiros", label: "Parceiros", detail: "Faixa da página inicial", icon: Handshake },
  { to: "/admin/ajustes", label: "Design system", detail: "Cores e tipografia da plataforma", icon: Palette },
  { to: "/admin/perfil", label: "Perfil", detail: "Sua conta de administrador", icon: UserRound },
] as const;

function AdminMais() {
  return (
    <AdminScreen title="Mais" subtitle="Ferramentas da plataforma.">
      <ul>
        {itens.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.to} className="border-b border-line">
              <Link to={item.to} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 py-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-ink2 text-gold"><Icon size={18} /></span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-paper">{item.label}</span>
                  <span className="mt-0.5 block truncate text-xs text-mute">{item.detail}</span>
                </span>
                <ChevronRight size={17} className="text-mute2" />
              </Link>
            </li>
          );
        })}
      </ul>
    </AdminScreen>
  );
}
