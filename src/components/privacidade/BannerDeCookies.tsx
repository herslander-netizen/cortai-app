import { useState } from "react";
import { Link } from "@tanstack/react-router";

import {
  DESCRICAO_DAS_CATEGORIAS,
  SOMENTE_NECESSARIAS,
  TODAS_ACEITAS,
  useConsentimento,
  type Categorias,
} from "@/lib/consentimento";

/**
 * Aviso discreto de cookies e privacidade, mostrado apenas no primeiro acesso.
 * Todas as opções ficam com o mesmo peso visual: nada de escolhas escondidas.
 */
export function BannerDeCookies() {
  const { pronto, consentimento, registrar } = useConsentimento();
  const [configurando, setConfigurando] = useState(false);
  const [escolhas, setEscolhas] = useState<Categorias>(SOMENTE_NECESSARIAS);

  if (!pronto || consentimento) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
      <div
        role="dialog"
        aria-label="Privacidade e cookies"
        className="pointer-events-auto max-h-[80vh] w-full max-w-[480px] overflow-y-auto rounded-2xl border border-line bg-ink3 p-4 shadow-xl"
      >
        <p className="text-sm font-bold text-paper">Sua privacidade importa.</p>
        <p className="mt-1 text-xs leading-relaxed text-mute">
          Usamos cookies e tecnologias semelhantes para manter o Cortaí funcionando, melhorar sua
          experiência e, quando permitido, entender como o sistema é utilizado. Saiba mais na{" "}
          <Link to="/privacidade" className="text-gold underline">
            Política de Privacidade
          </Link>
          .
        </p>

        {configurando ? (
          <ul className="mt-4 space-y-3 border-t border-line pt-4">
            {DESCRICAO_DAS_CATEGORIAS.map((categoria) => (
              <li key={categoria.chave}>
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 shrink-0 accent-gold"
                    checked={categoria.fixa ? true : escolhas[categoria.chave]}
                    disabled={categoria.fixa}
                    onChange={(e) =>
                      setEscolhas((atual) => ({ ...atual, [categoria.chave]: e.target.checked }))
                    }
                  />
                  <span>
                    <span className="block text-xs font-semibold text-paper">{categoria.titulo}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-mute">
                      {categoria.detalhe}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          {configurando ? (
            <button
              type="button"
              onClick={() => registrar(escolhas)}
              className="h-10 flex-1 rounded-lg bg-gold px-4 text-xs font-bold text-ink"
            >
              Salvar escolhas
            </button>
          ) : (
            <button
              type="button"
              onClick={() => registrar(TODAS_ACEITAS)}
              className="h-10 flex-1 rounded-lg bg-gold px-4 text-xs font-bold text-ink"
            >
              Aceitar
            </button>
          )}
          {configurando ? null : (
            <button
              type="button"
              onClick={() => setConfigurando(true)}
              className="h-10 flex-1 rounded-lg border border-line px-4 text-xs font-semibold text-paper"
            >
              Configurar
            </button>
          )}
          <button
            type="button"
            onClick={() => registrar(SOMENTE_NECESSARIAS)}
            className="h-10 flex-1 rounded-lg border border-line px-4 text-xs font-semibold text-paper"
          >
            Recusar opcionais
          </button>
        </div>
      </div>
    </div>
  );
}
