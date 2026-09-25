import { createFileRoute, Outlet } from "@tanstack/react-router";
import { exigirPapel } from "@/lib/guarda";
import { Building2, CreditCard, LineChart, Menu } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { MarcaCortai } from "@/components/marca/MarcaCortai";
import { ConviteDeInstalacao } from "@/components/pwa/ConviteDeInstalacao";

const tabs = [
  { to: "/admin", label: "Visão geral", icon: LineChart },
  { to: "/admin/barbearias", label: "Barbearias", icon: Building2 },
  { to: "/admin/monetizacao", label: "Monetização", icon: CreditCard },
  { to: "/admin/mais", label: "Mais", icon: Menu },
] as const;

const desktopGroups = [
  { label: "Principal", items: tabs.slice(0, 2) },
  { label: "Comercial", items: tabs.slice(2, 3) },
  { label: "Administração", items: tabs.slice(3) },
] as const;

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: () => exigirPapel("admin"),
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <div className="admin-shell min-h-screen bg-ink md:grid md:grid-cols-[220px_1fr]">
      <aside className="hidden border-r border-line px-5 py-8 md:block">
        <MarcaCortai variante="escura" className="h-auto w-36" prioridade /><p className="mt-2 text-xs text-mute">Dono da plataforma</p>
        <nav className="mt-10 space-y-7" aria-label="Painel da plataforma">{desktopGroups.map((group) => <section key={group.label}><p className="mb-2 px-3 text-[10px] font-semibold uppercase text-mute2">{group.label}</p><div className="space-y-1">{group.items.map((item) => { const Icon = item.icon; return <Link key={item.to} to={item.to} activeOptions={{ exact: item.to === "/admin" }} className="flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm text-mute transition-colors hover:bg-ink2 hover:text-paper" activeProps={{ className: "bg-ink2 text-paper" }}><Icon size={17} />{item.label}</Link>; })}</div></section>)}</nav>
      </aside>
      <Outlet />
      <ConviteDeInstalacao />
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-ink2 md:hidden" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 6px)" }} aria-label="Painel da plataforma"><ul className="mx-auto grid max-w-[520px] grid-cols-4 px-1 pt-1">{tabs.map((item) => { const Icon = item.icon; return <li key={item.to}><Link to={item.to} activeOptions={{ exact: item.to === "/admin" }} className="group mx-auto flex h-14 w-full max-w-[88px] flex-col items-center justify-center gap-1 text-mute" activeProps={{ className: "text-gold", "aria-current": "page" }}><span className="flex h-7 w-12 items-center justify-center rounded-full group-aria-[current=page]:bg-gold-soft"><Icon size={19} strokeWidth={1.75}/></span><span className="w-full truncate text-center text-[10px] font-medium">{item.label}</span></Link></li>; })}</ul></nav>
    </div>
  );
}
