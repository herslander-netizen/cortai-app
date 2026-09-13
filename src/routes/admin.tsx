import { createFileRoute, Outlet } from "@tanstack/react-router";
import { exigirPapel } from "@/lib/guarda";
import { Building2, ClipboardList, Handshake, LineChart, Menu, Palette, SlidersHorizontal, UserRound } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { MarcaCortai } from "@/components/marca/MarcaCortai";

const tabs = [
  { to: "/admin", label: "Visão geral", icon: LineChart },
  { to: "/admin/barbearias", label: "Barbearias", icon: Building2 },
  { to: "/admin/recursos", label: "Recursos e planos", icon: SlidersHorizontal },
  { to: "/admin/ajustes", label: "Design system", icon: Palette },
  { to: "/admin/parceiros", label: "Parceiros", icon: Handshake },
  { to: "/admin/pedidos", label: "Pedidos", icon: ClipboardList },
  { to: "/admin/perfil", label: "Perfil", icon: UserRound },
] as const;

const tabsMobile = [
  { to: "/admin", label: "Visão geral", icon: LineChart },
  { to: "/admin/barbearias", label: "Barbearias", icon: Building2 },
  { to: "/admin/recursos", label: "Planos", icon: SlidersHorizontal },
  { to: "/admin/mais", label: "Mais", icon: Menu },
] as const;

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Administração da plataforma — Cortaí" },
    { name: "description", content: "Gestão central da plataforma Cortaí." },
    { property: "og:title", content: "Administração da plataforma — Cortaí" },
    { property: "og:description", content: "Gestão central da plataforma Cortaí." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  beforeLoad: () => exigirPapel("admin"),
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <div className="min-h-screen bg-ink md:grid md:grid-cols-[220px_1fr]">
      <aside className="hidden border-r border-line px-5 py-8 md:block">
        <MarcaCortai tamanho="sm" /><p className="mt-3 text-xs text-mute">Administração da plataforma</p>
        <nav className="mt-10 space-y-1" aria-label="Painel da plataforma">{tabs.map((item) => { const Icon = item.icon; return <Link key={item.to} to={item.to} activeOptions={{ exact: item.to === "/admin" }} className="flex items-center gap-3 rounded-md px-3 py-3 text-sm text-mute" activeProps={{ className: "bg-ink2 text-paper" }}><Icon size={17} />{item.label}</Link>; })}</nav>
      </aside>
      <Outlet />
       <nav className="bottom-nav fixed inset-x-0 bottom-0 z-20 md:hidden" aria-label="Painel da plataforma"><ul className="grid grid-cols-4">{tabsMobile.map((item) => { const Icon = item.icon; return <li key={item.to} className="min-w-0"><Link to={item.to} activeOptions={{ exact: item.to === "/admin" }} className="flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 px-1 text-mute" activeProps={{ className: "text-gold", "aria-current": "page" }}><Icon size={19}/><span className="w-full truncate text-center text-[10px]">{item.label}</span></Link></li>; })}</ul></nav>
    </div>
  );
}
