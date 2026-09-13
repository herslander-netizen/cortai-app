import { MoreVertical, Share } from "lucide-react";

/** Instrução real de instalação manual, escrita para o navegador do usuário. */
export function PassosDeInstalacao({
  sistema,
  className = "",
}: {
  sistema: "ios" | "android" | "outro";
  className?: string;
}) {
  const Icone = sistema === "ios" ? Share : MoreVertical;
  return (
    <p
      className={`flex items-start gap-2 rounded-lg border border-line bg-ink px-3 py-2.5 text-xs leading-relaxed text-mute ${className}`}
      role="note"
    >
      <Icone size={14} className="mt-0.5 shrink-0 text-gold" aria-hidden />
      {sistema === "ios" ? (
        <span>
          Toque em <span className="text-paper">Compartilhar</span> e depois em{" "}
          <span className="text-paper">Adicionar à Tela de Início</span>.
        </span>
      ) : sistema === "android" ? (
        <span>
          Abra o menu <span className="text-paper">⋮</span> do navegador e toque em{" "}
          <span className="text-paper">Instalar aplicativo</span> ou{" "}
          <span className="text-paper">Adicionar à tela inicial</span>.
        </span>
      ) : (
        <span>
          No seu navegador, procure o ícone de <span className="text-paper">instalar</span> na barra
          de endereço.
        </span>
      )}
    </p>
  );
}
