import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Cartão de aviso do menu lateral, nas medidas do Figaro (medidas tiradas de uma captura do app a 1080 px, menu de 348 dp):
 * cantos de 28 dp, 12 dp de folga, ícone simples de 24 dp sem fundo, texto a 48 dp da borda, título 16/20 semibold,
 * texto 14/21, botões de 40 dp. Com duas linhas de texto o cartão fecha em 131 dp.
 */
export function CartaoDeAvisoDoMenu({
  icone: Icone,
  titulo,
  texto,
  children,
}: {
  icone: LucideIcon;
  titulo: string;
  texto: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[28px] bg-drawer-card p-3">
      <div className="grid grid-cols-[28px_minmax(0,1fr)] gap-x-3">
        <Icone className="mt-px size-7 text-primary/70" aria-hidden />
        <div className="min-w-0">
          <p className="text-[18px] font-semibold leading-6 text-paper">{titulo}</p>
          <p className="text-[15px] leading-[22px] text-mute">{texto}</p>
          <div className="mt-1.5 flex items-center gap-2">{children}</div>
        </div>
      </div>
    </div>
  );
}
