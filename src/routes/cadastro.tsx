import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { FormularioAcesso } from "@/components/acesso/FormularioAcesso";
import { MarcaCortai } from "@/components/marca/MarcaCortai";

export const Route = createFileRoute("/cadastro")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Criar conta — Cortaí" },
      {
        name: "description",
        content: "Crie sua conta no Cortaí para agendar horários ou gerenciar sua barbearia.",
      },
      { property: "og:title", content: "Criar conta — Cortaí" },
      { property: "og:description", content: "Comece a usar o Cortaí em poucos minutos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CadastroPage,
});

function CadastroPage() {
  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col px-6 pb-10 pt-10">
      <Link to="/" className="inline-flex items-center gap-2 text-xs text-mute" aria-label="Voltar">
        <ArrowLeft size={15} aria-hidden />
        Voltar
      </Link>
      <div className="mt-6">
        <MarcaCortai tamanho="md" />
      </div>
      <h1 className="mt-6 text-[26px] font-bold leading-tight text-paper">
        Criar sua conta
      </h1>
      <p className="mt-2 text-sm text-mute">
        Depois você escolhe se quer agendar ou gerenciar uma barbearia.
      </p>
      <FormularioAcesso modo="criar" />
    </main>
  );
}
