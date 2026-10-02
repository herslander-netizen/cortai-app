import { useSyncExternalStore } from "react";

let ativo = false;
let guardados = 0;
const ouvintes = new Set<() => void>();
const emitir = () => ouvintes.forEach((ouvir) => ouvir());

export function definirModoFoco(valor: boolean) {
  if (ativo === valor) return;
  ativo = valor;
  emitir();
}
export function modoFocoAtivo() {
  return ativo;
}
export function guardarAvisoDoFoco() {
  if (ativo) {
    guardados += 1;
    emitir();
  }
}
export function consumirAvisosDoFoco() {
  const total = guardados;
  guardados = 0;
  emitir();
  return total;
}
export function useModoFoco() {
  return useSyncExternalStore(
    (ouvir) => {
      ouvintes.add(ouvir);
      return () => ouvintes.delete(ouvir);
    },
    () => ativo,
    () => false,
  );
}
