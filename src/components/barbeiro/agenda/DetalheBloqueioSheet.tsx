import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Clock3, Lock, Unlock } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useConfirmar } from "@/components/ui/useConfirmar";
import { aviso } from "@/lib/avisos";
import { removerBloqueio } from "@/lib/bloqueios.functions";

import { dataEditorial } from "./tempo";

type BloqueioAgenda = { id: string; inicio: string; fim: string; motivo: string | null };

export function DetalheBloqueioSheet({
  aberto,
  onAberto,
  bloqueio,
  dia,
  fuso,
}: {
  aberto: boolean;
  onAberto: (aberto: boolean) => void;
  bloqueio: BloqueioAgenda;
  dia: string;
  fuso: string;
}) {
  const queryClient = useQueryClient();
  const remover = useServerFn(removerBloqueio);
  const [pedirConfirmacao, dialogoDeConfirmacao] = useConfirmar();
  const formatarHora = (iso: string) =>
    new Date(iso).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: fuso,
    });

  const liberar = useMutation({
    mutationFn: () => remover({ data: { id: bloqueio.id } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["agenda-dia"] });
      void queryClient.invalidateQueries({ queryKey: ["agenda-periodo"] });
      void queryClient.invalidateQueries({ queryKey: ["bloqueios", dia] });
      aviso.ok("Bloqueio removido. O horário está livre para agendamentos.");
      onAberto(false);
    },
    onError: (erro) => aviso.erro(erro instanceof Error ? erro.message : "Não foi possível liberar o horário."),
  });

  const confirmarLiberacao = async () => {
    if (liberar.isPending) return;
    const confirmou = await pedirConfirmacao({
      titulo: "Excluir bloqueio?",
      descricao: "Os clientes poderão agendar neste horário novamente.",
      confirmar: "Excluir",
      cancelar: "Cancelar",
      destrutivo: true,
    });
    if (confirmou) liberar.mutate();
  };

  return (
    <Sheet open={aberto} onOpenChange={onAberto}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[80dvh] w-full max-w-[520px] overflow-y-auto rounded-t-xl border-line bg-ink2 px-5 pb-[calc(20px+env(safe-area-inset-bottom))] pt-5"
      >
        <SheetHeader className="pr-10 text-left">
          <SheetTitle className="text-xl text-paper">
            {bloqueio.motivo?.trim() || "Bloqueio de horário"}
          </SheetTitle>
          <SheetDescription className="text-sm text-mute">
            {dataEditorial(dia)} · bloqueio da agenda
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 rounded-2xl border border-line bg-ink3 p-4">
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[var(--figaro-tertiary-container,var(--ink3))] text-[var(--figaro-on-tertiary-container,var(--paper))]">
              <Lock className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-base font-semibold tabular-nums text-paper">
                {formatarHora(bloqueio.inicio)} – {formatarHora(bloqueio.fim)}
              </p>
              <p className="mt-1 text-sm text-mute">Clientes não conseguem agendar durante o bloqueio.</p>
            </div>
          </div>
          {bloqueio.motivo?.trim() ? (
            <p className="mt-4 border-t border-line pt-3 text-sm text-paper">{bloqueio.motivo}</p>
          ) : null}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button type="button" variant="outline" size="lg" className="w-full" disabled={liberar.isPending} onClick={() => onAberto(false)}>
            Cancelar
          </Button>
          <Button type="button" variant="destructive" size="lg" className="w-full" disabled={liberar.isPending} onClick={() => void confirmarLiberacao()}>
            <Unlock aria-hidden /> {liberar.isPending ? "Liberando…" : "Desbloquear"}
          </Button>
        </div>
      </SheetContent>
      {dialogoDeConfirmacao}
    </Sheet>
  );
}
