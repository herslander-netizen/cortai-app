import { IndicadorDeCarregamento } from "@/components/ui/IndicadorDeCarregamento";
import { cn } from "@/lib/utils";

/** Indicador pequeno de carregamento: o mesmo do Figaro (`IndicadorDeCarregamento`), em 16 px. */
function Spinner({ className }: { className?: string }) {
  return <IndicadorDeCarregamento tamanho={16} className={cn("text-current", className)} />;
}

export { Spinner };
