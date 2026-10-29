import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { DescobrirBarbearias } from "@/components/cliente/DescobrirBarbearias";
import { FaixaDeParceiros } from "@/components/institucional/FaixaDeParceiros";
import { Signature } from "@/components/layout/Signature";

export const Route = createFileRoute("/barbearias")({
  head: () => ({
    meta: [
      { title: "Encontrar um negócio de Beleza — Flow" },
      {
        name: "description",
        content:
          "Busque um negócio pelo nome ou endereço e agende seu horário em poucos toques no Flow.",
      },
      { property: "og:title", content: "Encontrar um negócio de Beleza — Flow" },
      {
        property: "og:description",
        content: "Busque um negócio e agende seu horário em poucos toques.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:url", content: "https://cortai.dev/barbearias" },
    ],
    links: [{ rel: "canonical", href: "https://cortai.dev/barbearias" }],
  }),
  component: BarbeariasPage,
});

function BarbeariasPage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[520px] flex-col px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4">
      <header className="flex items-center justify-between gap-4">
        <Link
          to="/apresentacao"
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--figaro-surface-container,var(--ink2))] px-4 text-sm text-paper transition-transform duration-200 active:scale-[0.98]"
        >
          <ArrowLeft size={16} aria-hidden />
          Flow
        </Link>
        <Link
          to="/login"
          className="inline-flex min-h-11 items-center rounded-full bg-[var(--figaro-primary-container,var(--ink2))] px-4 text-sm font-semibold text-[var(--figaro-primary,var(--primary))] transition-transform duration-200 active:scale-[0.98]"
        >
          Entrar
        </Link>
      </header>

      <main className="flex-1 pt-6">
        <DescobrirBarbearias />
        <FaixaDeParceiros />
      </main>

      <Signature variant="app" />
    </div>
  );
}
