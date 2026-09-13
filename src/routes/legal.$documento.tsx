import { createFileRoute, Link, notFound } from "@tanstack/react-router";

import { PaginaLegal } from "@/components/legal/PaginaLegal";
import { acharDocumento } from "@/lib/legal/documentos";

export const Route = createFileRoute("/legal/$documento")({
  loader: ({ params }) => {
    const documento = acharDocumento(params.documento);
    if (!documento) throw notFound();
    return { documento };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Documento não encontrado — Cortaí" }, { name: "robots", content: "noindex" }],
      };
    }
    const { documento } = loaderData;
    const titulo = `${documento.titulo} — Cortaí`;
    return {
      meta: [
        { title: titulo },
        { name: "description", content: documento.resumo },
        { property: "og:title", content: titulo },
        { property: "og:description", content: documento.resumo },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  errorComponent: DocumentoIndisponivel,
  notFoundComponent: DocumentoIndisponivel,
  component: DocumentoPage,
});

function DocumentoPage() {
  const { documento } = Route.useLoaderData();
  return <PaginaLegal documento={documento} />;
}

function DocumentoIndisponivel() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[680px] flex-col justify-center px-5 text-center">
      <h1 className="text-xl font-bold text-paper">Documento não encontrado</h1>
      <p className="mt-2 text-sm text-mute">Este documento pode ter sido renomeado ou substituído.</p>
      <Link to="/legal" className="mt-6 text-sm font-semibold text-gold">
        Ver informações legais
      </Link>
    </div>
  );
}
