import { Button } from "@/components/ui/button";
import type { Chip } from "./tipos";

/** Sugestões tocáveis (48 px). Na barra rolam na horizontal; nas bolhas quebram linha. */
export function ChipsDeSugestao({ chips, quebrar = false }: { chips: Chip[]; quebrar?: boolean }) {
  if (!chips.length) return null;
  return (
    <div
      className={
        quebrar
          ? "flex flex-wrap gap-2"
          : "flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      }
      role="group"
      aria-label="Sugestões"
    >
      {chips.map((chip) =>
        chip.href ? (
          <Button
            key={chip.rotulo}
            asChild
            variant="outline"
            className="h-12 shrink-0 rounded-full px-4"
          >
            <a href={chip.href} target="_blank" rel="noreferrer">
              {chip.rotulo}
            </a>
          </Button>
        ) : (
          <Button
            key={chip.rotulo}
            type="button"
            variant="outline"
            className="h-12 shrink-0 rounded-full px-4"
            onClick={chip.acao}
          >
            {chip.rotulo}
          </Button>
        ),
      )}
    </div>
  );
}
