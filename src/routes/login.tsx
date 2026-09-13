import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { FormularioAcesso } from "@/components/acesso/FormularioAcesso";
import { MarcaCortai } from "@/components/marca/MarcaCortai";

export const Route = createFileRoute("/login")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { proximo?: string } =>
    typeof search["proximo"] === "string" && search["proximo"]
      ? { proximo: search["proximo"] }
      : {},
  head: () => ({
    meta: [
      { title: "Entrar — Cortaí" },
      {
        name: "description",
        content: "Acesse seus horários ou a gestão da sua barbearia no Cortaí.",
      },
      { property: "og:title", content: "Entrar — Cortaí" },
      { property: "og:description", content: "Seu acesso ao Cortaí." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { proximo } = Route.useSearch();
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
        Entrar no Cortaí
      </h1>
      <FormularioAcesso modo="entrar" proximo={proximo} />
    </main>
  );
}
