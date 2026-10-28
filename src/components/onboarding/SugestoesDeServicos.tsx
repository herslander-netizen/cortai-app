import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  LISTA_DE_SEGMENTOS,
  SEGMENTOS_CONFIG,
  segmentoParaApresentacao,
  type Segmento,
} from "@/lib/segmentos";
import type { ServicoEditavel } from "./servicos.types";

export function SugestoesDeServicos({
  servicos,
  onChange,
  segmento,
}: {
  servicos: ServicoEditavel[];
  onChange: (servicos: ServicoEditavel[]) => void;
  segmento: Segmento;
}) {
  const [mostrarTodas, setMostrarTodas] = useState(false);
  const definicao = SEGMENTOS_CONFIG[segmentoParaApresentacao(segmento)];
  const naoAdicionados = definicao.servicosSugeridos.filter(
    (s) => !servicos.some((a) => a.nome.toLowerCase() === s.nome.toLowerCase()),
  );

  return (
    <>
      {naoAdicionados.length ? (
        <>
          <p className="text-xs text-mute">
            Sugestões rápidas — deslize para ver mais e toque para adicionar.
          </p>
          <div
            className="-mx-4 mt-2 flex max-w-full snap-x snap-mandatory flex-nowrap gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
            role="group"
            aria-label="Sugestões rápidas de serviços"
          >
            {naoAdicionados.map((servico) => (
              <Button
                key={servico.nome}
                type="button"
                variant="outline"
                className="min-h-12 shrink-0 snap-start rounded-full px-4 text-sm"
                onClick={() => onChange([...servicos, { ...servico }])}
              >
                <Plus size={13} className="text-gold" aria-hidden /> {servico.nome}
              </Button>
            ))}
          </div>
        </>
      ) : null}

      <Button
        variant="link"
        type="button"
        className="mt-1 min-h-12 px-0 text-xs text-mute"
        aria-expanded={mostrarTodas}
        onClick={() => setMostrarTodas((valor) => !valor)}
      >
        {mostrarTodas ? "Ocultar outras sugestões" : "Ver sugestões de outros segmentos"}
      </Button>
      {mostrarTodas ? (
        <div className="mt-3 space-y-4 border-t border-line pt-4">
          {LISTA_DE_SEGMENTOS.filter(
            (item) => item.id !== definicao.id && item.servicosSugeridos.length,
          ).map((item) => (
            <section key={item.id}>
              <p className="text-xs font-semibold text-paper">{item.rotulo}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {item.servicosSugeridos.map((servico) => (
                  <Button
                    key={`${item.id}-${servico.nome}`}
                    variant="outline"
                    type="button"
                    className="min-h-12 rounded-full px-3 text-xs"
                    onClick={() => onChange([...servicos, { ...servico }])}
                  >
                    <Plus size={13} aria-hidden /> {servico.nome}
                  </Button>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}
    </>
  );
}
