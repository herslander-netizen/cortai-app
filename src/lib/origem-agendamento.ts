// Fonte única das origens de agendamento. "Flow IA" nunca é origem: é assistência.
export const ORIGENS_AGENDAMENTO = [
  "app",
  "manual",
  "link_publico",
  "whatsapp",
  "instagram",
] as const;
export type OrigemAgendamento = (typeof ORIGENS_AGENDAMENTO)[number];

export type IconeOrigem = "whatsapp" | "link" | "manual" | "instagram";

const ROTULOS: Record<OrigemAgendamento, { rotulo: string; curto: string; icone: IconeOrigem }> = {
  whatsapp: { rotulo: "WhatsApp", curto: "WhatsApp", icone: "whatsapp" },
  link_publico: { rotulo: "Link", curto: "Link", icone: "link" },
  manual: { rotulo: "Manual", curto: "Man.", icone: "manual" },
  app: { rotulo: "Manual", curto: "Man.", icone: "manual" }, // legado
  instagram: { rotulo: "Instagram", curto: "Insta", icone: "instagram" },
};

export function descreverOrigem(
  origem: string | null | undefined,
  assistido: boolean | null | undefined,
) {
  const base = ROTULOS[(origem ?? "app") as OrigemAgendamento] ?? ROTULOS.app;
  return {
    ...base,
    ariaOrigem: `Origem: ${base.rotulo}`,
    cortai: assistido === true,
  };
}

/** Origem gravada quando a Flow IA cria: cliente no WhatsApp → whatsapp; equipe → manual. */
export function origemDoCortai(canal: string, papel?: string | null): "whatsapp" | "manual" {
  const equipe = !!papel && papel !== "cliente";
  return canal === "whatsapp" && !equipe ? "whatsapp" : "manual";
}
