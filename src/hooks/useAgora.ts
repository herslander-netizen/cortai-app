import { useSyncExternalStore } from "react";

/** Relógio compartilhado de 1 minuto: só quem lê o horário re-renderiza. */
let agora = Date.now();
const ouvintes = new Set<() => void>();
let alinhamento: number | undefined;
let intervalo: number | undefined;

function tique() {
  agora = Date.now();
  ouvintes.forEach((f) => f());
}

function assinar(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  if (alinhamento === undefined && intervalo === undefined) {
    agora = Date.now();
    alinhamento = window.setTimeout(
      () => {
        alinhamento = undefined;
        tique();
        intervalo = window.setInterval(tique, 60_000);
      },
      60_000 - (Date.now() % 60_000),
    );
  }
  return () => {
    ouvintes.delete(ouvinte);
    if (ouvintes.size) return;
    if (alinhamento !== undefined) window.clearTimeout(alinhamento);
    if (intervalo !== undefined) window.clearInterval(intervalo);
    alinhamento = undefined;
    intervalo = undefined;
  };
}

const naoAssinar = () => () => {};

/**
 * As prévias de outros dias não precisam acompanhar o relógio em tempo real.
 * Evita re-renderizações das timelines vizinhas enquanto a pessoa navega.
 */
export function useAgora(ativo = true) {
  return useSyncExternalStore(
    ativo ? assinar : naoAssinar,
    () => agora,
    () => agora,
  );
}
