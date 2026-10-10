import { HelpCircle } from "lucide-react";
import { useGuia } from "./GuiaProvider";
import { useModoFoco } from "@/lib/modo-foco";

export function BotaoAjuda() {
  const foco = useModoFoco();
  const { guiaDisponivel, abrirGuia, emAndamento, prefs } = useGuia();
  if (foco || !guiaDisponivel || emAndamento) return null;
  return (
    <button
      type="button"
      onClick={abrirGuia}
      aria-label={`Ver dicas de ${guiaDisponivel.nome}`}
      title="Ver dicas desta tela"
      className="relative flex h-9 w-9 shrink-0 items-center after:absolute after:-inset-1.5 after:content-[''] justify-center rounded-full border border-line text-mute transition-colors hover:border-gold hover:text-gold"
    >
      <HelpCircle size={17} strokeWidth={1.7} aria-hidden />
      <span className="sr-only">{prefs.ativo ? "Ajuda" : "Ajuda (dicas desligadas)"}</span>
    </button>
  );
}
