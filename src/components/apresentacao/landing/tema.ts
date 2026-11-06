import type { CSSProperties } from "react";

import { TEMA_FIXO_ENTRADA } from "@/components/entrada/tema-fixo";

/**
 * Temas da página pública promocional (dono, 06/11/2026: "tema do Flow claro intercalando para o escuro"). O claro é o
 * mesmo da entrada (sem a altura fixa da tela); o escuro troca só os papéis de superfície e texto, mantendo azul, lilás e
 * rosa da marca. As telas de exemplo dentro dos celulares usam sempre o claro.
 */
type Estilo = CSSProperties & Record<string, string | number>;

const { height: _h, minHeight: _m, ...resto } = TEMA_FIXO_ENTRADA as unknown as Estilo;
const claroBase = resto as unknown as Estilo;

export const TEMA_CLARO: Estilo = claroBase;

export const TEMA_ESCURO = {
  ...claroBase,
  "--fundo": "#0e0f1a",
  "--painel": "#171926",
  "--cartao": "#1c1e2e",
  "--linha": "#2b2e44",
  "--texto": "#f4f5fb",
  "--texto-suave": "#b0b5cc",
  "--figaro-primary": "#8da2ff",
  "--figaro-on-primary": "#10122b",
  "--figaro-primary-container": "#2a3170",
  "--figaro-on-primary-container": "#dfe3ff",
  "--figaro-tertiary": "#ff5fa8",
  "--figaro-surface-container": "#171926",
  "--figaro-surface-container-high": "#222538",
  "--figaro-surface-container-highest": "#2b2e44",
  "--figaro-surface-container-low": "#13141f",
  "--figaro-outline": "#7b809c",
  colorScheme: "dark",
} as unknown as Estilo;
