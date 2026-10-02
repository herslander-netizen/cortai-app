export type ConversaCliente = "papo" | "silencio" | "tanto_faz";
export type ArCliente = "gelado" | "ameno" | "sem_ar";
export type BebidaCliente = "cafe" | "agua" | "refri" | "cerveja" | "nada";

export type PreferenciasCliente = {
  conversa?: ConversaCliente;
  ar?: ArCliente;
  bebida?: BebidaCliente;
  musica?: string;
  corte_habitual?: string;
  atencao?: string;
  assuntos?: string;
};

const CONVERSA = new Set<ConversaCliente>(["papo", "silencio", "tanto_faz"]);
const AR = new Set<ArCliente>(["gelado", "ameno", "sem_ar"]);
const BEBIDA = new Set<BebidaCliente>(["cafe", "agua", "refri", "cerveja", "nada"]);
const LIMITES = { musica: 40, corte_habitual: 60, atencao: 80, assuntos: 80 } as const;
const HTML = /<[^>]*>/;

function texto(valor: unknown, limite: number, campo: string) {
  if (valor === undefined || valor === null || valor === "") return undefined;
  if (typeof valor !== "string") throw new Error(`${campo} inválido.`);
  const limpo = valor.trim();
  if (limpo.length > limite) throw new Error(`${campo} deve ter no máximo ${limite} caracteres.`);
  if (HTML.test(limpo)) throw new Error("Preferências não aceitam HTML.");
  return limpo || undefined;
}

export function validarPreferenciasCliente(valor: unknown): PreferenciasCliente {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return {};
  const entrada = valor as Record<string, unknown>;
  const permitidas = new Set(["conversa", "ar", "bebida", ...Object.keys(LIMITES)]);
  if (Object.keys(entrada).some((chave) => !permitidas.has(chave)))
    throw new Error("Preferência inválida.");
  if (entrada["conversa"] !== undefined && !CONVERSA.has(entrada["conversa"] as ConversaCliente))
    throw new Error("Preferência de conversa inválida.");
  if (entrada["ar"] !== undefined && !AR.has(entrada["ar"] as ArCliente))
    throw new Error("Preferência de ar inválida.");
  if (entrada["bebida"] !== undefined && !BEBIDA.has(entrada["bebida"] as BebidaCliente))
    throw new Error("Preferência de bebida inválida.");
  const resultado: PreferenciasCliente = {};
  if (entrada["conversa"]) resultado.conversa = entrada["conversa"] as ConversaCliente;
  if (entrada["ar"]) resultado.ar = entrada["ar"] as ArCliente;
  if (entrada["bebida"]) resultado.bebida = entrada["bebida"] as BebidaCliente;
  for (const [chave, limite] of Object.entries(LIMITES)) {
    const titulo = chave === "corte_habitual" ? "Corte habitual" : `${chave.charAt(0).toUpperCase()}${chave.slice(1)}`;
    const limpo = texto(
      entrada[chave],
      limite,
      titulo,
    );
    if (limpo) resultado[chave as keyof typeof LIMITES] = limpo;
  }
  return resultado;
}

export const ROTULOS_PREFERENCIAS = {
  conversa: { papo: "Gosta de papo", silencio: "Prefere silêncio", tanto_faz: "Tanto faz" },
  ar: { gelado: "Ar gelado", ameno: "Ar ameno", sem_ar: "Sem ar" },
  bebida: { cafe: "Café", agua: "Água", refri: "Refrigerante", cerveja: "Cerveja", nada: "Nada" },
} as const;
