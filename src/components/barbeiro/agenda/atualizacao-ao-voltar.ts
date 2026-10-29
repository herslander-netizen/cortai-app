import type { QueryClient } from "@tanstack/react-query";

/**
 * Ao voltar ao app, atualiza a agenda sem depender só do staleTime do React Query.
 * Compartilha um único par de listeners por QueryClient, pois vários componentes usam useAgendaDia.
 */
export const INTERVALO_MINIMO_RETORNO_AGENDA_MS = 15_000;

type Registro = {
  usos: number;
  ultimaAtualizacao: number;
  estavaOculta: boolean;
  perdeuFoco: boolean;
  aoMudarVisibilidade: () => void;
  aoPerderFoco: () => void;
  aoGanharFoco: () => void;
};

const registros = new WeakMap<QueryClient, Registro>();

export function registrarAtualizacaoAoRetomarAgenda(queryClient: QueryClient) {
  const existente = registros.get(queryClient);
  if (existente) {
    existente.usos += 1;
    return () => liberar(queryClient, existente);
  }

  const registro: Registro = {
    usos: 1,
    ultimaAtualizacao: Number.NEGATIVE_INFINITY,
    estavaOculta: document.visibilityState === "hidden",
    perdeuFoco: false,
    aoMudarVisibilidade: () => undefined,
    aoPerderFoco: () => undefined,
    aoGanharFoco: () => undefined,
  };

  const atualizar = () => {
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;
    const agora = Date.now();
    // A prévia dos dias vizinhos usa 15 s como janela de frescor; evita refetch em cascata
    // quando Android/iOS emitem visibilitychange e focus ao retomar o mesmo app.
    if (agora - registro.ultimaAtualizacao < INTERVALO_MINIMO_RETORNO_AGENDA_MS) return;
    registro.ultimaAtualizacao = agora;
    void queryClient.invalidateQueries({ queryKey: ["agenda-dia"] });
    void queryClient.invalidateQueries({ queryKey: ["agenda-periodo"] });
  };

  registro.aoMudarVisibilidade = () => {
    if (document.visibilityState === "hidden") {
      registro.estavaOculta = true;
      return;
    }
    if (registro.estavaOculta) {
      registro.estavaOculta = false;
      atualizar();
    }
  };
  registro.aoPerderFoco = () => {
    registro.perdeuFoco = true;
  };
  registro.aoGanharFoco = () => {
    if (!registro.perdeuFoco) return;
    registro.perdeuFoco = false;
    if (document.visibilityState !== "hidden") atualizar();
  };

  registros.set(queryClient, registro);
  document.addEventListener("visibilitychange", registro.aoMudarVisibilidade);
  window.addEventListener("blur", registro.aoPerderFoco);
  window.addEventListener("focus", registro.aoGanharFoco);
  return () => liberar(queryClient, registro);
}

function liberar(queryClient: QueryClient, registro: Registro) {
  registro.usos = Math.max(0, registro.usos - 1);
  if (registro.usos > 0 || registros.get(queryClient) !== registro) return;
  document.removeEventListener("visibilitychange", registro.aoMudarVisibilidade);
  window.removeEventListener("blur", registro.aoPerderFoco);
  window.removeEventListener("focus", registro.aoGanharFoco);
  registros.delete(queryClient);
}
