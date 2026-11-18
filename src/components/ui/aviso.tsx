import type { ReactNode } from "react";
import { Info, TriangleAlert, CircleAlert, CircleCheck } from "lucide-react";

export type TomDeAviso = "info" | "atencao" | "sucesso" | "acao";

const TOM = {
  info: {
    Icone: Info,
    faixa: "bg-paper",
    icone: "text-paper",
  },
  atencao: {
    Icone: TriangleAlert,
    faixa: "bg-gold",
    icone: "text-gold",
  },
  sucesso: {
    Icone: CircleCheck,
    faixa: "bg-sage",
    icone: "text-sage",
  },
  acao: {
    Icone: CircleAlert,
    faixa: "bg-brick",
    icone: "text-brick",
  },
} as const;

/**
 * Avisos em superfície neutra para garantir legibilidade nos modos claro/escuro.
 * A faixa e o ícone indicam o tipo de mensagem sem tingir o fundo nem o título.
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
      className={`flex items-stretch overflow-hidden rounded-lg border border-line bg-ink2 ${className}`}
    >
      <span aria-hidden className={`w-1 shrink-0 ${t.faixa}`} />
      <div className="flex flex-1 items-start gap-3 px-4 py-3.5">
        <Icone size={17} className={`mt-0.5 shrink-0 ${t.icone}`} />
        <div className="min-w-0 flex-1">
          {titulo ? (
            <p className="text-sm font-semibold leading-snug text-paper">{titulo}</p>
          ) : null}
          {children ? (
            <div className={`text-sm leading-relaxed text-paper ${titulo ? "mt-1" : ""}`}>
              {children}
            </div>
          ) : null}
          {acao ? <div className="mt-2.5 flex flex-wrap gap-3">{acao}</div> : null}
        </div>
      </div>
    </div>
  );
}
