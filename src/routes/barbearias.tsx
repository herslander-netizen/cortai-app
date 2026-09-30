import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { DescobrirBarbearias } from "@/components/cliente/DescobrirBarbearias";
import { FaixaDeParceiros } from "@/components/institucional/FaixaDeParceiros";
import { Signature } from "@/components/layout/Signature";

export const Route = createFileRoute("/barbearias")({
  head: () => ({
    meta: [
      { title: "Encontrar um negócio de Beleza — Cortaí" },
      {
        name: "description",
        content: "Busque um negócio pelo nome ou endereço e agende seu horário em poucos toques no Cortaí.",
      },
      { property: "og:title", content: "Encontrar um negócio de Beleza — Cortaí" },
      { property: "og:description", content: "Busque um negócio e agende seu horário em poucos toques." },
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
    <div className="mx-auto flex min-h-screen w-full max-w-[520px] flex-col px-5 pb-10 pt-8">
      <header className="flex items-center justify-between gap-4">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-mute transition-colors hover:text-paper">
          <ArrowLeft size={16} aria-hidden />
          Cortaí
        </Link>
        <Link to="/login" className="text-sm font-semibold text-paper">
          Entrar
        </Link>
      </header>

      <main className="flex-1 pt-10">
        <DescobrirBarbearias />
        <FaixaDeParceiros />
      </main>

      <Signature />
    </div>
  );
}
