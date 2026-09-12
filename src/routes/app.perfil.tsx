import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, LogIn, UserRound, Wallet } from "lucide-react";
import { Screen } from "@/components/layout/Screen";

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
  component: () => (
    <Screen title="Perfil" subtitle="Sua conta no Cortaí.">
      <div className="flex items-center gap-4 border-b border-line pb-6"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-ink2 text-gold"><UserRound size={22} /></span><div><p className="font-semibold text-paper">Meu perfil</p><p className="mt-1 text-xs text-mute">Acesse para sincronizar seus horários</p></div></div>
      <ul className="mt-3">
        <li className="border-b border-line"><Link to="/app/carteira" className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 py-5"><Wallet size={18} className="text-mute" /><span className="text-sm text-paper">Carteira e fidelidade</span><ChevronRight size={16} className="text-mute2" /></Link></li>
        <li className="border-b border-line"><Link to="/login" className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 py-5"><LogIn size={18} className="text-mute" /><span className="text-sm text-paper">Entrar na minha conta</span><ChevronRight size={16} className="text-mute2" /></Link></li>
      </ul>
      <Link to="/login" className="mt-10 block text-center text-xs text-mute">É dono ou profissional de uma barbearia? <span className="font-semibold text-paper">Acessar Cortaí Gestão →</span></Link>
    </Screen>
  ),
});
