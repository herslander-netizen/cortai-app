import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Signature } from "@/components/layout/Signature";
import { DOCUMENTOS } from "@/lib/legal/documentos";

export const Route = createFileRoute("/legal/")({
  head: () => ({
    meta: [
      { title: "Informações legais — Cortaí" },
      {
        name: "description",
        content: "Termos de uso, privacidade, cookies e políticas de agendamento do Cortaí.",
      },
      { property: "og:title", content: "Informações legais — Cortaí" },
      { property: "og:description", content: "Documentos que regulam o uso da plataforma Cortaí." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: IndiceLegal,
});

function IndiceLegal() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto w-full max-w-[680px] px-5 pb-4 pt-8">
        <Link to="/" className="inline-flex items-center gap-1 text-xs text-mute transition-colors hover:text-paper">
          <ChevronLeft size={14} aria-hidden />
          Início
        </Link>

        <header className="mt-5 border-b border-line pb-6">
          <h1 className="text-[26px] font-bold leading-tight text-paper md:text-[30px]">Informações legais</h1>
          <p className="mt-3 text-sm leading-relaxed text-mute">
            Os documentos que regulam o uso do Cortaí por clientes, barbearias e profissionais.
          </p>
        </header>

        <ul className="pt-2">
          {DOCUMENTOS.map((doc) => (
            <li key={doc.slug} className="border-b border-line/60">
              <Link
                to="/legal/$documento"
                params={{ documento: doc.slug }}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-5 transition-colors hover:bg-ink2/50"
              >
                <span className="min-w-0">
                  <span className="block text-[15px] font-semibold text-paper">{doc.titulo}</span>
                  <span className="mt-1 block text-[13px] leading-relaxed text-mute">{doc.resumo}</span>
                  <span className="mt-2 block text-[11px] text-mute2">
                    Versão {doc.versao} · {doc.atualizadoEm}
                  </span>
                </span>
                <ChevronRight size={16} className="shrink-0 text-mute2" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="mx-auto w-full max-w-[680px]">
        <Signature />
      </div>
    </div>
  );
}
