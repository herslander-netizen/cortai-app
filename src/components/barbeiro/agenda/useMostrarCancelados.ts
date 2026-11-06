import { useCallback, useEffect, useState } from "react";

import {
  EVENTO_CANCELADOS,
  mostrarCanceladosInicial,
  salvarMostrarCancelados,
} from "./preferencias";

/**
 * Preferência única de mostrar cancelados, faltas e remarcados na Agenda. A lista e a linha do tempo leem a mesma
 * flag; o chip "Cancelados" da lista é o único controle (uma função, um controle).
 */
export function useMostrarCancelados(): [boolean, (ativo: boolean) => void] {
  const [mostrar, setMostrar] = useState(false);
  useEffect(() => {
    setMostrar(mostrarCanceladosInicial());
    const aoMudar = () => setMostrar(mostrarCanceladosInicial());
    window.addEventListener(EVENTO_CANCELADOS, aoMudar);
    return () => window.removeEventListener(EVENTO_CANCELADOS, aoMudar);
  }, []);
  const definir = useCallback((ativo: boolean) => {
    setMostrar(ativo);
    salvarMostrarCancelados(ativo);
  }, []);
  return [mostrar, definir];
}
