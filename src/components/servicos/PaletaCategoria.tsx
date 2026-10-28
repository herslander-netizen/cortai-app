import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CORES_CATEGORIA, type CorCategoria } from "@/lib/categorias-servicos";

export function PaletaCategoria({
  value,
  onChange,
  disabled = false,
}: {
  value: CorCategoria;
  onChange: (cor: CorCategoria) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-5 gap-2 rounded-[20px] bg-[var(--figaro-surface-container,var(--ink2))] p-3">
      {CORES_CATEGORIA.map((cor) => {
        const selecionada = value === cor.valor;
        return (
          <Button
            key={cor.valor}
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Cor ${cor.rotulo}`}
            aria-pressed={selecionada}
            disabled={disabled}
            onClick={() => onChange(cor.valor)}
            className={`mx-auto size-11 rounded-full p-1 transition-transform active:scale-[0.96] motion-reduce:transition-none ${selecionada ? "ring-2 ring-[var(--figaro-primary,var(--primary))] ring-offset-2 ring-offset-[var(--figaro-surface-container,var(--ink2))]" : ""}`}
          >
            <span
              className="grid size-8 place-items-center rounded-full"
              style={{ backgroundColor: cor.css }}
              aria-hidden
            >
              {selecionada ? <Check size={16} className="text-[var(--figaro-on-primary,var(--paper))]" /> : null}
            </span>
          </Button>
        );
      })}
    </div>
  );
}
