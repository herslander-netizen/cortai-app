import { Plus } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BotaoCircularAdicionarProps = Omit<ButtonProps, "children" | "size" | "variant"> & {
  menuAberto?: boolean;
};

/**
 * FAB circular da Agenda: anel na cor de ação e núcleo/ícone ligados aos tokens
 * de superfície, mantendo contraste equivalente nos temas claro e escuro.
 */
export function BotaoCircularAdicionar({
  className,
  menuAberto = false,
  style,
  ...props
}: BotaoCircularAdicionarProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        "agenda-fab-toggle shrink-0 rounded-full border-[3px] border-solid p-[3px]",
        "bg-transparent hover:bg-transparent active:bg-transparent active:scale-100",
        className,
      )}
      style={{
        width: "var(--agenda-fab-tamanho)",
        minWidth: "var(--agenda-fab-tamanho)",
        height: "var(--agenda-fab-tamanho)",
        backgroundColor: "transparent",
        borderColor: "var(--agenda-acao)",
        boxShadow: "var(--elevacao-6)",
        filter: "none",
        ...style,
      }}
      {...props}
    >
      <span
        aria-hidden="true"
        className="grid size-full place-items-center rounded-full border text-[var(--paper)]"
        style={{ backgroundColor: "var(--figaro-surface-container-low, var(--painel, var(--ink3)))", borderColor: "var(--line)" }}
      >
        <Plus
          aria-hidden="true"
          size={24}
          className={cn("agenda-fab-icone", menuAberto && "agenda-fab-icone-aberto")}
          style={{ color: "var(--paper)" }}
        />
      </span>
    </Button>
  );
}
