import { Link } from "@tanstack/react-router";

import { DOCUMENTOS } from "@/lib/legal/documentos";

/** Bloco compacto de rodapé. Em telas pequenas quebra em duas colunas discretas. */
export function LinksLegais({ className = "" }: { className?: string }) {
  return (
    <nav aria-label="Informações legais" className={className}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-mute2">Informações legais</p>
      <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-left sm:flex sm:flex-wrap sm:justify-center sm:gap-x-5">
        {DOCUMENTOS.map((doc) => (
          <li key={doc.slug}>
            <Link
              to="/legal/$documento"
              params={{ documento: doc.slug }}
              className="text-[11px] leading-relaxed text-mute2 transition-colors hover:text-paper"
            >
              {doc.rotulo}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Uma linha só, para telas autenticadas e formulários. */
export function LinhaLegal({ className = "" }: { className?: string }) {
  return (
    <p className={`text-[11px] text-mute2 ${className}`}>
      <Link to="/legal/$documento" params={{ documento: "termos-de-uso" }} className="transition-colors hover:text-paper">
        Termos de Uso
      </Link>
      <span aria-hidden> · </span>
      <Link to="/legal/$documento" params={{ documento: "privacidade" }} className="transition-colors hover:text-paper">
        Privacidade
      </Link>
      <span aria-hidden> · </span>
      <Link to="/legal" className="transition-colors hover:text-paper">
        Todos os documentos
      </Link>
    </p>
  );
}
