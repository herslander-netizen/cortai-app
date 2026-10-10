import { Link } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

import type { Lacuna } from "@/lib/pagina-pendencias";

/** Avisa o que falta para o cliente conseguir agendar. Não impede de publicar. */
export function LacunasDaPagina({ lacunas }: { lacunas: Lacuna[] }) {
  if (lacunas.length === 0) return null;
  return (
    <section
      aria-label="O que falta para receber agendamentos"
      className="mt-3 rounded-lg border border-gold/40 bg-gold-soft p-3 text-sm"
    >
      <p className="flex items-center gap-2 font-semibold text-paper">
        <TriangleAlert aria-hidden className="size-4 shrink-0" />A página pode ser publicada, mas
        ainda falta:
      </p>
      <ul className="mt-2 space-y-1">
        {lacunas.map((l) => (
          <li key={l.chave}>
            <Link
              to={l.destino}
              className="flex min-h-12 items-center text-paper underline underline-offset-4"
            >
              {l.rotulo}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
