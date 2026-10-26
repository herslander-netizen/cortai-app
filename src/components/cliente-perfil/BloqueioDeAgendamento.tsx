import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { Aviso } from "@/components/ui/aviso";
import { Button } from "@/components/ui/button";
import {
  definirBloqueioAgendamentoCliente,
  getBloqueioAgendamentoCliente,
} from "@/lib/bloqueio-cliente.functions";
import { aviso } from "@/lib/avisos";

export function BloqueioDeAgendamento({ clienteId }: { clienteId: string }) {
  const queryClient = useQueryClient();
  const definirBloqueio = useServerFn(definirBloqueioAgendamentoCliente);
  const [alterando, setAlterando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const bloqueio = useQuery({
    queryKey: ["bloqueio-agendamento-cliente", clienteId],
    queryFn: () => getBloqueioAgendamentoCliente({ data: { clienteId } }),
    retry: false,
  });

  async function alternar() {
    if (!bloqueio.data?.disponivel) return;
    const bloquear = !bloqueio.data.bloqueado;
    setAlterando(true);
    try {
      await definirBloqueio({
        data: {
          clienteId,
          bloqueado: bloquear,
          motivo: bloquear ? motivo.trim() || null : null,
        },
      });
      setMotivo("");
      await queryClient.invalidateQueries({ queryKey: ["bloqueio-agendamento-cliente", clienteId] });
      aviso.ok(
        bloquear
          ? "Novos agendamentos bloqueados para este cliente."
          : "Novos agendamentos liberados.",
      );
    } catch (e) {
      aviso.erro(e instanceof Error ? e.message : "Não foi possível mudar o bloqueio.");
    } finally {
      setAlterando(false);
    }
  }

  return (
    <section className="mt-8 border-t border-line pt-6">
      <h2 className="text-sm font-semibold text-paper">Novos agendamentos</h2>
      {bloqueio.isLoading ? (
        <p className="mt-2 text-xs text-mute">Consultando a situação de agendamento…</p>
      ) : bloqueio.isError ? (
        <Aviso tom="atencao" className="mt-3">
          Não foi possível consultar o bloqueio de novos agendamentos. Tente novamente.
        </Aviso>
      ) : !bloqueio.data?.disponivel ? (
        <Aviso tom="info" className="mt-3">
          O bloqueio específico ficará disponível depois que a migração aditiva do banco for aplicada.
          Arquivar o cliente continua sendo uma ação separada e não bloqueia novos agendamentos por si só.
        </Aviso>
      ) : (
        <>
          <p className="mt-2 text-xs text-mute">
            {bloqueio.data.bloqueado
              ? "Este cliente está impedido de criar novos agendamentos. Os atendimentos existentes permanecem no histórico."
              : "O cliente pode agendar normalmente. Bloquear novos agendamentos não arquiva o cadastro nem altera horários já marcados."}
          </p>
          {bloqueio.data.bloqueado && bloqueio.data.motivo ? (
            <p className="mt-3 surface px-4 py-3 text-sm text-mute">
              Motivo interno: {bloqueio.data.motivo}
            </p>
          ) : null}
          {!bloqueio.data.bloqueado ? (
            <label className="mt-3 flex flex-col gap-1.5 text-xs text-mute">
              Motivo interno (opcional)
              <input
                className="field-control"
                value={motivo}
                maxLength={300}
                placeholder="Ex.: confirmar com a recepção antes de aceitar"
                onChange={(e) => setMotivo(e.target.value)}
                disabled={alterando}
              />
            </label>
          ) : null}
          <Button
            variant="outline"
            type="button"
            disabled={alterando}
            className="mt-3 min-h-12 w-full"
            onClick={() => void alternar()}
          >
            {alterando
              ? "Salvando…"
              : bloqueio.data.bloqueado
                ? "Desbloquear novos agendamentos"
                : "Bloquear novos agendamentos"}
          </Button>
        </>
      )}
    </section>
  );
}
