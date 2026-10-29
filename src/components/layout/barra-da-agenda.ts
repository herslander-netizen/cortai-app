import type { CSSProperties } from "react";

/**
 * Agenda no celular: a barra do app e a semana (posta nela pelo `NaBarraDoTopo`) formam uma
 * superfície só, de ponta a ponta, com a base arredondada e sombra leve, como no modelo.
 */
export const ESTILO_DA_BARRA_NA_AGENDA: CSSProperties = {
  background: "var(--agenda-topo, var(--ink2))",
  borderBottomColor: "transparent",
  backdropFilter: "none",
  borderRadius: "0 0 24px 24px",
  boxShadow: "var(--shadow-md)",
};
