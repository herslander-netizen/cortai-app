import { forwardRef } from "react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Botão de ação flutuante estendido do Figaro (`ExtendedFloatingActionButton`, ex.: "Salvar alterações"):
 * pílula tonal presa ao canto de baixo à direita, com ícone e rótulo. Quem usa deixa espaço no fim da tela.
 */
export const BotaoFlutuante = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, ...props }, ref) => (
    <Button
      ref={ref}
      size="lg"
      className={cn(
        "fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-30 rounded-full bg-[var(--figaro-primary)] px-6 text-[var(--figaro-on-primary)] shadow-[var(--elevacao-3)] hover:brightness-105",
        className,
      )}
      {...props}
    />
  ),
);
BotaoFlutuante.displayName = "BotaoFlutuante";
