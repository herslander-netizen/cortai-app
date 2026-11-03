import type { CSSProperties, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export const suaveDemo: CSSProperties = {
  color: "var(--figaro-on-primary)",
  opacity: 0.72,
  fontSize: 10,
  fontWeight: 600,
};

export const cartaoDemo: CSSProperties = {
  borderRadius: 12,
  padding: 12,
  background: "color-mix(in oklab, var(--figaro-on-primary) 9%, transparent)",
  border: "1px solid color-mix(in oklab, var(--figaro-on-primary) 16%, transparent)",
};

export function Aparelho({ children, nome }: { children: ReactNode; nome: string }) {
  return (
    <div
      className="entrada-demo relative flex h-full min-h-0 w-full items-center justify-center overflow-hidden"
      role="img"
      aria-label={nome}
      style={{
        background: "var(--figaro-primary)",
        color: "var(--figaro-on-primary)",
        borderRadius: 20,
        margin: 10,
        width: "calc(100% - 20px)",
        height: "calc(100% - 20px)",
        boxSizing: "border-box",
        padding: 12,
      }}
    >
      <span
        className="absolute right-3 top-3 rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wider"
        style={{
          color: "var(--figaro-on-primary)",
          background: "color-mix(in oklab, var(--figaro-on-primary) 14%, transparent)",
        }}
      >
        Exemplo visual
      </span>
      {children}
    </div>
  );
}

export function CabecalhoDemo({
  icone: Icone,
  titulo,
  detalhe,
}: {
  icone: LucideIcon;
  titulo: string;
  detalhe: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <span
          className="grid size-8 shrink-0 place-items-center rounded-lg"
          style={{
            background: "color-mix(in oklab, var(--figaro-on-primary) 12%, transparent)",
            color: "var(--figaro-on-primary)",
          }}
        >
          <Icone size={16} aria-hidden />
        </span>
        <div className="min-w-0">
          <b className="block truncate text-xs">{titulo}</b>
          <span style={suaveDemo}>{detalhe}</span>
        </div>
      </div>
      <span
        className="shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold"
        style={{
          background: "color-mix(in oklab, var(--figaro-tertiary) 18%, transparent)",
          color: "var(--figaro-on-primary)",
        }}
      >
        Exemplo
      </span>
    </div>
  );
}
