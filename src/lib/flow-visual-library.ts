import { SEGMENTOS, type Segmento } from "@/lib/segmentos";

/** Fotos sintéticas que JÁ existem em public/exemplos e public/temas; docs/creditos-de-imagens.md. */
export type TipoDeImagemFlow = "hero" | "galeria" | "servico" | "apoio" | "fundo";
export type ImagemVisualFlow = {
  id: string;
  titulo: string;
  descricao: string;
  src: string;
  miniatura: string;
  segmentos: readonly Segmento[];
  tipos: readonly TipoDeImagemFlow[];
  tags: readonly string[];
  origem: string;
  licenca: string;
};

const ORIGEM = "Gerada por IA (Codex ImageGen, 24/10/2026)";
const LICENCA = "Output de IA: direitos conforme os Termos de Uso da OpenAI; revisão de conteúdo pendente";
function foto(
  id: string, local: "temas" | "exemplos", arquivo: string, titulo: string,
  descricao: string, segmentos: Segmento[], tipos: TipoDeImagemFlow[], tags: string[],
): ImagemVisualFlow {
  const src = "/" + local + "/" + arquivo + ".webp";
  return { id, titulo, descricao, src, miniatura: src, segmentos, tipos, tags, origem: ORIGEM, licenca: LICENCA };
}

/** Não são imagens novas, nem conteúdo produzido por estabelecimentos. */
export const CATALOGO_VISUAL_FLOW: readonly ImagemVisualFlow[] = [
  foto("barber-classico","temas","figaro-classico","Barbearia clássica","Cena de barbearia",["barbearia"],["hero","fundo"],["barbearia","classico"]),
  foto("barber-retro","temas","figaro-retro","Barbearia retrô","Cena de barbearia",["barbearia"],["hero","fundo"],["barbearia","retro"]),
  foto("barber-rock","temas","figaro-rock-n-roll","Estilo contemporâneo","Cena de barbearia",["barbearia"],["hero","fundo"],["urbano","barbearia"]),
  foto("salon-rose","temas","feminino-rose","Salão rosé","Cena de beleza",["salao","cabeleireiro"],["hero","fundo"],["salao","rose"]),
  foto("wellness-lavanda","temas","feminino-lavanda","Bem-estar lavanda","Cena de cuidados",["estetica","sobrancelha_cilios"],["hero","fundo"],["estetica","bem estar"]),
  foto("nails-pessego","temas","feminino-pessego","Beleza pêssego","Cena de beleza",["esmalteria","salao"],["hero","fundo"],["unhas","beleza"]),
  foto("salon-capa","exemplos","capa","Atendimento no salão","Profissional cuidando dos cabelos",["salao","cabeleireiro"],["hero","galeria"],["cabelo","salao"]),
  foto("unhas-detalhe","exemplos","galeria-1","Manicure em detalhe","Fotografia editorial de manicure",["esmalteria","salao"],["galeria","servico"],["manicure","unhas"]),
  foto("barbearia-detalhe","exemplos","galeria-2","Detalhe de barbearia","Fotografia de serviço de barbearia",["barbearia"],["galeria","servico"],["barba","corte"]),
  foto("produtos-cuidado","exemplos","galeria-3","Produtos de cuidado","Composição de cuidados",["estetica","salao"],["galeria","apoio"],["cosmeticos","produtos"]),
  foto("salao-ambiente-a","exemplos","galeria-4","Ambiente de salão","Cena de ambiente",["salao"],["galeria","apoio"],["salao","ambiente"]),
  foto("salao-ambiente-b","exemplos","galeria-5","Espaço de atendimento","Cena de ambiente",["salao"],["galeria","apoio"],["salao","ambiente"]),
  foto("salao-ambiente-c","exemplos","galeria-6","Detalhe do espaço","Cena de ambiente",["salao"],["galeria","apoio"],["salao","ambiente"]),
  foto("produto-unhas","exemplos","produto-1","Produto para unhas","Fotografia de produto",["esmalteria","salao"],["servico","apoio"],["unhas","produto"]),
  foto("produto-capilar","exemplos","produto-2","Produto capilar","Fotografia de produto",["cabeleireiro","salao"],["servico","apoio"],["cabelo","produto"]),
  foto("produto-acessorio","exemplos","produto-3","Acessório de cuidado","Fotografia de acessório",["barbearia","cabeleireiro"],["servico","apoio"],["acessorio","produto"]),
];

export function buscarVisualFlow({
  segmento, tipo, texto = "",
}: { segmento?: Segmento | null; tipo?: TipoDeImagemFlow | null; texto?: string } = {}): ImagemVisualFlow[] {
  const normal = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  const busca = normal(texto.trim());
  return CATALOGO_VISUAL_FLOW.filter((item) =>
    (!segmento || item.segmentos.includes(segmento)) &&
    (!tipo || item.tipos.includes(tipo)) &&
    (!busca || normal([item.titulo,item.descricao,...item.tags].join(" ")).includes(busca))
  );
}

export function visualRecomendado(segmento: Segmento, tipo: TipoDeImagemFlow): ImagemVisualFlow | null {
  return buscarVisualFlow({ segmento, tipo })[0] ?? null;
}

export const SEGMENTOS_DA_BIBLIOTECA = SEGMENTOS;
