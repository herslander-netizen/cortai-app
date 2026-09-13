import type { ReactNode } from "react";
import { Info, TriangleAlert, CircleAlert, CircleCheck } from "lucide-react";

export type TomDeAviso = "info" | "atencao" | "sucesso" | "acao";

const TOM = {
  info: {
    Icone: Info,
    faixa: "bg-paper",
    icone: "text-paper",
    fundo: "bg-ink3",
    titulo: "text-paper",
  },
  atencao: {
    Icone: TriangleAlert,
    faixa: "bg-gold",
    icone: "text-gold",
    fundo: "bg-gold-soft",
    titulo: "text-gold",
  },
  sucesso: {
    Icone: CircleCheck,
    faixa: "bg-sage",
    icone: "text-sage",
    fundo: "bg-sage-soft",
    titulo: "text-sage",
  },
  acao: {
    Icone: CircleAlert,
    faixa: "bg-brick",
    icone: "text-brick",
    fundo: "bg-brick-soft",
    titulo: "text-brick",
  },
} as const;


/**
 * Linguagem única de aviso do Cortaí: faixa lateral sólida + ícone + texto
 * em alto contraste. Nunca parece card de conteúdo nem item de navegação.
 */
export function Aviso({
  tom = "info",
  titulo,
  children,
  acao,
  className = "",
}: {
  tom?: TomDeAviso;
  titulo?: string;
  children?: ReactNode;
  acao?: ReactNode;
  className?: string;
}) {
  const t = TOM[tom];
  const Icone = t.Icone;
  return (
    <div
      role={tom === "info" ? "status" : "alert"}
      className={`flex items-stretch overflow-hidden rounded-lg ${t.fundo} ${className}`}
    >
      <span aria-hidden className={`w-1 shrink-0 ${t.faixa}`} />
      <div className="flex flex-1 items-start gap-3 px-4 py-3.5">
        <Icone size={17} className={`mt-0.5 shrink-0 ${t.icone}`} />
        <div className="min-w-0 flex-1">
          {titulo ? <p className={`text-sm font-semibold leading-snug ${t.titulo}`}>{titulo}</p> : null}
          {children ? (
            <div className={`text-sm leading-relaxed text-paper ${titulo ? "mt-1" : ""}`}>{children}</div>
          ) : null}
          {acao ? <div className="mt-2.5 flex flex-wrap gap-3">{acao}</div> : null}
        </div>
      </div>
    </div>
  );
}
