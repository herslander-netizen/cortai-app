import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { aviso } from "@/lib/avisos";
import {
  getParaMelhorar,
  marcarParaMelhorar,
  type ParaMelhorar as DadosParaMelhorar,
} from "@/lib/aprendizado.functions";
import { ROTULO_DO_MOTIVO } from "@/lib/whatsapp/aprendizado";

const CHAVE = ["atendimento-para-melhorar"];

const DICA_DO_MOTIVO: Record<string, string> = {
  nao_entendida: "Cadastre como serviço ou pergunta frequente.",
  fora_da_etapa: "O cliente respondeu algo que o fluxo não esperava.",
  correcao: "O cliente disse que a resposta não era o que pediu.",
  erro: "Algo falhou ao responder; vale conferir a conexão e a agenda.",
  abandono: "O cliente parou no meio do agendamento.",
  atendente: "O cliente pediu para falar com alguém da equipe.",
};

function quando(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * "Para melhorar" (dono, 06/11/2026): conversas que saíram do fluxo, deram erro ou foram corrigidas pelo cliente,
 * agrupadas por frase parecida. A equipe marca como resolvido (já ajustou) ou ignorado.
 */
export function ParaMelhorar() {
  const qc = useQueryClient();
  const dados = useQuery({
    queryKey: CHAVE,
    queryFn: () => getParaMelhorar() as Promise<DadosParaMelhorar>,
  });
  const marcar = useMutation({
    mutationFn: (v: { chave: string; status: "resolvida" | "ignorada" }) =>
      marcarParaMelhorar({ data: v }),
    onSuccess: (r, v) => {
      if (!r.ok) {
        aviso.erro();
        return;
      }
      aviso.ok(v.status === "resolvida" ? "Marcado como resolvido." : "Ignorado.");
      void qc.invalidateQueries({ queryKey: CHAVE });
    },
    onError: () => aviso.erro("Você não tem permissão para isso ou a conexão falhou."),
  });

  if (dados.isError)
    return (
      <section className="mt-5" aria-label="Para melhorar">
        <h2 className="text-sm text-paper">Para melhorar</h2>
        <p className="mt-2 rounded-[12px] bg-[var(--figaro-surface-container,var(--ink2))] px-4 py-3 text-xs text-brick">
          Não conseguimos carregar agora.{" "}
          <button type="button" className="underline" onClick={() => void dados.refetch()}>
            Tentar de novo
          </button>
        </p>
      </section>
    );
  if (!dados.data || dados.data.grupos.length === 0) return null;

  return (
    <section className="mt-5" aria-label="Para melhorar">
      <h2 className="text-sm text-paper">Para melhorar</h2>
      <p className="mt-1 text-xs text-mute2">
        Conversas que saíram do fluxo nos últimos 30 dias. Os dados pessoais já vêm escondidos.
      </p>
      <ul className="mt-2 space-y-2">
        {dados.data.grupos.map((g) => (
          <li
            key={g.chave}
            className="rounded-[12px] bg-[var(--figaro-surface-container,var(--ink2))] px-4 py-3"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 break-words text-xs text-paper">
                “{g.exemplo || "(sem texto)"}”
              </p>
              <span className="shrink-0 text-xs text-mute">{g.total}x</span>
            </div>
            <p className="mt-1 text-xs text-mute">
              {ROTULO_DO_MOTIVO[g.motivo]} · {quando(g.ultimaVez)}
            </p>
            <p className="mt-1 text-xs text-mute2">{DICA_DO_MOTIVO[g.motivo]}</p>
            <div className="mt-2 flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={marcar.isPending}
                onClick={() => marcar.mutate({ chave: g.chave, status: "resolvida" })}
              >
                Resolvido
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={marcar.isPending}
                onClick={() => marcar.mutate({ chave: g.chave, status: "ignorada" })}
              >
                Ignorar
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
