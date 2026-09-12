import { createFileRoute, Link } from "@tanstack/react-router";
import { Scissors } from "lucide-react";

import { DescobrirBarbearias } from "@/components/cliente/DescobrirBarbearias";
import { Signature } from "@/components/layout/Signature";
import { SolicitarProjeto } from "@/components/institucional/SolicitarProjeto";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cortaí — Encontre sua barbearia e agende" },
      {
        name: "description",
        content:
          "Busque barbearias por nome ou endereço, veja serviços e agende seu horário pelo Cortaí.",
      },
      { property: "og:title", content: "Cortaí — Encontre sua barbearia e agende" },
      {
        property: "og:description",
        content: "Descubra barbearias ativas e agende seu horário em poucos toques.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Descoberta,
});

function Descoberta() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[520px] flex-col px-5 pb-10 pt-10">
      <header className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-ink2 text-gold">
            <Scissors size={20} aria-hidden />
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-gold">Cortaí</span>
        </span>
        <Link to="/login" className="text-sm font-semibold text-paper">
          Entrar
        </Link>
      </header>

      <main className="flex-1 pt-10">
        <h1 className="sr-only">Cortaí — encontre sua barbearia</h1>
        <DescobrirBarbearias />
        <SolicitarProjeto />
      </main>

      <footer className="mt-10 border-t border-line pt-6 text-center">
        <p className="text-[11px] text-mute">Cortaí — agendamento para barbearias.</p>
        <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-mute2">by Alvo Digital</p>
        <p className="mt-1 text-[10px] text-mute2">© 2026 Alvo Digital</p>
      </footer>
      <Signature />
    </div>
  );
}
