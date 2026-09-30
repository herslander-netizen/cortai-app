import type { ReactNode } from "react";
import { Check } from "lucide-react";

import { PLANOS_COMERCIAIS, precoComercial, type PlanoComercial } from "@/lib/planos-comerciais";

/**
 * Tabela única dos quatro planos, usada na apresentação pública e no painel.
 * `precos` permite mostrar o valor vindo do banco; `acao` desenha o botão.
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
  return (
    <ol className="planos-tabela" aria-label="Planos do Cortaí">
      {PLANOS_COMERCIAIS.map((plano) => {
        const preco = precos?.[plano.chave] ?? plano.precoCentavos;
        const ehAtual = atual === plano.chave;
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
              <small>R$</small> {precoComercial(preco)} <span>por profissional/mês</span>
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
  );
}
