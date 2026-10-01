import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { Switch } from "@/components/ui/switch";
import { aviso } from "@/lib/avisos";
import { getFilaDeChegadaConfig, salvarFilaDeChegada } from "@/lib/onboarding.functions";

/** "Atendo clientes sem horário marcado": salva na hora, independente dos horários. */
export function InterruptorFilaDeChegada() {
  const salvar = useServerFn(salvarFilaDeChegada);
  const ler = useServerFn(getFilaDeChegadaConfig);
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["fila-de-chegada-config"], queryFn: () => ler() });
  const [salvando, setSalvando] = useState(false);
  const [aviso_, setAviso] = useState<string | null>(null);
  const ativa = data?.ativa ?? true;

  async function alternar(valor: boolean) {
    setSalvando(true);
    setAviso(null);
    try {
      const r = await salvar({ data: { ativa: valor } });
      queryClient.setQueryData(["fila-de-chegada-config"], { ativa: valor, naFila: r.naFila });
      void queryClient.invalidateQueries({ queryKey: ["agenda-fila"] });
      aviso.ok(valor ? "Fila de chegada ligada." : "Fila de chegada desligada.");
      if (!valor && r.naFila > 0) {
        setAviso(
          `Há ${r.naFila} ${r.naFila === 1 ? "pessoa" : "pessoas"} na fila de chegada. Elas continuam na fila até serem atendidas.`,
        );
      }
    } catch (e) {
      aviso.erro(e instanceof Error ? e.message : "Não consegui salvar agora.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="mt-6">
      <div className="flex min-h-12 items-center justify-between gap-4">
        <label htmlFor="fila-de-chegada" className="field-label">
          Atendo clientes sem horário marcado
        </label>
        <Switch
          id="fila-de-chegada"
          checked={ativa}
          disabled={!data || salvando}
          onCheckedChange={alternar}
          aria-describedby="fila-de-chegada-dica"
        />
      </div>
      <p id="fila-de-chegada-dica" className="field-hint">
        Mostra a fila de chegada na agenda e o link da fila para os clientes.
      </p>
      {aviso_ ? (
        <p className="field-hint mt-2" role="status">
          {aviso_}
        </p>
      ) : null}
    </div>
  );
}
