/**
 * Aprendizado do atendimento (dono, 06/11/2026): regras puras das conversas que saíram do fluxo.
 * Nada aqui grava nem decide resposta; só prepara o registro (`aprendizado.server.ts`) e o painel "Para melhorar".
 */
import { normalizar } from "./motor/vocabulario";

export const MOTIVOS_DE_OCORRENCIA = [
  "nao_entendida",
  "fora_da_etapa",
  "correcao",
  "erro",
  "abandono",
  "atendente",
] as const;
export type MotivoDeOcorrencia = (typeof MOTIVOS_DE_OCORRENCIA)[number];
export type OrigemDaOcorrencia = "fluxo" | "bot" | "ia";

export const ROTULO_DO_MOTIVO: Record<MotivoDeOcorrencia, string> = {
  nao_entendida: "Não entendida",
  fora_da_etapa: "Fora da etapa",
  correcao: "Cliente corrigiu",
  erro: "Erro",
  abandono: "Abandonou",
  atendente: "Pediu atendente",
};

/**
 * Tira dados pessoais antes de gravar: e-mail, CPF/CNPJ, telefone e qualquer sequência longa de números. O texto
 * serve para ensinar linguagem, nunca para identificar alguém.
 */
export function mascararDados(texto: string): string {
  return texto
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[e-mail]")
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, "[documento]")
    .replace(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, "[documento]")
    .replace(/(?:\+?55\s?)?\(?\d{2}\)?\s?9?\d{4}[-\s]?\d{4}\b/g, "[telefone]")
    .replace(/\d{7,}/g, "[número]")
    .slice(0, 500)
    .trim();
}

/** Chave de agrupamento: frases iguais a menos de acento, caixa, pontuação, números e horários caem juntas. */
export function chaveDeGrupo(textoMascarado: string): string {
  return normalizar(textoMascarado)
    .replace(/\b\d{1,2}([:h]\d{2})?h?\b/g, "#")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
}

/**
 * O cliente está corrigindo o que acabou de receber ("não é isso", "errado", "não foi o que pedi")? Só vale logo depois
 * de uma resposta automática — quem chama confere isso.
 */
export function pareceCorrecao(texto: string): boolean {
  const t = normalizar(texto);
  if (!t || t.length > 120) return false;
  return /\b(nao e isso|nao foi isso|nao era isso|nao foi o que (eu )?(pedi|perguntei|falei)|nao e o que (eu )?(pedi|quero)|ta errado|esta errado|errado|errou|voce nao entendeu|nao entendeu|nada a ver|nao pedi isso|nao perguntei isso)\b/.test(
    t,
  );
}
