// Regras puras do sino de avisos: "visto" (abriu a central) é diferente de "lido".
export type AvisoDoSino = { criado_em: string; lida_em: string | null };

export function contarNaoVistos(avisos: readonly AvisoDoSino[], ultimoVistoEm: number | null) {
  if (ultimoVistoEm == null) return 0;
  return avisos.filter((a) => !a.lida_em && new Date(a.criado_em).getTime() > ultimoVistoEm).length;
}

export function rotuloDoSino(naoLidas: number, naoVistos: number) {
  if (naoVistos > 0) return `Avisos, ${naoVistos} novos`;
  if (naoLidas > 0) return `Avisos, ${naoLidas} não lidos`;
  return "Avisos";
}

/** Decide se um novo toque deve animar. Rajadas viram uma só animação. */
export function deveTocar(o: {
  animando: boolean;
  centralAberta: boolean;
  menosMovimento: boolean;
  abaOculta: boolean;
}) {
  return !o.animando && !o.centralAberta && !o.menosMovimento && !o.abaOculta;
}

export const DURACAO_TOQUE_MS = 900;

/** Agenda toques: ignora novos pedidos enquanto um está em curso. */
export function criarControleDeToque(agora: () => number = Date.now) {
  let fimEm = 0;
  return {
    pedir(cond: Omit<Parameters<typeof deveTocar>[0], "animando">) {
      const animando = agora() < fimEm;
      if (!deveTocar({ ...cond, animando })) return false;
      fimEm = agora() + DURACAO_TOQUE_MS;
      return true;
    },
  };
}

export function chaveVisto(tenantId: string, userId: string) {
  return `cortai:sino-visto:${tenantId}:${userId}`;
}

export function lerVisto(chave: string): number | null {
  try {
    const v = window.localStorage.getItem(chave);
    const n = v ? Number(v) : NaN;
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function gravarVisto(chave: string, quando: number) {
  try {
    window.localStorage.setItem(chave, String(quando));
  } catch {
    /* sem storage: segue só em memória */
  }
}
