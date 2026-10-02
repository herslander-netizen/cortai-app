import { useState } from "react";
import { Link } from "@tanstack/react-router";

import {
  DESCRICAO_DAS_CATEGORIAS,
  SOMENTE_NECESSARIAS,
  TODAS_ACEITAS,
  useConsentimento,
  type Categorias,
} from "@/lib/consentimento";
import { useModoFoco } from "@/lib/modo-foco";
import { Button } from "@/components/ui/button";

/**
 * Aviso discreto de cookies e privacidade, mostrado apenas no primeiro acesso.
 * Todas as opções ficam com o mesmo peso visual: nada de escolhas escondidas.
 */
export function BannerDeCookies() {
  const foco = useModoFoco();
  const { pronto, consentimento, registrar } = useConsentimento();
  const [configurando, setConfigurando] = useState(false);
  const [escolhas, setEscolhas] = useState<Categorias>(SOMENTE_NECESSARIAS);

  if (!pronto || consentimento || foco) return null;

  return (
    <div className="banner-cookies pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-[calc(12px+env(safe-area-inset-bottom))] md:right-auto md:left-4 md:w-[min(420px,calc(100vw-32px))] md:justify-start md:px-0">
      <div
        role="dialog"
        aria-label="Privacidade e cookies"
        className="pointer-events-auto max-h-[80vh] w-full max-w-[480px] overflow-y-auto rounded-2xl border border-line bg-ink3 p-4 shadow-xl md:max-w-[420px]"
      >
        <p className="text-sm font-bold text-paper">Sua privacidade importa.</p>
        <p className="mt-1 text-xs leading-relaxed text-mute">
          Usamos cookies para o Cortaí funcionar e, se você permitir, para melhorar sua experiência.
          Veja a{" "}
          <Link to="/privacidade" className="text-gold underline underline-offset-2">
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
                    <span className="block text-xs font-semibold text-paper">
                      {categoria.titulo}
                    </span>
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
            <Button
              type="button"
              variant="outline"
              onClick={() => registrar(escolhas)}
              className="min-h-12 min-w-[112px] flex-1 whitespace-normal px-3 text-xs md:min-h-10"
            >
              Salvar escolhas
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => registrar(TODAS_ACEITAS)}
              className="min-h-12 min-w-[112px] flex-1 whitespace-normal px-3 text-xs md:min-h-10"
            >
              Aceitar
            </Button>
          )}
          {configurando ? null : (
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfigurando(true)}
              className="min-h-12 min-w-[112px] flex-1 whitespace-normal px-3 text-xs md:min-h-10"
            >
              Configurar
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => registrar(SOMENTE_NECESSARIAS)}
            className="min-h-12 min-w-[112px] flex-1 whitespace-normal px-3 text-xs md:min-h-10"
          >
            Recusar opcionais
          </Button>
        </div>
      </div>
    </div>
  );
}
