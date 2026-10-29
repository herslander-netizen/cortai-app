import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Clock3, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { AgendaDia } from "@/lib/barbeiro.functions";
import { aviso } from "@/lib/avisos";
import {
  restaurarIntervaloDoDia,
  salvarIntervaloDoDia,
} from "@/lib/intervalos-agenda.functions";

import { dataEditorial } from "./tempo";

type IntervaloDoDia = NonNullable<AgendaDia["intervaloDia"]>;

export function IntervaloDoDiaSheet({
  aberto,
  onAberto,
  dia,
  intervalo,
}: {
  aberto: boolean;
  onAberto: (aberto: boolean) => void;
  dia: string;
  intervalo?: IntervaloDoDia | undefined;
}) {
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const queryClient = useQueryClient();
  const salvarFn = useServerFn(salvarIntervaloDoDia);
  const restaurarFn = useServerFn(restaurarIntervaloDoDia);

  useEffect(() => {
    if (!aberto) return;
    setInicio(intervalo?.inicio ?? "");
    setFim(intervalo?.fim ?? "");
  }, [aberto, dia, intervalo?.excecao, intervalo?.inicio, intervalo?.fim]);

  const inicioAtual = intervalo?.inicio ?? null;
  const fimAtual = intervalo?.fim ?? null;
  const inicioNovo = inicio || null;
  const fimNovo = fim || null;
  const incompleto = Boolean(inicio) !== Boolean(fim);
  const invalido = Boolean(inicio && fim && fim <= inicio);
  const semMudanca =
    inicioNovo === inicioAtual &&
    fimNovo === fimAtual &&
    Boolean(intervalo?.excecao);
  const semMudancaNoPadrao =
    !intervalo?.excecao &&
    inicioNovo === (intervalo?.padraoInicio ?? null) &&
    fimNovo === (intervalo?.padraoFim ?? null);
  const podeSalvar = Boolean(inicio && fim) && !invalido && !incompleto && !semMudanca && !semMudancaNoPadrao;

  const atualizarAgenda = async () => {
    await queryClient.invalidateQueries({ queryKey: ["agenda-dia"] });
  };

  const salvar = useMutation({
    mutationFn: (valores: { inicio: string | null; fim: string | null }) =>
      salvarFn({ data: { dia, ...valores } }),
    onSuccess: async (resultado, valores) => {
      await atualizarAgenda();
      if (valores.inicio === null && valores.fim === null) {
        aviso.ok("Este dia ficará sem intervalo. O padrão semanal foi preservado.");
      } else if (resultado.atendimentosNoIntervalo > 0) {
        aviso.info(
          `Intervalo salvo. ${resultado.atendimentosNoIntervalo} atendimento(s) existente(s) neste período continuam marcados.`,
        );
      } else {
        aviso.ok("Intervalo atualizado somente para este dia.");
      }
      onAberto(false);
    },
    onError: (erro) =>
      aviso.erro(erro instanceof Error ? erro.message : "Não foi possível salvar o intervalo."),
  });

  const restaurar = useMutation({
    mutationFn: () => restaurarFn({ data: { dia } }),
    onSuccess: async () => {
      await atualizarAgenda();
      aviso.ok("Intervalo padrão da semana restaurado para este dia.");
      onAberto(false);
    },
    onError: (erro) =>
      aviso.erro(erro instanceof Error ? erro.message : "Não foi possível restaurar o intervalo."),
  });

  return (
    <Sheet open={aberto} onOpenChange={onAberto}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[90dvh] w-full max-w-[520px] overflow-y-auto rounded-t-xl border-line bg-ink2 px-5 pb-[calc(16px+env(safe-area-inset-bottom))] pt-5"
      >
        <SheetHeader className="pr-10 text-left">
          <SheetTitle className="flex items-center gap-2 text-base text-paper">
            <Clock3 aria-hidden className="size-5" />
            Intervalo do dia
          </SheetTitle>
          <SheetDescription className="text-sm text-mute">
            {dataEditorial(dia)}. O ajuste vale só nesta data; os demais dias da semana permanecem iguais.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium text-mute">
            Início
            <input
              type="time"
              value={inicio}
              onChange={(event) => setInicio(event.target.value)}
              className="field-control mt-1 min-h-12 w-full"
              aria-label="Início do intervalo deste dia"
            />
          </label>
          <label className="block text-sm font-medium text-mute">
            Fim
            <input
              type="time"
              value={fim}
              onChange={(event) => setFim(event.target.value)}
              className="field-control mt-1 min-h-12 w-full"
              aria-label="Fim do intervalo deste dia"
            />
          </label>
        </div>

        {incompleto ? (
          <p className="mt-2 text-sm text-brick" role="alert">
            Informe início e fim do intervalo, ou deixe os dois vazios.
          </p>
        ) : null}
        {invalido ? (
          <p className="mt-2 text-sm text-brick" role="alert">
            O fim precisa ser depois do início.
          </p>
        ) : null}

        <Button
          type="button"
          size="lg"
          className="mt-4 w-full"
          disabled={!podeSalvar || salvar.isPending || restaurar.isPending}
          loading={salvar.isPending && inicioNovo !== null && fimNovo !== null}
          onClick={() => salvar.mutate({ inicio: inicioNovo, fim: fimNovo })}
        >
          Aplicar neste dia
        </Button>

        {intervalo?.inicio && intervalo.fim ? (
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="mt-2 w-full"
            disabled={salvar.isPending || restaurar.isPending || semMudancaNoPadrao}
            onClick={() => salvar.mutate({ inicio: null, fim: null })}
          >
            Sem intervalo neste dia
          </Button>
        ) : null}

        {intervalo?.excecao ? (
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="mt-2 w-full"
            disabled={salvar.isPending || restaurar.isPending}
            loading={restaurar.isPending}
            onClick={() => restaurar.mutate()}
          >
            <RotateCcw aria-hidden />
            Restaurar padrão semanal
          </Button>
        ) : null}

        <p className="mt-3 text-xs leading-5 text-mute">
          Atendimentos já marcados não são cancelados automaticamente. O Cortaí preserva as reservas existentes e aplica o intervalo aos novos agendamentos.
        </p>
      </SheetContent>
    </Sheet>
  );
}
