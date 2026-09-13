import { createFileRoute, Outlet } from "@tanstack/react-router";
import { exigirPapel } from "@/lib/guarda";
import { Building2, ClipboardList, CreditCard, Handshake, LineChart, Palette, SlidersHorizontal, UserRound } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { MarcaCortai } from "@/components/marca/MarcaCortai";

const tabs = [
  { to: "/admin", label: "Visão geral", icon: LineChart },
  { to: "/admin/barbearias", label: "Barbearias", icon: Building2 },
  { to: "/admin/recursos", label: "Recursos e planos", icon: SlidersHorizontal },
  { to: "/admin/monetizacao", label: "Monetização", icon: CreditCard },
  { to: "/admin/ajustes", label: "Design system", icon: Palette },
  { to: "/admin/parceiros", label: "Parceiros", icon: Handshake },
  { to: "/admin/pedidos", label: "Pedidos", icon: ClipboardList },
  { to: "/admin/perfil", label: "Perfil", icon: UserRound },
] as const;

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: () => exigirPapel("admin"),
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <div className="min-h-screen bg-ink md:grid md:grid-cols-[220px_1fr]">
      <aside className="hidden border-r border-line px-5 py-8 md:block">
        <MarcaCortai variante="escura" className="h-auto w-36" prioridade /><p className="mt-2 text-xs text-mute">Dono da plataforma</p>
        <nav className="mt-10 space-y-1" aria-label="Painel da plataforma">{tabs.map((item) => { const Icon = item.icon; return <Link key={item.to} to={item.to} activeOptions={{ exact: item.to === "/admin" }} className="flex items-center gap-3 rounded-md px-3 py-3 text-sm text-mute" activeProps={{ className: "bg-ink2 text-paper" }}><Icon size={17} />{item.label}</Link>; })}</nav>
      </aside>
      <Outlet />
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-ink md:hidden" aria-label="Painel da plataforma"><ul className="grid grid-cols-4 gap-y-1 py-1">{tabs.map((item) => { const Icon = item.icon; return <li key={item.to}><Link to={item.to} activeOptions={{ exact: item.to === "/admin" }} className="flex flex-col items-center gap-1 py-3 text-mute" activeProps={{ className: "text-paper" }}><Icon size={19}/><span className="text-[10px]">{item.label}</span></Link></li>; })}</ul></nav>
    </div>
  );
}
