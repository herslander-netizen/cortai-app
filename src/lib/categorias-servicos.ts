/** Cores das categorias = paleta `ServiceCategoryColors` do Figaro (tokens `--figaro-categoria-*` em styles.css). */
export const CORES_CATEGORIA = [
  { valor: "roxo", rotulo: "Roxo", css: "var(--figaro-categoria-ametista)" },
  { valor: "azul", rotulo: "Azul", css: "var(--figaro-categoria-safira)" },
  { valor: "verde", rotulo: "Verde", css: "var(--figaro-categoria-esmeralda)" },
  { valor: "rosa", rotulo: "Rosa", css: "var(--figaro-categoria-rosa)" },
  { valor: "vermelho", rotulo: "Vermelho", css: "var(--figaro-categoria-carmim)" },
  { valor: "amarelo", rotulo: "Amarelo", css: "var(--figaro-categoria-sol)" },
  { valor: "laranja", rotulo: "Laranja", css: "var(--figaro-categoria-tangerina)" },
  { valor: "turquesa", rotulo: "Turquesa", css: "var(--figaro-categoria-tropical)" },
  { valor: "cinza", rotulo: "Cinza", css: "var(--figaro-categoria-prata)" },
] as const;

export type CorCategoria = (typeof CORES_CATEGORIA)[number]["valor"];

export function chaveCategoria(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

/** Cor de partida estável para categorias legadas que ainda não foram personalizadas. */
export function corPadraoCategoria(nome: string): CorCategoria {
  const chave = chaveCategoria(nome);
  let hash = 0;
  for (let i = 0; i < chave.length; i += 1) {
    hash = (hash * 31 + (chave.charCodeAt(i) || 0)) >>> 0;
  }
  return CORES_CATEGORIA[hash % CORES_CATEGORIA.length]?.valor ?? "azul";
}

export function cssDaCorCategoria(cor: string): string {
  return (
    CORES_CATEGORIA.find((entrada) => entrada.valor === cor)?.css ??
    "var(--figaro-primary, var(--primary))"
  );
}
