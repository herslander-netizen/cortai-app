import { HelpCircle } from "lucide-react";
import { useGuia } from "./GuiaProvider";

export function BotaoAjuda() {
  const { guiaDisponivel, abrirGuia, emAndamento, prefs } = useGuia();
  if (!guiaDisponivel || emAndamento) return null;
  return (
    <button
      type="button"
      onClick={abrirGuia}
      aria-label={`Ver dicas de ${guiaDisponivel.nome}`}
      title="Ver dicas desta tela"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-mute transition-colors hover:border-gold hover:text-gold"
    >
      <HelpCircle size={17} strokeWidth={1.7} aria-hidden />
      <span className="sr-only">{prefs.ativo ? "Ajuda" : "Ajuda (dicas desligadas)"}</span>
    </button>
  );
}
