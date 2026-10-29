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
    <div className="banner-cookies pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-[calc(12px+env(safe-area-inset-bottom))] md:right-auto md:left-4 md:w-[min(400px,calc(100vw-32px))] md:justify-start md:px-0">
      <div
        role="dialog"
        aria-label="Privacidade e cookies"
        className="pointer-events-auto max-h-[70dvh] w-full max-w-[440px] overflow-y-auto rounded-3xl border border-line bg-card px-5 py-4 text-center text-card-foreground shadow-[var(--elevacao-8)] md:max-w-[400px]"
      >
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          Usamos cookies para o Flow funcionar e, se você permitir, melhorar sua experiência.{" "}
          <Link
            to="/privacidade"
            className="font-medium text-foreground underline underline-offset-2"
          >
            Política de Privacidade
          </Link>
        </p>

        {configurando ? (
          <ul className="mt-3 space-y-3 border-t border-line pt-3 text-left">
            {DESCRICAO_DAS_CATEGORIAS.map((categoria) => (
              <li key={categoria.chave}>
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                    checked={categoria.fixa ? true : escolhas[categoria.chave]}
                    disabled={categoria.fixa}
                    onChange={(e) =>
                      setEscolhas((atual) => ({ ...atual, [categoria.chave]: e.target.checked }))
                    }
                  />
                  <span>
                    <span className="block text-xs font-semibold text-foreground">
                      {categoria.titulo}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                      {categoria.detalhe}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        ) : null}

        <Button
          type="button"
          variant="outline"
          onClick={() => registrar(configurando ? escolhas : TODAS_ACEITAS)}
          className="mt-3 min-h-12 w-full rounded-xl text-sm font-semibold"
        >
          {configurando ? "Salvar escolhas" : "Aceitar todos"}
        </Button>
        <div className="mt-1 flex items-center justify-between gap-2">
          {configurando ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfigurando(false)}
              className="h-auto min-h-12 px-2 text-sm font-medium text-foreground"
            >
              Voltar
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfigurando(true)}
              className="h-auto min-h-12 px-2 text-sm font-medium text-foreground"
            >
              Gerenciar preferências
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            onClick={() => registrar(SOMENTE_NECESSARIAS)}
            className="h-auto min-h-12 px-2 text-sm font-medium text-foreground"
          >
            Rejeitar todos
          </Button>
        </div>
      </div>
    </div>
  );
}
