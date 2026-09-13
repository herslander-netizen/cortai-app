import { createFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";

import { MarcaCortai } from "@/components/marca/MarcaCortai";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cortaí — entrar ou criar conta" },
      {
        name: "description",
        content: "Entre no Cortaí ou crie sua conta para agendar e gerenciar sua barbearia.",
      },
      { property: "og:title", content: "Cortaí" },
      {
        property: "og:description",
        content: "Entre ou crie sua conta. Agenda • Clientes • Loja • Fidelidade.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://cortai.dev/og-cortai.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://cortai.dev/og-cortai.jpg" },
    ],
  }),
  component: Entrada,
});

/**
 * Porta de entrada: nada aqui depende do servidor. A apresentação completa
 * continua viva em /apresentacao, mas deixou de ser barreira para entrar.
 */
function Entrada() {
  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col justify-center px-6 py-10">
      <div className="flex justify-center">
        <MarcaCortai tamanho="lg" />
      </div>

      <h1 className="mt-8 text-center text-[26px] font-bold leading-tight text-paper">
        Sua barbearia, no controle.
      </h1>
      <p className="mt-2 text-center text-sm text-mute">
        Agenda • Clientes • Loja • Fidelidade
      </p>

      <div className="mt-9 space-y-3">
        <Link
          to="/login"
          className="flex h-12 w-full items-center justify-center rounded-lg bg-gold text-sm font-bold text-ink"
        >
          Entrar
        </Link>
        <Link
          to="/cadastro"
          className="flex h-12 w-full items-center justify-center rounded-lg border border-line2 bg-ink2 text-sm font-semibold text-paper"
        >
          Criar conta
        </Link>
      </div>

      <div className="mt-8 flex flex-col items-center gap-3">
        <Link
          to="/barbearias"
          className="inline-flex items-center gap-2 text-xs font-semibold text-mute transition-colors hover:text-paper"
        >
          <Search size={14} aria-hidden />
          Encontrar uma barbearia
        </Link>
        <Link to="/apresentacao" className="text-xs text-mute transition-colors hover:text-paper">
          Conhecer o Cortaí
        </Link>
      </div>
    </main>
  );
}
