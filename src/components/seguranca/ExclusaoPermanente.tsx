import { useId, useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

/**
 * Padrão único de exclusão permanente do Flow: mostra o que será apagado e
 * só libera o botão depois da confirmação explícita. Permissões valem no servidor.
 */
export function ExclusaoPermanente({
  rotulo = "Excluir permanentemente",
  titulo,
  descricao,
  onExcluir,
  onSucesso,
  className = "text-xs text-brick underline",
}: {
  rotulo?: string;
  titulo: string;
  descricao: string;
  onExcluir: () => Promise<string | null | void>;
  onSucesso?: (aviso: string | null) => void;
  className?: string;
}) {
  const campoId = useId();
  const [aberto, setAberto] = useState(false);
  const [entendo, setEntendo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);

  function fechar() {
    setAberto(false);
    setEntendo(false);
    setErro(null);
    setProcessando(false);
  }

  async function confirmar() {
    if (!entendo || processando) return;
    setProcessando(true);
    setErro(null);
    try {
      const aviso = await onExcluir();
      fechar();
      onSucesso?.(aviso ?? null);
    } catch (e) {
      setErro(
        e instanceof Error && e.message
          ? e.message
          : "Não foi possível excluir agora. Tente novamente.",
      );
      setProcessando(false);
    }
  }

  return (
    <AlertDialog
      open={aberto}
      onOpenChange={(open) => {
        if (open) setAberto(true);
        else if (!processando) fechar();
      }}
    >
      <AlertDialogTrigger asChild>
        <Button type="button" variant="text" className={className}>
          {rotulo}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent
        overlayClassName="z-[70]"
        className="bottom-0 left-0 top-auto z-[70] max-h-[92dvh] w-full max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-t-xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom sm:bottom-auto sm:left-[50%] sm:top-[50%] sm:max-w-sm sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-lg sm:p-6 sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=open]:slide-in-from-bottom-0"
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="text-paper">{titulo}</AlertDialogTitle>
          <AlertDialogDescription>{descricao}</AlertDialogDescription>
        </AlertDialogHeader>
        <p className="text-xs text-brick">Esta ação é irreversível.</p>
        <label
          className="flex min-h-12 cursor-pointer items-start gap-3 text-xs text-paper"
          htmlFor={campoId}
        >
          <Checkbox
            id={campoId}
            checked={entendo}
            disabled={processando}
            onCheckedChange={(checked) => setEntendo(checked === true)}
            className="mt-0.5 border-brick data-[state=checked]:bg-brick data-[state=checked]:text-destructive-foreground"
          />
          Entendo que isso apaga tudo e não tem volta
        </label>
        {erro ? (
          <p className="text-xs text-brick" role="alert">
            {erro}
          </p>
        ) : null}
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel disabled={processando}>Cancelar</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void confirmar()}
            disabled={!entendo || processando}
          >
            {processando ? "Excluindo…" : "Excluir permanentemente"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
