import { useSyncExternalStore } from "react";

/**
 * Busca da lista da Agenda no celular. Vive fora dos componentes porque o botão fica na barra do topo e o
 * resultado na lista: os dois lados leem o mesmo estado sem passar props pela Agenda inteira.
 */
type Estado = { aberta: boolean; texto: string };
let estado: Estado = { aberta: false, texto: "" };
const ouvintes = new Set<() => void>();

function emitir(proximo: Estado) {
  if (proximo.aberta === estado.aberta && proximo.texto === estado.texto) return;
  estado = proximo;
  ouvintes.forEach((o) => o());
}

export const buscaDaLista = {
  abrir: () => emitir({ ...estado, aberta: true }),
  /** Fechar limpa o texto: a lista volta inteira. */
  fechar: () => emitir({ aberta: false, texto: "" }),
  texto: (texto: string) => emitir({ ...estado, texto }),
  ler: () => estado,
};

export function useBuscaDaLista() {
  return useSyncExternalStore(
    (o) => {
      ouvintes.add(o);
      return () => ouvintes.delete(o);
    },
    buscaDaLista.ler,
    buscaDaLista.ler,
  );
}
