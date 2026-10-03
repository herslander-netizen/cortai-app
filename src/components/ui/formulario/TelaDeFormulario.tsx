import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ArrowLeft, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

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
import { Button } from "@/components/ui/button";

/** Distância do teclado virtual até a base da tela (0 sem teclado). */
function useAlturaDoTeclado() {
  const [altura, setAltura] = useState(0);
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!vv) return;
    const medir = () => setAltura(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
    vv.addEventListener("resize", medir);
    vv.addEventListener("scroll", medir);
    return () => {
      vv.removeEventListener("resize", medir);
      vv.removeEventListener("scroll", medir);
    };
  }, []);
  return altura;
}

/**
 * Tela cheia de formulário: botão redondo de fechar/voltar, título grande,
 * área rolável e a ação principal flutuante em pílula (a única primária).
 * Fecha por X, Esc e gesto de voltar; com dados não salvos pede confirmação.
 */
export function TelaDeFormulario({
  titulo,
  subtitulo,
  icone = "fechar",
  sujo = false,
  onFechar,
  acao,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  icone?: "fechar" | "voltar";
  sujo?: boolean;
  onFechar: () => void;
  acao?: {
    rotulo: string;
    onClick: () => void;
    desabilitada?: boolean;
    carregando?: boolean;
  };
  children: ReactNode;
}) {
  const [confirmar, setConfirmar] = useState(false);
  const teclado = useAlturaDoTeclado();
  const sujoRef = useRef(sujo);
  sujoRef.current = sujo;
  const fecharRef = useRef(onFechar);
  fecharRef.current = onFechar;

  function pedirFechar() {
    if (sujoRef.current) setConfirmar(true);
    else fecharRef.current();
  }

  // Gesto de voltar do celular: uma entrada no histórico enquanto a tela está aberta.
  useEffect(() => {
    window.history.pushState({ telaDeFormulario: true }, "");
    const aoVoltar = () => {
      if (sujoRef.current) {
        window.history.pushState({ telaDeFormulario: true }, "");
        setConfirmar(true);
      } else fecharRef.current();
    };
    window.addEventListener("popstate", aoVoltar);
    return () => {
      window.removeEventListener("popstate", aoVoltar);
      if (window.history.state?.telaDeFormulario) window.history.back();
    };
  }, []);

  const Icone = icone === "voltar" ? ArrowLeft : X;

  return (
    <DialogPrimitive.Root open onOpenChange={(aberto) => (!aberto ? pedirFechar() : undefined)}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/80" />
        <DialogPrimitive.Content
          className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-ink outline-none sm:inset-x-auto sm:left-1/2 sm:top-4 sm:bottom-0 sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:rounded-t-[var(--raio-folha)] sm:border sm:border-line"
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            pedirFechar();
          }}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <div className="shrink-0 px-4 pt-[calc(0.75rem+env(safe-area-inset-top))]">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={icone === "voltar" ? "Voltar" : "Fechar"}
              onClick={pedirFechar}
              className="rounded-full bg-ink3"
            >
              <Icone size={20} />
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(7rem+env(safe-area-inset-bottom))]">
            <DialogPrimitive.Title className="titulo-tela mt-4 px-1">
              {titulo}
            </DialogPrimitive.Title>
            {subtitulo ? (
              <DialogPrimitive.Description className="subtitulo-tela mt-2 px-1">
                {subtitulo}
              </DialogPrimitive.Description>
            ) : (
              <DialogPrimitive.Description className="sr-only">
                {titulo}
              </DialogPrimitive.Description>
            )}
            <div className="mt-8 space-y-8">{children}</div>
          </div>
          {acao ? (
            <div
              className="pointer-events-none absolute right-4 flex justify-end"
              style={{ bottom: `calc(${teclado}px + 1rem + env(safe-area-inset-bottom))` }}
            >
              <Button
                type="button"
                variant="primary"
                size="lg"
                className="pointer-events-auto rounded-full px-7 shadow-[var(--shadow-md)]"
                disabled={acao.desabilitada || acao.carregando}
                loading={acao.carregando ?? false}
                onClick={acao.onClick}
              >
                {acao.rotulo}
              </Button>
            </div>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>

      <AlertDialog open={confirmar} onOpenChange={setConfirmar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sair sem salvar?</AlertDialogTitle>
            <AlertDialogDescription>O que você preencheu será perdido.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmar(false);
                fecharRef.current();
              }}
            >
              Sair sem salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DialogPrimitive.Root>
  );
}
