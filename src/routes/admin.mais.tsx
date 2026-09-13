import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, ClipboardList, LayoutTemplate, Palette, SlidersHorizontal, UserRound, UsersRound } from "lucide-react";

import { AdminScreen } from "@/components/layout/AdminScreen";

export const Route = createFileRoute("/admin/mais")({
  head: () => ({
    meta: [
      { title: "Mais — Administração CortAI" },
      { name: "description", content: "Configurações e áreas administrativas da plataforma CortAI." },
      { property: "og:title", content: "Mais — Administração CortAI" },
      { property: "og:description", content: "Configurações e áreas administrativas da plataforma." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminMaisPage,
});

const grupos = [
  {
    titulo: "Operação da plataforma",
    itens: [
      { to: "/admin/pedidos", label: "Pedidos", detail: "Solicitações e prioridades das barbearias", icon: ClipboardList },
    ],
  },
  {
    titulo: "Conteúdo público",
    itens: [
      { to: "/admin/home", label: "Home", detail: "Topo, seções, imagens e aparência da página inicial", icon: LayoutTemplate },
      { to: "/admin/parceiros", label: "Parceiros", detail: "Faixa pública e parcerias ativas", icon: UsersRound },
    ],
  },
  {
    titulo: "Configurações",
    itens: [
      { to: "/admin/ajustes", label: "Aparência e padrões", detail: "Identidade visual e configurações globais", icon: Palette },
      { to: "/admin/recursos", label: "Recursos dos planos", detail: "Matriz de disponibilidade por plano", icon: SlidersHorizontal },
      { to: "/admin/perfil", label: "Perfil", detail: "Conta e segurança do administrador", icon: UserRound },
    ],
  },
] as const;

function AdminMaisPage() {
  return (
    <AdminScreen title="Mais" subtitle="Configurações e áreas menos frequentes da plataforma.">
      <div className="space-y-8">
        {grupos.map((grupo) => (
          <section key={grupo.titulo}>
            <h2 className="mb-2 text-xs font-semibold uppercase text-mute2">{grupo.titulo}</h2>
            <ul className="divide-y divide-line border-y border-line">
              {grupo.itens.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <Link to={item.to} className="nav-list-item">
                      <span className="nav-list-icon"><Icon size={18} /></span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-paper">{item.label}</span>
                        <span className="mt-1 block text-xs text-mute">{item.detail}</span>
                      </span>
                      <ChevronRight size={17} className="shrink-0 text-mute2" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </AdminScreen>
  );
}