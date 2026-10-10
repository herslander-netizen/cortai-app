import { type ReactNode, useCallback, useRef, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Pedido = {
  titulo: string;
  descricao?: string;
  confirmar?: string;
  cancelar?: string;
  destrutivo?: boolean;
};

/**
 * Confirmação em AlertDialog que devolve uma promessa — substitui window.confirm
 * sem mudar o fluxo de quem chama. Renderize `dialogo` uma vez no componente.
 */
export function useConfirmar(): [(pedido: Pedido) => Promise<boolean>, ReactNode] {
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const resposta = useRef<((ok: boolean) => void) | null>(null);

  const confirmar = useCallback(
    (novo: Pedido) =>
      new Promise<boolean>((resolve) => {
        resposta.current?.(false);
        resposta.current = resolve;
        setPedido(novo);
      }),
    [],
  );

  const fechar = (ok: boolean) => {
    resposta.current?.(ok);
    resposta.current = null;
    setPedido(null);
  };

  const dialogo = (
    <AlertDialog open={pedido !== null} onOpenChange={(aberto) => !aberto && fechar(false)}>
      <AlertDialogContent className="w-[calc(100%-2rem)] rounded-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>{pedido?.titulo}</AlertDialogTitle>
          {pedido?.descricao ? (
            <AlertDialogDescription>{pedido.descricao}</AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{pedido?.cancelar ?? "Cancelar"}</AlertDialogCancel>
          <AlertDialogAction
            className={pedido?.destrutivo ? "bg-destructive text-destructive-foreground" : ""}
            onClick={() => fechar(true)}
          >
            {pedido?.confirmar ?? "Confirmar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return [confirmar, dialogo];
}
