/** Grupos do menu lateral que a pessoa deixou abertos (lembrado no aparelho). */
const CHAVE = "cortai-menu-grupos-abertos";
export const GRUPOS_ABERTOS_PADRAO = ["Dia a dia"];

type Armazenamento = Pick<Storage, "getItem" | "setItem">;
function padrao(): Armazenamento | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export function gruposAbertosSalvos(armazenamento?: Armazenamento): string[] {
  try {
    const bruto = (armazenamento ?? padrao())?.getItem(CHAVE);
    if (!bruto) return GRUPOS_ABERTOS_PADRAO;
    const lista = JSON.parse(bruto) as unknown;
    return Array.isArray(lista) ? lista.filter((g): g is string => typeof g === "string") : GRUPOS_ABERTOS_PADRAO;
  } catch {
    return GRUPOS_ABERTOS_PADRAO;
  }
}

export function salvarGruposAbertos(grupos: string[], armazenamento?: Armazenamento) {
  try {
    (armazenamento ?? padrao())?.setItem(CHAVE, JSON.stringify(grupos));
  } catch {
    // Opcional: sem armazenamento, o menu volta ao padrão.
  }
}

/** Abre o grupo da tela atual sem esquecer os que a pessoa deixou abertos. */
export function comGrupoAtual(abertos: string[], grupoAtual: string | null) {
  return grupoAtual && !abertos.includes(grupoAtual) ? [...abertos, grupoAtual] : abertos;
}

export function alternarGrupo(abertos: string[], grupo: string) {
  return abertos.includes(grupo) ? abertos.filter((g) => g !== grupo) : [...abertos, grupo];
}
