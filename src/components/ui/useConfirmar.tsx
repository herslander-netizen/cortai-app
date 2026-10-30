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
  /**
   * Figaro (Personalizar Página): ação em pílula de largura total e "Cancelar" em texto, abaixo e à direita.
   * Opcional para não mudar as confirmações das outras telas (Agenda protegida).
   */
  empilhado?: boolean;
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
        <AlertDialogHeader className={pedido?.empilhado ? "text-left" : undefined}>
          <AlertDialogTitle
            className={pedido?.empilhado ? "text-2xl font-bold leading-8 text-paper" : undefined}
          >
            {pedido?.titulo}
          </AlertDialogTitle>
          {pedido?.descricao ? (
            <AlertDialogDescription className={pedido.empilhado ? "text-base leading-6" : undefined}>
              {pedido.descricao}
            </AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        {pedido?.empilhado ? (
          <div className="mt-2 flex flex-col gap-3">
            <AlertDialogAction
              className={`h-14 w-full rounded-full text-base ${pedido.destrutivo ? "bg-[var(--figaro-error-container,var(--destructive))] text-[var(--figaro-on-error-container,var(--destructive-foreground))] hover:bg-[var(--figaro-error-container,var(--destructive))]" : ""}`}
              onClick={() => fechar(true)}
            >
              {pedido.confirmar ?? "Confirmar"}
            </AlertDialogAction>
            <AlertDialogCancel className="ml-auto mt-0 h-12 border-0 bg-transparent px-4 text-base font-medium text-[var(--figaro-primary,var(--primary))] shadow-none hover:bg-transparent rounded-full focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:bg-[color-mix(in_oklab,var(--figaro-primary,var(--primary))_8%,transparent)]">
              {pedido.cancelar ?? "Cancelar"}
            </AlertDialogCancel>
          </div>
        ) : (
          <AlertDialogFooter>
            <AlertDialogCancel>{pedido?.cancelar ?? "Cancelar"}</AlertDialogCancel>
            <AlertDialogAction
              className={pedido?.destrutivo ? "bg-destructive text-destructive-foreground" : ""}
              onClick={() => fechar(true)}
            >
              {pedido?.confirmar ?? "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );

  return [confirmar, dialogo];
}
