import type { CSSProperties } from "react";

/**
 * Agenda no celular: a barra do app e a semana (posta nela pelo `NaBarraDoTopo`) formam uma
 * superfície só, de ponta a ponta, com a base arredondada e sombra leve, como no modelo.
 */
export const ESTILO_DA_BARRA_NA_AGENDA: CSSProperties = {
  background: "var(--agenda-topo, var(--ink2))",
  borderBottomColor: "transparent",
  backdropFilter: "none",
  // 16 dp como o painel do mês aberto (Figaro `SelectorPanelShape`): o canto não muda ao abrir e fechar (dono, 30/10).
  borderRadius: "0 0 16px 16px",
  boxShadow: "var(--shadow-md)",
};
