import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { Switch } from "@/components/ui/switch";
import { aviso } from "@/lib/avisos";
import { getListaEsperaAutomatica, salvarListaEsperaAutomatica } from "@/lib/onboarding.functions";

const CHAVE = ["lista-espera-automatica"];

/** Liga/desliga a oferta automática de vagas à lista de espera. Ninguém sai da lista. */
export function InterruptorListaDeEspera() {
  const salvar = useServerFn(salvarListaEsperaAutomatica);
  const ler = useServerFn(getListaEsperaAutomatica);
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: CHAVE, queryFn: () => ler() });
  const [salvando, setSalvando] = useState(false);
  const ativa = data?.ativa ?? true;

  async function alternar(valor: boolean) {
    setSalvando(true);
    try {
      await salvar({ data: { ativa: valor } });
      queryClient.setQueryData(CHAVE, { ativa: valor });
      aviso.ok(valor ? "Ofertas automáticas ligadas." : "Ofertas automáticas desligadas.");
    } catch (e) {
      aviso.erro(e instanceof Error ? e.message : "Não consegui salvar agora.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="mb-4 mt-6">
      <div className="flex min-h-12 items-center justify-between gap-4">
        <label htmlFor="lista-espera-automatica" className="field-label">
          Oferecer vagas automaticamente à lista de espera
        </label>
        <Switch
          id="lista-espera-automatica"
          checked={ativa}
          disabled={!data || salvando}
          onCheckedChange={alternar}
          aria-describedby="lista-espera-automatica-dica"
        />
      </div>
      {/* Dica alinhada ao rótulo (o recuo de 16 px do `field-hint` é para campos de texto). */}
      <p id="lista-espera-automatica-dica" className="field-hint !pl-1">
        Quando um horário é cancelado, a vaga é oferecida ao próximo da lista. Desligado, ninguém é
        removido da lista.
      </p>
    </div>
  );
}
