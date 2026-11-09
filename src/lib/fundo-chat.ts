import type { Segmento } from "@/lib/segmentos";
import type { PaginaConfig } from "@/lib/pagina-config";

type Modo = PaginaConfig["chat"]["fundo"];
export type FundoChatResolvido = { imagem: string | null; padraoSegmento: Segmento | null };

/** Preserva a opção explícita do negócio e só ilustra o estado padrão sem capa. */
export function resolverFundoDoChat({
  modo, capaUrl, segmento, fundoFlow,
}: {
  modo: Modo;
  capaUrl?: string | null | undefined;
  segmento?: Segmento | undefined;
  fundoFlow: string;
}): FundoChatResolvido {
  if (modo === "liso") return { imagem: null, padraoSegmento: null };
  if (modo === "padrao") return { imagem: fundoFlow, padraoSegmento: null };
  if (capaUrl) return { imagem: capaUrl, padraoSegmento: null };
  if (segmento) return { imagem: null, padraoSegmento: segmento };
  return { imagem: fundoFlow, padraoSegmento: null };
}
