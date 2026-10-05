/** Estado público da apresentação: só falso desativa; erro ou ausência = ativa. */
export function apresentacaoAtiva(valor: unknown): boolean {
  return valor !== false;
}

/** Visitante sem sessão com a apresentação desativada vai para a entrada. */
export function destinoDaApresentacao(ativa: boolean, logado: boolean): "/login" | null {
  return !logado && !ativa ? "/login" : null;
}
