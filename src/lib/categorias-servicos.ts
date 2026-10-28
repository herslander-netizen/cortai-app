export const CORES_CATEGORIA = [
  { valor: "roxo", rotulo: "Roxo", css: "var(--figaro-tertiary, var(--rosa))" },
  { valor: "azul", rotulo: "Azul", css: "var(--figaro-primary, var(--primary))" },
  { valor: "verde", rotulo: "Verde", css: "var(--sage)" },
  { valor: "rosa", rotulo: "Rosa", css: "var(--rosa)" },
  { valor: "vermelho", rotulo: "Vermelho", css: "var(--brick)" },
  { valor: "amarelo", rotulo: "Amarelo", css: "var(--gold)" },
  { valor: "laranja", rotulo: "Laranja", css: "var(--figaro-secondary, var(--gold))" },
  { valor: "turquesa", rotulo: "Turquesa", css: "var(--figaro-tertiary, var(--primary))" },
  { valor: "cinza", rotulo: "Cinza", css: "var(--mute2)" },
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
  return CORES_CATEGORIA.find((entrada) => entrada.valor === cor)?.css ?? "var(--figaro-primary, var(--primary))";
}
