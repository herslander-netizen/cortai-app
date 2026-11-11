/**
 * Ícones dos capítulos da entrada com o efeito do vídeo de referência do dono (06/11/2026): o ícone ativo acende na cor
 * da marca com brilho, e a barrinha embaixo dele enche durante o capítulo (progresso até o próximo). Os outros ficam
 * apagados, com a barrinha vazia. Só transform/opacity; com "reduzir movimento" a barra fica cheia e parada.
 */
import { motion, useReducedMotion } from "framer-motion";

import { Button } from "@/components/ui/button";
import type { Capitulo } from "@/components/entrada/historias/capitulos";

export function IconesDosCapitulos({
  capitulos,
  ativo,
  duracaoMs,
  reinicio,
  onEscolher,
}: {
  capitulos: readonly Capitulo[];
  ativo: number;
  /** Tempo até o próximo capítulo (inclui a pausa depois de um toque). */
  duracaoMs: number;
  /** Muda quando a barra precisa recomeçar (troca de capítulo ou toque). */
  reinicio: string;
  onEscolher: (indice: number) => void;
}) {
  const reduzir = useReducedMotion();
  return (
    <nav
      aria-label="Selecionar recurso"
      className="mx-auto flex w-full max-w-[320px] shrink-0 items-center justify-between pb-3 pt-6 [@media(max-height:720px)]:pb-1 [@media(max-height:720px)]:pt-3"
    >
      {capitulos.map((item, indice) => {
        const Icone = item.icone;
        const aceso = indice === ativo;
        return (
          <div key={item.id} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={"Mostrar recurso: " + item.rotulo}
              aria-pressed={aceso}
              title={item.rotulo}
              onClick={() => onEscolher(indice)}
              className="toque-afunda group relative min-h-12 min-w-12 rounded-2xl hover:bg-transparent active:bg-transparent motion-reduce:transform-none [&_svg]:size-6"
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              <motion.span
                aria-hidden="true"
                className="pointer-events-none absolute inset-1 rounded-2xl border border-[var(--figaro-primary)]/15 bg-gradient-to-br from-[var(--figaro-primary-container)] to-[var(--figaro-tertiary-container)] shadow-[0_4px_12px_color-mix(in_oklab,var(--figaro-primary)_12%,transparent)]"
                initial={false}
                animate={{ opacity: aceso ? 1 : 0, scale: reduzir || aceso ? 1 : 0.85 }}
                transition={{ duration: reduzir ? 0 : 0.28 }}
              />
              {/* Brilho: o mesmo ícone desfocado atrás, que só acende (opacidade). */}
              <motion.span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 grid place-items-center text-[var(--figaro-tertiary)] blur-[6px]"
                initial={false}
                animate={{ opacity: aceso ? 0.75 : 0 }}
                transition={{ duration: reduzir ? 0 : 0.28 }}
              >
                <Icone size={26} strokeWidth={2.4} />
              </motion.span>
              <motion.span
                className={`relative grid place-items-center ${
                  aceso
                    ? "text-[var(--figaro-on-primary-container)]"
                    : "text-[var(--figaro-on-surface-variant)]"
                }`}
                initial={false}
                animate={{ scale: reduzir ? 1 : aceso ? 1.08 : 1, y: reduzir ? 0 : aceso ? -1 : 0 }}
                transition={{ duration: reduzir ? 0 : 0.2 }}
              >
                <Icone size={24} strokeWidth={aceso ? 2.1 : 1.7} />
              </motion.span>
            </Button>
            <span
              aria-hidden="true"
              className="relative h-[3px] w-6 overflow-hidden rounded-full bg-[var(--figaro-outline-variant)]/50"
            >
              {aceso ? (
                <span
                  key={reinicio}
                  className="absolute inset-0 origin-left rounded-full bg-[var(--figaro-tertiary)]"
                  style={{
                    animation: reduzir
                      ? undefined
                      : `entrada-encher ${Math.round(duracaoMs)}ms linear forwards`,
                  }}
                />
              ) : null}
            </span>
          </div>
        );
      })}
    </nav>
  );
}
