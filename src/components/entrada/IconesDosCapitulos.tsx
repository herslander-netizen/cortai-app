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
      className="mx-auto flex w-full max-w-[320px] shrink-0 items-center justify-between pb-3 pt-3 [@media(max-height:720px)]:pb-1 [@media(max-height:720px)]:pt-1.5"
    >
      {capitulos.map((item, indice) => {
        const Icone = item.icone;
        const aceso = indice === ativo;
        return (
          <div key={item.id} className="flex flex-col items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={"Mostrar recurso: " + item.rotulo}
              aria-pressed={aceso}
              onClick={() => onEscolher(indice)}
              className="toque-afunda relative"
            >
              {/* Brilho: o mesmo ícone desfocado atrás, que só acende (opacidade). */}
              <motion.span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 grid place-items-center text-[var(--figaro-tertiary)] blur-[6px]"
                initial={false}
                animate={{ opacity: aceso ? 0.75 : 0 }}
                transition={{ duration: 0.28 }}
              >
                <Icone size={26} strokeWidth={2.4} />
              </motion.span>
              <motion.span
                className={`relative grid place-items-center ${
                  aceso
                    ? "text-[var(--figaro-tertiary)]"
                    : "text-[var(--figaro-on-surface-variant)]"
                }`}
                initial={false}
                animate={{ scale: aceso ? 1.12 : 1 }}
                transition={{ duration: 0.2 }}
              >
                <Icone size={24} strokeWidth={aceso ? 2.1 : 1.7} />
              </motion.span>
            </Button>
            <span
              aria-hidden="true"
              className="relative h-[3px] w-[18px] overflow-hidden rounded-full bg-[var(--figaro-outline-variant)]/70"
            >
              {aceso ? (
                <motion.span
                  key={reinicio}
                  className="absolute inset-0 origin-left rounded-full bg-[linear-gradient(90deg,var(--entrada-ciano),var(--entrada-lilas),var(--entrada-rosa))]"
                  initial={{ scaleX: reduzir ? 1 : 0 }}
                  animate={{ scaleX: 1 }}
                  transition={
                    reduzir ? { duration: 0 } : { duration: duracaoMs / 1000, ease: "linear" }
                  }
                />
              ) : null}
            </span>
          </div>
        );
      })}
    </nav>
  );
}
