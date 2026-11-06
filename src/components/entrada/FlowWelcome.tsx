import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { MarcaFlow } from "@/components/marca/MarcaFlow";
import { CAPITULOS } from "@/components/entrada/historias/capitulos";
import { Celular } from "@/components/entrada/historias/Celular";
import { OndasDaEntrada } from "@/components/entrada/OndasDaEntrada";
import { MOLA } from "@/lib/movimento-figaro";

const RESUME_AFTER_INTERACTION_MS = 8000;

export type FlowWelcomeProps = {
  onCreateAccount?: () => void;
  onSignIn?: () => void;
  onCustomerBooking?: () => void;
};

export function FlowWelcome({ onCreateAccount, onSignIn, onCustomerBooking }: FlowWelcomeProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [pausedUntil, setPausedUntil] = useState(0);
  const reduceMotion = useReducedMotion();

  const interact = useCallback((nextIndex: number) => {
    setActiveIndex((nextIndex + CAPITULOS.length) % CAPITULOS.length);
    setPausedUntil(Date.now() + RESUME_AFTER_INTERACTION_MS);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;

    const pauseRemaining = Math.max(0, pausedUntil - Date.now());
    // Cada capítulo dura o tempo da sua mini-história (passos + respiro).
    const timer = window.setTimeout(() => {
      setActiveIndex((index) => (index + 1) % CAPITULOS.length);
    }, pauseRemaining + CAPITULOS[activeIndex]!.duracao);

    return () => window.clearTimeout(timer);
  }, [activeIndex, pausedUntil, reduceMotion]);

  const capitulo = CAPITULOS[activeIndex]!;

  return (
    <div className="relative mx-auto flex h-full min-h-0 w-full max-w-[430px] flex-col overflow-hidden bg-ink px-5 pb-[calc(24px+env(safe-area-inset-bottom))] pt-[calc(40px+env(safe-area-inset-top))] text-paper [@media(max-height:720px)]:pb-[calc(12px+env(safe-area-inset-bottom))] [@media(max-height:720px)]:pt-[calc(18px+env(safe-area-inset-top))]">
      <OndasDaEntrada />

      <header className="relative z-10 flex shrink-0 flex-col items-center">
        <MarcaFlow
          variante="escura"
          className="h-auto w-[min(42vw,160px)] [@media(max-height:720px)]:w-[min(30vw,112px)]"
          prioridade
        />
        <p className="mt-1.5 text-center text-[14px] font-medium tracking-[0.01em] text-mute [@media(max-height:720px)]:mt-0.5 [@media(max-height:720px)]:text-[12px]">
          Seu negócio no ritmo certo.
        </p>
      </header>

      <section
        aria-label="Conheça os recursos do Flow"
        className="relative z-10 flex min-h-0 flex-1 flex-col pt-4 [@media(max-height:720px)]:pt-2"
      >
        {/* Celular parado; só a tela muda. Arrastar para os lados troca de capítulo. */}
        <motion.div
          className="relative min-h-0 flex-1"
          drag={reduceMotion ? false : "x"}
          dragDirectionLock
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.12}
          onDragStart={() => {
            setPausedUntil(Date.now() + RESUME_AFTER_INTERACTION_MS);
          }}
          onDragEnd={(_, info) => {
            if (info.offset.x < -45 || info.velocity.x < -350) {
              interact(activeIndex + 1);
            } else if (info.offset.x > 45 || info.velocity.x > 350) {
              interact(activeIndex - 1);
            }
          }}
          style={{ touchAction: "pan-y" }}
        >
          <Celular>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeIndex}
                className="h-full w-full"
                initial={{ opacity: 0, x: reduceMotion ? 0 : 18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: reduceMotion ? 0 : -18 }}
                transition={MOLA.padraoEspacial}
              >
                {capitulo.historia()}
              </motion.div>
            </AnimatePresence>
          </Celular>
        </motion.div>

        {/* Linha fina nas cores da marca onde o celular "pousa". */}
        <div
          aria-hidden="true"
          className="relative mx-auto h-px w-[86%] shrink-0 bg-[linear-gradient(90deg,transparent,var(--entrada-ciano)_25%,var(--entrada-lilas)_50%,var(--entrada-rosa)_75%,transparent)] opacity-70"
        />

        <div className="flex min-h-[96px] shrink-0 flex-col items-center justify-center px-2 pt-4 pb-2 text-center [@media(max-height:720px)]:min-h-[76px] [@media(max-height:720px)]:pt-2.5 [@media(max-height:720px)]:pb-1">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeIndex + "-caption"}
              initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduceMotion ? 0 : -6 }}
              transition={MOLA.padraoEspacial}
            >
              <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.3em] text-[var(--figaro-tertiary)] [@media(max-height:720px)]:mb-1">
                {capitulo.rotulo}
              </p>
              <h1 className="whitespace-pre-line text-[clamp(17px,4.9vw,20px)] font-medium leading-snug tracking-[-0.01em] text-paper [@media(max-height:720px)]:text-[15px]">
                {capitulo.frase}
              </h1>
            </motion.div>
          </AnimatePresence>
        </div>

        <nav
          aria-label="Selecionar recurso"
          className="mx-auto flex w-full max-w-[340px] shrink-0 items-center justify-between pb-3 [@media(max-height:720px)]:pb-1"
        >
          {CAPITULOS.map((item, index) => {
            const Icon = item.icone;
            const active = index === activeIndex;

            return (
              <div key={item.id} className="flex flex-col items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={"Mostrar recurso: " + item.rotulo}
                  aria-pressed={active}
                  onClick={() => interact(index)}
                  className={`rounded-[14px] ${
                    active
                      ? "bg-[var(--figaro-tertiary)]/15 text-[var(--figaro-tertiary)] hover:bg-[var(--figaro-tertiary)]/20"
                      : "text-paper/80"
                  }`}
                >
                  <Icon size={24} strokeWidth={active ? 2.2 : 1.8} />
                </Button>
                <motion.span
                  aria-hidden="true"
                  className="h-[3px] rounded-full"
                  animate={{
                    width: active ? 22 : 14,
                    backgroundColor: active
                      ? "var(--figaro-tertiary)"
                      : "var(--figaro-outline-variant)",
                  }}
                  transition={{ duration: 0.2 }}
                />
              </div>
            );
          })}
        </nav>
      </section>

      <footer className="relative z-10 flex shrink-0 flex-col items-center gap-2.5 [@media(max-height:720px)]:gap-0">
        <Button
          type="button"
          variant="primary"
          size="lg"
          aria-label="Começar agora: criar conta no Flow"
          onClick={onCreateAccount}
          disabled={!onCreateAccount}
          className="h-14 w-full rounded-full font-bold"
        >
          Começar agora
        </Button>

        <p className="text-center text-[13px] text-mute">
          Já possui conta?{" "}
          <Button
            type="button"
            variant="link"
            aria-label="Entrar na sua conta"
            onClick={onSignIn}
            disabled={!onSignIn}
            className="h-auto min-h-12 px-1 font-bold text-[var(--figaro-primary)]"
          >
            Faça login
          </Button>
        </p>

        <Button
          type="button"
          variant="link"
          aria-label="Sou cliente e quero só agendar"
          onClick={onCustomerBooking}
          disabled={!onCustomerBooking}
          className="mt-1 h-auto min-h-12 text-center text-[12px] font-medium text-mute [@media(max-height:720px)]:mt-0"
        >
          Sou cliente e quero só agendar
        </Button>
      </footer>
    </div>
  );
}

export default FlowWelcome;
