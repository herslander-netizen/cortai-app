import { HelpCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useGuia } from "./GuiaProvider";
import { useModoFoco } from "@/lib/modo-foco";

export function BotaoAjuda() {
  const foco = useModoFoco();
  const { guiaDisponivel, abrirGuia, emAndamento, prefs } = useGuia();
  if (foco || !guiaDisponivel || emAndamento) return null;
  return (
    <Button
      variant="icon"
      size="icon"
      type="button"
      onClick={abrirGuia}
      aria-label={`Ver dicas de ${guiaDisponivel.nome}`}
      title="Ver dicas desta tela"
      className="relative h-12 w-12 shrink-0 rounded-full border border-line text-mute transition-colors hover:border-gold hover:text-gold"
    >
      <HelpCircle size={17} strokeWidth={1.7} aria-hidden />
      <span className="sr-only">{prefs.ativo ? "Ajuda" : "Ajuda (dicas desligadas)"}</span>
    </Button>
  );
}
