/**
 * Controle de versão do aplicativo.
 *
 * A versão instalada é gravada no pacote enviado ao navegador. O arquivo
 * público `/versao.json` diz qual é a versão publicada e qual é a mínima
 * aceita. Enquanto a mínima for igual à atual, ninguém é bloqueado — só o
 * administrador decide tornar uma atualização obrigatória, subindo a mínima.
 */

/** Versão embutida nesta build. */
export const VERSAO_INSTALADA = "1.0.0";

/** Para onde mandamos quem precisa atualizar. */
export const URL_DE_ATUALIZACAO = "https://cortai.dev";

export type InfoDeVersao = { atual: string; minima: string; url: string };

function partes(versao: string): number[] {
  return versao
    .trim()
    .split(".")
    .map((p) => Number.parseInt(p, 10) || 0);
}

/** -1 se a < b, 0 se iguais, 1 se a > b. */
export function compararVersoes(a: string, b: string): number {
  const pa = partes(a);
  const pb = partes(b);
  const tamanho = Math.max(pa.length, pb.length);
  for (let i = 0; i < tamanho; i += 1) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

/** Lê o arquivo público de versão. Devolve null quando não dá para saber. */
export async function buscarVersaoPublicada(): Promise<InfoDeVersao | null> {
  try {
    const resposta = await fetch(`/versao.json?t=${Date.now()}`, { cache: "no-store" });
    if (!resposta.ok) return null;
    const bruto = (await resposta.json()) as Partial<InfoDeVersao>;
    if (typeof bruto.atual !== "string" || typeof bruto.minima !== "string") return null;
    return {
      atual: bruto.atual,
      minima: bruto.minima,
      url: typeof bruto.url === "string" && bruto.url ? bruto.url : URL_DE_ATUALIZACAO,
    };
  } catch {
    return null;
  }
}

export type SituacaoDaVersao = "em_dia" | "recomendada" | "obrigatoria";

export function situacaoDaVersao(info: InfoDeVersao, instalada = VERSAO_INSTALADA): SituacaoDaVersao {
  if (compararVersoes(instalada, info.minima) < 0) return "obrigatoria";
  if (compararVersoes(instalada, info.atual) < 0) return "recomendada";
  return "em_dia";
}
