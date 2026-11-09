import type { CSSProperties } from "react";
import type { PaginaConfig } from "@/lib/pagina-config";

type EstiloChat = Partial<PaginaConfig["chat"]>;

/**
 * Reutiliza os papéis semânticos escuros do Flow/Agenda.
 * Só atua quando a superfície padrão está selecionada: personalizações prevalecem.
 */
export function tokensEscurosDaAgendaParaChat(estilo?: EstiloChat): CSSProperties {
  if (estilo?.superficie && estilo.superficie !== "padrao") return {};
  return {
    "--chat-page": "var(--identity-deep)",
    "--chat-page-text": "var(--identity-off-white)",
    "--chat-superficie-1": "color-mix(in oklab, var(--identity-deep) 88%, var(--identity-off-white))",
    "--chat-superficie-2": "color-mix(in oklab, var(--identity-deep) 80%, var(--identity-off-white))",
    "--chat-texto-auxiliar": "var(--identity-muted)",
    ...((estilo?.corDestaque ?? "azul") === "azul"
      ? {
          "--chat-primary": "var(--figaro-action-blue)",
          "--chat-primary-foreground": "var(--figaro-on-action-blue)",
        }
      : {}),
  } as CSSProperties;
}
