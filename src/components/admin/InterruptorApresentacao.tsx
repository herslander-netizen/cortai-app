import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

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
import { Switch } from "@/components/ui/switch";
import { aviso } from "@/lib/avisos";
import { definirApresentacaoAtiva, getEstadoApresentacao } from "@/lib/home.functions";

const CHAVE = ["admin-apresentacao-ativa"];

/** Liga/desliga a página de apresentação pública (cortai.dev). */
export function InterruptorApresentacao() {
  const qc = useQueryClient();
  const ler = useServerFn(getEstadoApresentacao);
  const salvar = useServerFn(definirApresentacaoAtiva);
  const [confirmar, setConfirmar] = useState(false);
  const { data } = useQuery({ queryKey: CHAVE, queryFn: () => ler(), staleTime: 0 });
  const mutacao = useMutation({
    mutationFn: (ativa: boolean) => salvar({ data: { ativa } }),
    onMutate: async (ativa) => {
      await qc.cancelQueries({ queryKey: CHAVE });
      const anterior = qc.getQueryData(CHAVE);
      qc.setQueryData(CHAVE, (atual: typeof data) => ({
        alteradaEm: atual?.alteradaEm ?? null,
        ativa,
      }));
      return { anterior };
    },
    onError: (_e, _v, ctx) => {
      qc.setQueryData(CHAVE, ctx?.anterior);
      aviso.erro("Não foi possível alterar a página de apresentação. Tente de novo.");
    },
    onSuccess: (r) => {
      qc.setQueryData(CHAVE, r);
      aviso.ok(r.ativa ? "Página de apresentação ativada." : "Página de apresentação desativada.");
    },
  });
  const ativa = data?.ativa ?? true;

  return (
    <div className="rounded-[28px] bg-[var(--figaro-surface-container,var(--ink2))] px-5 py-4">
      <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4">
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-paper">Página de apresentação</span>
          <span className="mt-0.5 block text-xs text-mute">
            {ativa
              ? "Visitantes veem a apresentação em cortai.dev."
              : "Visitantes vão direto para a tela de entrada."}
          </span>
        </span>
        <span className="flex size-12 shrink-0 items-center justify-center">
          <Switch
            checked={ativa}
            disabled={!data || mutacao.isPending}
            aria-label={
              ativa ? "Página de apresentação ativa" : "Página de apresentação desativada"
            }
            onCheckedChange={(v) => (v ? mutacao.mutate(true) : setConfirmar(true))}
          />
        </span>
      </label>
      {data?.alteradaEm ? (
        <p className="mt-1 text-xs text-mute2">
          Alterado em{" "}
          {new Date(data.alteradaEm).toLocaleString("pt-BR", {
            dateStyle: "short",
            timeStyle: "short",
            timeZone: "America/Sao_Paulo",
          })}
        </p>
      ) : null}
      <AlertDialog open={confirmar} onOpenChange={setConfirmar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar a página de apresentação?</AlertDialogTitle>
            <AlertDialogDescription>
              Quem acessar cortai.dev será levado para a tela de entrada. Você pode reativar a
              qualquer momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={() => mutacao.mutate(false)}>Desativar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
