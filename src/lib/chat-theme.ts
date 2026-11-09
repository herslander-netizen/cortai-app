import type { CSSProperties } from "react";
import type { PaginaConfig } from "@/lib/pagina-config";

type EstiloChat = Partial<PaginaConfig["chat"]>;

/**
 * Reutiliza os papéis semânticos escuros do Flow/Agenda.
 * Só atua quando a superfície padrão está selecionada: personalizações prevalecem.
 */
export function tokensEscurosDaAgendaParaChat(estilo?: EstiloChat): CSSProperties {
  if (estilo?.superficie && estilo.superficie !== "padrao") return {};
  // Os valores são os papéis ESCUROS oficiais de src/styles.css (Figaro Material 3).
  // Não herdar a variável do :root: o root claro a redefine para uma cor clara.
  // Aplicação local, somente quando superficie === padrao.
  return {
    "--chat-page": "#1b1f1c", // --figaro-background (escuro)
    "--chat-page-text": "#dee8e1", // --figaro-on-surface (escuro)
    "--chat-superficie-1": "#2a2f2c", // --figaro-surface-container-low (escuro)
    "--chat-superficie-2": "#303632", // --figaro-surface-container (escuro)
    "--chat-texto-auxiliar": "#b9c2bc", // --texto-suave (Agenda escura)
    ...((estilo?.corDestaque ?? "azul") === "azul"
      ? {
          "--chat-primary": "#9fbef6", // --figaro-action-blue (escuro)
          "--chat-primary-foreground": "#002e66", // --figaro-on-action-blue (escuro)
        }
      : {}),
  } as CSSProperties;
}
