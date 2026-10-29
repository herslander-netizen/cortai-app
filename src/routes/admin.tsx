import { createFileRoute, Outlet } from "@tanstack/react-router";
import { exigirPapel } from "@/lib/guarda";
import { Building2, CreditCard, LineChart, Menu, MessageCircle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { MarcaCortai } from "@/components/marca/MarcaCortai";
import { ConviteDeInstalacao } from "@/components/pwa/ConviteDeInstalacao";
import { EsqueletoCascoAdmin } from "@/components/layout/Esqueleto";
import { TabBar, type TabItem } from "@/components/layout/TabBar";

const tabs: TabItem[] = [
  { to: "/admin", label: "Visão geral", icon: LineChart },
  { to: "/admin/barbearias", label: "Negócios", icon: Building2 },
  { to: "/admin/monetizacao", label: "Monetização", icon: CreditCard },
  { to: "/admin/mais", label: "Mais", icon: Menu },
] as const;

const desktopGroups = [
  { label: "Principal", items: tabs.slice(0, 2) },
  { label: "Comercial", items: tabs.slice(2, 3) },
  {
    label: "Administração",
    items: [{ to: "/admin/whatsapp", label: "WhatsApp", icon: MessageCircle }, ...tabs.slice(3)],
  },
] as const;

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: async ({ context }) => {
    const sessao = await exigirPapel("admin");
    context.queryClient.setQueryData(["sessao"], sessao);
    return sessao;
  },
  pendingComponent: EsqueletoCascoAdmin,
  pendingMs: 1200,
  pendingMinMs: 0,
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <div className="admin-shell min-h-screen bg-ink md:grid md:grid-cols-[220px_1fr]">
      <aside className="hidden border-r border-line px-5 py-8 md:block">
        <MarcaCortai variante="automatica" className="h-16 w-36" prioridade />
        <p className="mt-2 text-xs text-mute">Dono da plataforma</p>
        <nav className="mt-10 space-y-7" aria-label="Painel da plataforma">
          {desktopGroups.map((group) => (
            <section key={group.label}>
              <p className="mb-2 px-3 text-xs font-semibold uppercase text-mute2">{group.label}</p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      activeOptions={{ exact: item.to === "/admin" }}
                      className="flex min-h-12 items-center gap-3 rounded-md px-3 py-2 text-sm text-mute transition-colors hover:bg-ink2 hover:text-paper"
                      activeProps={{
                        className: "bg-ink2 text-paper",
                        "aria-current": "page",
                      }}
                    >
                      <Icon size={17} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </nav>
      </aside>
      <Outlet />
      <ConviteDeInstalacao />
      <div className="md:hidden">
        <TabBar items={tabs} ariaLabel="Painel da plataforma" />
      </div>
    </div>
  );
}
