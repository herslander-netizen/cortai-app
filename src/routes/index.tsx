import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarCheck, Scissors, Store, Wallet } from "lucide-react";

import { DescobrirBarbearias } from "@/components/cliente/DescobrirBarbearias";
import { FaixaDeParceiros } from "@/components/institucional/FaixaDeParceiros";
import { Signature } from "@/components/layout/Signature";
import { SolicitarProjeto } from "@/components/institucional/SolicitarProjeto";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cortaí — agendamento premium para barbearias" },
      {
        name: "description",
        content:
          "O Cortaí organiza agenda, carteira e fidelidade da sua barbearia. Clientes agendam em poucos toques.",
      },
      { property: "og:title", content: "Cortaí — agendamento premium para barbearias" },
      {
        property: "og:description",
        content: "Agenda, carteira e fidelidade em um só lugar, com a cara da sua barbearia.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Inicio,
});

const DESTAQUES = [
  { icone: CalendarCheck, titulo: "Agenda organizada", texto: "Horários confirmados sem troca de mensagens." },
  { icone: Wallet, titulo: "Carteira e fidelidade", texto: "Créditos, planos e recompensas no mesmo lugar." },
  { icone: Store, titulo: "Sua marca em primeiro lugar", texto: "Página pública com o nome e as cores da barbearia." },
];

function Inicio() {
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

      <main className="flex-1 pt-12">
        <h1 className="max-w-[15ch] text-[32px] font-bold leading-tight text-paper">
          Seu próximo corte começa aqui.
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-mute">
          O Cortaí é a plataforma de agendamento das barbearias que querem atender melhor — sem papel, sem fila de
          mensagens.
        </p>

        <div className="mt-7 flex flex-wrap gap-3">
          <Link to="/login" className="flex h-12 items-center rounded-lg bg-gold px-5 text-sm font-bold text-ink">
            Entrar no Cortaí
          </Link>
          <Link
            to="/comecar"
            className="flex h-12 items-center rounded-lg border border-line2 bg-ink2 px-5 text-sm font-semibold text-paper"
          >
            Tenho uma barbearia
          </Link>
        </div>

        <ul className="mt-10 space-y-3">
          {DESTAQUES.map((item) => {
            const Icone = item.icone;
            return (
              <li key={item.titulo} className="flex gap-3 rounded-xl border border-line bg-ink2 px-4 py-4">
                <Icone size={18} className="mt-0.5 shrink-0 text-gold" aria-hidden />
                <span>
                  <span className="block text-sm font-semibold text-paper">{item.titulo}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-mute">{item.texto}</span>
                </span>
              </li>
            );
          })}
        </ul>

        <DescobrirBarbearias discreto />

        <FaixaDeParceiros />

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
