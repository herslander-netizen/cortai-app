import { useState, type ReactNode } from "react";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  PLANOS_COMERCIAIS,
  precoAnualComercial,
  precoComercial,
  type PlanoComercial,
} from "@/lib/planos-comerciais";

/**
 * Tabela única dos planos à venda, usada na apresentação pública e no painel.
 * Preço fixo por plano; seletor mensal/anual (20% de desconto no anual).
 * `precos` permite mostrar o valor mensal vindo do banco; `acao` desenha o botão.
 */
export function TabelaDePlanos({
  atual,
  precos,
  acao,
}: {
  atual?: string;
  precos?: Record<string, number>;
  acao?: (plano: PlanoComercial) => ReactNode;
}) {
  const [anual, setAnual] = useState(false);
  return (
    <div>
      <div className="planos-ciclo" role="group" aria-label="Forma de cobrança">
        <Button type="button" variant="ghost" aria-pressed={!anual} onClick={() => setAnual(false)}>
          Mensal
        </Button>
        <Button type="button" variant="ghost" aria-pressed={anual} onClick={() => setAnual(true)}>
          Anual (−20%)
        </Button>
      </div>
      <ol className="planos-tabela" aria-label="Planos do Flow">
        {PLANOS_COMERCIAIS.map((plano) => {
          const mensal = precos?.[plano.chave] ?? plano.precoCentavos;
          const ehAtual = atual === plano.chave;
          const gratis = mensal <= 0;
          return (
            <li
              key={plano.chave}
              className="planos-item"
              data-destaque={plano.destaque ? "true" : undefined}
              aria-current={ehAtual ? "true" : undefined}
            >
              <div className="planos-topo">
                <h3>{plano.nome}</h3>
                {ehAtual ? (
                  <span className="planos-selo">Seu plano</span>
                ) : plano.destaque ? (
                  <span className="planos-selo">{plano.destaque}</span>
                ) : null}
              </div>
              <p className="planos-preco">
                {gratis ? (
                  <>Grátis</>
                ) : anual ? (
                  <>
                    <small>R$</small> {precoComercial(precoAnualComercial(mensal))}{" "}
                    <span>por ano</span>
                  </>
                ) : (
                  <>
                    <small>R$</small> {precoComercial(mensal)} <span>por mês</span>
                  </>
                )}
              </p>
              <p className="planos-herda">
                {plano.profissionais === 1
                  ? "1 profissional"
                  : `Até ${plano.profissionais} profissionais`}{" "}
                ·{" "}
                {plano.agendamentosMes
                  ? `${plano.agendamentosMes} agendamentos/mês`
                  : "agendamentos ilimitados"}
              </p>
              {plano.herda ? <p className="planos-herda">{plano.herda}, mais:</p> : null}
              <ul>
                {plano.itens.map((item) => (
                  <li key={item}>
                    <Check aria-hidden size={14} /> {item}
                  </li>
                ))}
              </ul>
              {acao ? <div className="planos-acao">{acao(plano)}</div> : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
